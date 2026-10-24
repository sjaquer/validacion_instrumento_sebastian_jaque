#!/usr/bin/env python3
"""Consolida los certificados firmados por los expertos y calcula la V de Aiken.

Cada PDF generado por la página guarda sus respuestas en los metadatos (campo Subject, en JSON),
así que no hace falta transcribirlas. El documento de identidad del experto no está en los metadatos.

Uso:
  python3 herramientas/consolidar_respuestas.py carpeta_con_pdfs/ [--salida carpeta/]

Produce en la carpeta de salida (por defecto, la misma de los PDF):
  respuestas.csv   una fila por experto e ítem, con el valor de cada criterio y la sugerencia
  aiken.csv        V de Aiken por ítem y criterio, y la V del ítem (promedio de sus criterios)
  resumen.md       tabla lista para revisar: V por ítem, suficiencia, aplicabilidad y sugerencias

V de Aiken (Aiken, 1985): V = S / [n (c − 1)], donde S es la suma de (valor − mínimo de la escala),
n el número de jueces y c el número de valores de la escala. Con la escala Sí (1) / No (0),
V es la proporción de jueces que marcaron «Sí».
"""
import argparse
import csv
import json
import re
import subprocess
import sys
from pathlib import Path


def leer_subject(pdf):
    """Lee el campo Subject del diccionario Info (jsPDF no lo comprime)."""
    datos = pdf.read_bytes()
    m = re.search(rb"/Subject \((.*?)(?<!\\)\)\s*\n?/", datos, re.S) or re.search(rb"/Subject \((.*?)(?<!\\)\)", datos, re.S)
    if m:
        crudo = m.group(1)
        crudo = re.sub(rb"\\([()\\])", rb"\1", crudo)
        return crudo.decode("latin-1")
    try:  # Respaldo: pdfinfo (poppler).
        salida = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
        for linea in salida.splitlines():
            if linea.startswith("Subject:"):
                return linea.split(":", 1)[1].strip()
    except (OSError, subprocess.CalledProcessError):
        pass
    return None


def cargar(carpeta):
    registros = []
    for pdf in sorted(Path(carpeta).glob("*.pdf")):
        subject = leer_subject(pdf)
        try:
            r = json.loads(subject) if subject else None
        except json.JSONDecodeError:
            r = None
        if not r or not str(r.get("formato", "")).startswith("validacion-expertos/"):
            print(f"  (omitido) {pdf.name}: no tiene respuestas en los metadatos; transcríbalo a mano.", file=sys.stderr)
            continue
        r["archivo"] = pdf.name
        registros.append(r)
    return registros


def aiken(valores, minimo, maximo):
    validos = [v for v in valores if v is not None]
    if not validos or maximo == minimo:
        return None
    return sum(v - minimo for v in validos) / (len(validos) * (maximo - minimo))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("carpeta", help="carpeta con los certificados firmados (PDF)")
    ap.add_argument("--salida", help="carpeta donde escribir los resultados")
    ap.add_argument("--umbral", type=float, default=0.80, help="V mínima aceptable (por defecto 0.80)")
    args = ap.parse_args()

    registros = cargar(args.carpeta)
    if not registros:
        sys.exit("No se encontraron certificados con respuestas en los metadatos.")
    proyectos = {r["proyecto"] for r in registros}
    if len(proyectos) > 1:
        sys.exit(f"Los PDF son de proyectos distintos: {sorted(proyectos)}")
    salida = Path(args.salida or args.carpeta)
    salida.mkdir(parents=True, exist_ok=True)

    escala = registros[0]["escala"]
    criterios = registros[0]["criterios"]
    jueces = [f'{r["juez"]["grado"]} {r["juez"]["nombre"]}' for r in registros]
    items = sorted({it["n"] for r in registros for it in r["items"]})

    with open(salida / "respuestas.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["juez", "item", *criterios, "sugerencia"])
        for r, juez in zip(registros, jueces):
            for it in r["items"]:
                w.writerow([juez, it["n"], *[it.get(c) for c in criterios], it.get("s", "")])

    filas = []
    for n in items:
        por_criterio = {}
        for c in criterios:
            valores = [next((it.get(c) for it in r["items"] if it["n"] == n), None) for r in registros]
            por_criterio[c] = aiken(valores, escala["min"], escala["max"])
        presentes = [v for v in por_criterio.values() if v is not None]
        filas.append({"item": n, **por_criterio, "v_item": sum(presentes) / len(presentes) if presentes else None})
    with open(salida / "aiken.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["item", *criterios, "v_item"])
        w.writeheader()
        for fila in filas:
            w.writerow({k: (f"{v:.3f}" if isinstance(v, float) else v) for k, v in fila.items()})

    fmt = lambda v: "—" if v is None else f"{v:.2f}"
    v_total = [f["v_item"] for f in filas if f["v_item"] is not None]
    lineas = [
        f"# Validación por juicio de expertos — {registros[0]['proyecto']}",
        "",
        f"Jueces ({len(registros)}): " + "; ".join(f"{j} ({r['archivo']}, código {r.get('codigo', '—')})" for j, r in zip(jueces, registros)),
        "",
        f"Escala: {escala['min']} a {escala['max']}. V de Aiken = S / [n (c − 1)]. Umbral: {args.umbral:.2f}.",
        "",
        "| Ítem | " + " | ".join(c.upper() for c in criterios) + " | V del ítem | Decisión |",
        "| :--: | " + " | ".join(":--:" for _ in criterios) + " | :--: | :-- |",
    ]
    for f in filas:
        decision = "—" if f["v_item"] is None else ("Válido" if f["v_item"] >= args.umbral else "Revisar")
        lineas.append(f"| {f['item']} | " + " | ".join(fmt(f[c]) for c in criterios) + f" | {fmt(f['v_item'])} | {decision} |")
    if v_total:
        lineas += ["", f"**V de Aiken del instrumento:** {sum(v_total) / len(v_total):.3f}"]

    lineas += ["", "## Suficiencia y aplicabilidad", ""]
    for r, juez in zip(registros, jueces):
        suf = "; ".join(f"D{s['d']}: {'sí' if s['v'] == escala['max'] else 'no'}{' (' + s['obs'] + ')' if s.get('obs') else ''}" for s in r.get("suficiencia", []))
        lineas.append(f"- **{juez}:** {r.get('aplicabilidad') or '—'}. Suficiencia: {suf or '—'}.")
        if r.get("observaciones"):
            lineas.append(f"  - Observaciones: {r['observaciones']}")

    sugerencias = [(juez, it["n"], it["s"]) for r, juez in zip(registros, jueces) for it in r["items"] if it.get("s")]
    if sugerencias:
        lineas += ["", "## Sugerencias por ítem", ""]
        for juez, n, s in sorted(sugerencias, key=lambda x: x[1]):
            lineas.append(f"- Ítem {n} — {juez}: {s}")
    (salida / "resumen.md").write_text("\n".join(lineas) + "\n", encoding="utf-8")

    print(f"{len(registros)} certificados consolidados → {salida}/respuestas.csv, aiken.csv, resumen.md")
    if v_total:
        print(f"V de Aiken del instrumento: {sum(v_total) / len(v_total):.3f}")


if __name__ == "__main__":
    main()
