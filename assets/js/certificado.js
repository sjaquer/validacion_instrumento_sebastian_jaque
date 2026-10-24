// Certificado de validez de contenido en PDF (jsPDF + AutoTable), generado en el navegador.
// Reproduce el formato del certificado del expediente y guarda las respuestas en los metadatos
// del PDF (campo «Subject», en JSON) para consolidarlas después sin transcribir
// (herramientas/consolidar_respuestas.py). El documento de identidad no se guarda en los metadatos.

import { MESES, huella, plano } from "./util.js";

const SUPERINDICES = ["¹", "²", "³"];
const marcaNota = i => SUPERINDICES[i] || `(${i + 1})`;

/** Las fuentes estándar del PDF solo cubren Latin-1: se normalizan comillas tipográficas, guiones, emojis… */
export function textoPdf(texto) {
  return String(texto ?? "")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•●]/g, "-")
    .replace(/→/g, "->")
    .replace(/[   ]/g, " ")
    .normalize("NFC")
    .replace(/[^\n\r\t\x20-\x7E -ÿ]/g, "");
}

/** JSON solo con caracteres ASCII (los demás como \uXXXX), apto para los metadatos del PDF. */
const ascii = t => t.replace(/[\u007f-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"));

async function comoDatos(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(blob); });
  } catch { return null; }
}

function cargarImagen(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}

/** jsPDF no conserva bien la transparencia: la firma se aplana sobre blanco. */
async function firmaPlana(dataUrl) {
  const img = await cargarImagen(dataUrl);
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0);
  return { datos: c.toDataURL("image/jpeg", 0.92), ancho: img.width, alto: img.height };
}

export function registro(proyecto, experto, estado, fecha) {
  const d = estado.datos;
  const { criterios, rango } = proyecto.evaluacion;
  const r = {
    formato: "validacion-expertos/1",
    proyecto: proyecto.id,
    experto: experto ? experto.clave : null,
    juez: { grado: d.juez.grado, nombre: d.juez.nombre.trim(), especialidad: d.juez.especialidad.trim() },
    fecha: fecha.toISOString(),
    escala: { min: rango.min, max: rango.max },
    criterios: criterios.map(c => c.clave),
    items: proyecto.items.map(it => {
      const fila = { n: it.numero };
      for (const c of criterios) fila[c.clave] = estado.respuesta(it, c.clave);
      if (d.sugerencias[it.numero]) fila.s = d.sugerencias[it.numero].trim();
      return fila;
    }),
    suficiencia: proyecto.evaluacion.suficiencia.activa
      ? proyecto.dimensiones.map(dim => ({ d: dim.numero, v: d.suficiencia[dim.numero]?.v ?? null, obs: (d.suficiencia[dim.numero]?.obs || "").trim() }))
      : [],
    aplicabilidad: d.aplicabilidad,
    observaciones: d.observaciones.trim(),
  };
  r.codigo = huella(JSON.stringify(r)).slice(0, 10).replace(/(.{5})/, "$1-");
  return r;
}

export async function generarCertificado(proyecto, experto, estado) {
  if (!window.jspdf?.jsPDF) throw new Error("No se pudo cargar el generador de PDF. Revise su conexión y recargue la página (sus respuestas se conservan).");
  const { jsPDF } = window.jspdf;
  const d = estado.datos;
  const ev = proyecto.evaluacion;
  const cert = proyecto.certificado;
  const hoy = new Date();
  const reg = registro(proyecto, experto, estado, hoy);

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const margen = 20;
  const util = ancho - 2 * margen;
  const interlinea = 4.7;
  const T = textoPdf;
  let y = margen;

  // Encabezado: logo y título.
  const logo = proyecto.institucion?.logo ? await comoDatos(proyecto.base + proyecto.institucion.logo) : null;
  if (logo) {
    try {
      const img = await cargarImagen(logo);
      const h = 13, w = (h * img.width) / img.height;
      doc.addImage(logo, logo.startsWith("data:image/png") ? "PNG" : "JPEG", margen, y - 7, w, h);
    } catch { /* sin logo */ }
  }
  doc.setFont("times", "bold"); doc.setFontSize(12);
  const lineasTitulo = doc.splitTextToSize(T(cert.titulo), util - 40);
  doc.text(lineasTitulo, ancho / 2, y + 1, { align: "center" });
  y += 8 + lineasTitulo.length * 5;

  doc.setFontSize(10.5);
  doc.setFont("times", "bold"); doc.text("Título:", margen, y);
  const sangriaTitulo = doc.getTextWidth("Título: ");
  doc.setFont("times", "normal");
  const titulo = doc.splitTextToSize(T(plano(proyecto.investigacion.titulo)), util - sangriaTitulo);
  doc.text(titulo, margen + sangriaTitulo, y);
  y += titulo.length * interlinea + 3;

  // Tabla de ítems.
  const etiqueta = valor => {
    if (valor === null || valor === undefined) return "";
    const e = ev.escala.find(x => x.valor === valor);
    return e ? T(e.etiqueta) : String(valor);
  };
  const etiquetasCortas = ev.escala.every(e => e.etiqueta.length <= 3);
  const leyendaEscala = etiquetasCortas ? ev.escala.map(e => e.etiqueta).join(" / ") : `${ev.rango.min} a ${ev.rango.max}`;
  const n = ev.criterios.length;
  const anchoCriterio = Math.min(20, 66 / n);
  const columnas = 3 + n;

  const filas = [];
  for (const v of proyecto.variables) {
    filas.push([{ content: T(`VARIABLE ${v.numero}: ${v.nombre.toUpperCase()}`), colSpan: columnas, styles: { fontStyle: "bold", fillColor: [236, 236, 236] } }]);
    for (const dim of v.dimensiones) {
      filas.push([{ content: T(`Dimensión ${dim.numero}: ${dim.nombre}`), colSpan: columnas, styles: { fontStyle: "bold" } }]);
      for (const it of dim.items) {
        filas.push([it.numero, T(it.texto), ...ev.criterios.map(c => etiqueta(estado.respuesta(it, c.clave))), T(d.sugerencias[it.numero] || "")]);
      }
    }
  }
  const estilosColumnas = { 0: { halign: "center", cellWidth: 9 }, 1: { cellWidth: 68 } };
  ev.criterios.forEach((c, i) => { estilosColumnas[2 + i] = { halign: "center", cellWidth: anchoCriterio }; });
  estilosColumnas[2 + n] = { cellWidth: "auto", fontSize: 8 };

  doc.autoTable({
    startY: y,
    margin: { left: margen, right: margen, top: margen, bottom: margen + 4 },
    head: [["N.°", "Dimensiones / ítems", ...ev.criterios.map((c, i) => T(`${c.nombre}${marcaNota(i)}\n(${leyendaEscala})`)), "Sugerencias"]],
    body: filas,
    theme: "grid",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: { font: "times", fontSize: 8.6, cellPadding: 1.5, lineColor: [110, 110, 110], lineWidth: 0.15, textColor: [0, 0, 0], valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", fontSize: 8.2 },
    columnStyles: estilosColumnas,
  });
  y = doc.lastAutoTable.finalY + 7;

  const espacio = h => { if (y + h > alto - margen - 6) { doc.addPage(); y = margen; } };
  const parrafo = (rotulo, texto) => {
    doc.setFontSize(10.5);
    doc.setFont("times", "bold");
    const sangria = doc.getTextWidth(T(rotulo)) + 1.8;
    doc.setFont("times", "normal");
    const primera = doc.splitTextToSize(T(texto) || " ", util - sangria);
    const resto = primera.length > 1 ? doc.splitTextToSize(primera.slice(1).join(" "), util) : [];
    espacio((1 + resto.length) * interlinea + 2);
    doc.setFont("times", "bold"); doc.text(T(rotulo), margen, y);
    doc.setFont("times", "normal"); doc.text(primera[0], margen + sangria, y);
    if (resto.length) doc.text(resto, margen, y + interlinea);
    y += (1 + resto.length) * interlinea + 2.6;
  };

  const partes = [];
  if (ev.suficiencia.activa) {
    for (const dim of proyecto.dimensiones) {
      const s = d.suficiencia[dim.numero] || {};
      const hay = s.v === ev.rango.max;
      partes.push(`D${dim.numero} ${dim.nombre}: ${hay ? "hay suficiencia" : "no hay suficiencia"}${s.obs?.trim() ? ` (${s.obs.trim()})` : ""}.`);
    }
  }
  if (d.observaciones.trim()) partes.push(d.observaciones.trim());
  parrafo(cert.etiqueta_observaciones, partes.join(" ") || "Ninguna.");
  const casilla = op => `${op} [${d.aplicabilidad === op ? " X " : "    "}]`;
  parrafo("Opinión de aplicabilidad:", ev.aplicabilidad.map(casilla).join("     "));
  parrafo(cert.etiqueta_juez, `${d.juez.grado} ${d.juez.nombre.trim()}`);
  parrafo(`${ev.documento_identidad.nombre}:`, d.juez.documento.trim());
  parrafo("Especialidad del validador:", d.juez.especialidad.trim());
  espacio(8);
  doc.setFont("times", "normal");
  doc.text(T(`${proyecto.institucion?.ciudad || "Lima"}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} del ${hoy.getFullYear()}`), margen, y);
  y += 8;

  // Firma.
  const firma = await firmaPlana(d.firma.imagen);
  let fw = 62, fh = (fw * firma.alto) / firma.ancho;
  if (fh > 30) { fh = 30; fw = (fh * firma.ancho) / firma.alto; }
  espacio(fh + 34);
  doc.addImage(firma.datos, "JPEG", (ancho - fw) / 2, y, fw, fh);
  y += fh + 1.5;
  doc.setLineWidth(0.25); doc.line(ancho / 2 - 42, y, ancho / 2 + 42, y);
  doc.setFont("times", "bold"); doc.setFontSize(10.5);
  doc.text(T(cert.etiqueta_firma), ancho / 2, y + 5, { align: "center" });
  y += 13;

  // Notas de los criterios.
  doc.setFont("times", "normal"); doc.setFontSize(8.6);
  const notas = ev.criterios.map((c, i) => `${marcaNota(i)} ${c.nombre}: ${c.definicion}`);
  if (cert.nota) notas.push(`Nota. ${cert.nota}`);
  for (const nota of notas) {
    const l = doc.splitTextToSize(T(nota), util);
    espacio(l.length * 3.7);
    doc.text(l, margen, y);
    y += l.length * 3.7 + 0.8;
  }

  // Pie de página con el código de verificación.
  const paginas = doc.getNumberOfPages();
  for (let pg = 1; pg <= paginas; pg++) {
    doc.setPage(pg);
    doc.setFont("times", "normal"); doc.setFontSize(7.6); doc.setTextColor(115);
    const sello = `${hoy.toLocaleDateString("es-PE")} ${hoy.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;
    doc.text(T(`Ficha completada en línea el ${sello} · Código de verificación ${reg.codigo} · Página ${pg} de ${paginas}`), ancho / 2, alto - 9, { align: "center" });
    doc.setTextColor(0);
  }

  doc.setProperties({
    title: T(`Certificado de validez de contenido - ${d.juez.nombre.trim()}`),
    author: T(d.juez.nombre.trim()),
    subject: ascii(JSON.stringify(reg)),
    keywords: `validacion-expertos, ${proyecto.id}`,
    creator: "Validación de instrumentos por juicio de expertos",
  });
  return { doc, registro: reg };
}
