#!/usr/bin/env python3
"""Comprueba que un proyecto de validación esté completo y sea coherente antes de publicarlo.

Uso: python3 herramientas/validar_proyecto.py [proyectos/<id>/proyecto.json ...]
Sin argumentos revisa todos los proyectos de proyectos/ y el índice proyectos/index.json.
Sale con código 1 si encuentra errores (así lo usa el flujo de GitHub Actions).
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
CLAVE = re.compile(r"^[a-z0-9][a-z0-9_-]*$")


def revisar(ruta):
    errores, avisos = [], []
    try:
        p = json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        return [f"no se pudo leer: {e}"], []
    carpeta = ruta.parent

    if p.get("id") != carpeta.name:
        errores.append(f'"id" ({p.get("id")}) debe coincidir con el nombre de la carpeta ({carpeta.name})')
    if not p.get("investigacion", {}).get("titulo"):
        errores.append("falta investigacion.titulo")
    if p.get("estado", "abierto") not in ("abierto", "cerrado"):
        errores.append('"estado" debe ser "abierto" o "cerrado"')
    if p.get("fecha_limite") and not re.match(r"^\d{4}-\d{2}-\d{2}$", p["fecha_limite"]):
        errores.append('"fecha_limite" debe tener el formato AAAA-MM-DD')
    acento = p.get("tema", {}).get("acento")
    if acento and not HEX.match(acento):
        errores.append('tema.acento debe ser un color #RRGGBB')
    logo = p.get("institucion", {}).get("logo")
    if logo and not (carpeta / logo).is_file():
        errores.append(f"no existe el logo {logo}")

    ev = p.get("evaluacion", {})
    escala = ev.get("escala", [{"valor": 1}, {"valor": 0}])
    if len(escala) < 2 or len({e.get("valor") for e in escala}) != len(escala):
        errores.append("evaluacion.escala necesita al menos dos valores distintos")
    claves = [c.get("clave") for c in ev.get("criterios", [{"clave": "p"}, {"clave": "r"}, {"clave": "c"}])]
    if len(set(claves)) != len(claves) or not all(claves):
        errores.append("cada criterio necesita una clave única")
    patron = ev.get("documento_identidad", {}).get("patron")
    if patron:
        try:
            re.compile(patron)
        except re.error:
            errores.append("documento_identidad.patron no es una expresión regular válida")

    numeros, dims = [], []
    for v in p.get("variables", []):
        for d in v.get("dimensiones", []):
            dims.append(d.get("numero"))
            items = [i["numero"] for i in d.get("items", [])]
            if not items:
                errores.append(f'la dimensión "{d.get("nombre")}" no tiene ítems')
            numeros += items
            for ind in d.get("indicadores", []):
                fuera = set(ind.get("items", [])) - set(items)
                if fuera:
                    errores.append(f'el indicador "{ind.get("nombre")}" cita ítems de otra dimensión: {sorted(fuera)}')
            for i in d.get("items", []):
                if not i.get("texto", "").strip():
                    errores.append(f"el ítem {i['numero']} no tiene texto")
    if not numeros:
        errores.append("no hay ítems")
    repetidos = sorted({n for n in numeros if numeros.count(n) > 1})
    if repetidos:
        errores.append(f"ítems repetidos: {repetidos}")
    if len(set(dims)) != len(dims):
        errores.append("hay dimensiones con el mismo número")

    vistos = set()
    for e in p.get("expertos", []):
        c = e.get("clave", "")
        if not CLAVE.match(c):
            errores.append(f'clave de experto inválida: "{c}" (minúsculas, números, - o _)')
        if c in vistos:
            errores.append(f'clave de experto repetida: "{c}"')
        vistos.add(c)
        for campo in ("nombre", "grado"):
            if not e.get(campo):
                errores.append(f'al experto "{c}" le falta "{campo}"')
        for doc in p.get("documentos", []):
            archivo = doc.get("archivo", "").replace("{clave}", c)
            if archivo and not (carpeta / archivo).is_file():
                errores.append(f"no existe {archivo}")
    for doc in p.get("documentos", []):
        general = doc.get("archivo_general")
        if general and not (carpeta / general).is_file():
            errores.append(f"no existe {general}")
    if not p.get("expertos"):
        avisos.append("no hay expertos: solo funcionará el enlace general")
    if not p.get("contacto", {}).get("whatsapp") and not p.get("contacto", {}).get("correo"):
        avisos.append("sin contacto: el experto no tendrá a quién enviar el certificado")
    return errores, avisos


def main():
    rutas = [Path(a) for a in sys.argv[1:]] or sorted((RAIZ / "proyectos").glob("*/proyecto.json"))
    total = 0
    if not sys.argv[1:]:
        indice = RAIZ / "proyectos" / "index.json"
        try:
            datos = json.loads(indice.read_text(encoding="utf-8"))
            ids = {r.parent.name for r in rutas}
            pred = datos.get("predeterminado")
            if pred and pred not in ids:
                print(f"✗ proyectos/index.json: el predeterminado «{pred}» no existe")
                total += 1
        except (OSError, json.JSONDecodeError) as e:
            print(f"✗ proyectos/index.json: {e}")
            total += 1
    for ruta in rutas:
        errores, avisos = revisar(ruta.resolve())
        nombre = ruta.resolve().relative_to(RAIZ) if ruta.resolve().is_relative_to(RAIZ) else ruta
        print(f"{'✗' if errores else '✓'} {nombre}")
        for e in errores:
            print(f"    error: {e}")
        for a in avisos:
            print(f"    aviso: {a}")
        total += len(errores)
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
