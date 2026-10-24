// Utilidades sin dependencias: DOM, texto con formato ligero, fechas y huellas.

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/**
 * Crea un elemento. `atributos` admite: clase, texto, html (solo para contenido ya escapado),
 * dataset (objeto), on (objeto de eventos) y cualquier atributo HTML.
 */
export function el(etiqueta, atributos = {}, hijos = []) {
  const nodo = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === "clase") nodo.className = valor;
    else if (clave === "texto") nodo.textContent = valor;
    else if (clave === "html") nodo.innerHTML = valor;
    else if (clave === "dataset") Object.assign(nodo.dataset, valor);
    else if (clave === "on") for (const [evento, fn] of Object.entries(valor)) nodo.addEventListener(evento, fn);
    else if (valor === true) nodo.setAttribute(clave, "");
    else nodo.setAttribute(clave, valor);
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return nodo;
}

const SVG = "http://www.w3.org/2000/svg";
/** Icono del sprite de index.html. */
export function icono(nombre, clase = "icono") {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", clase);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG, "use");
  use.setAttribute("href", `#i-${nombre}`);
  svg.append(use);
  return svg;
}

export function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Markdown en línea mínimo y seguro: **negrita**, *cursiva* y [texto](https://…). */
export function md(texto) {
  return escapar(texto)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/** Texto plano (sin marcas de formato), para el PDF y los atributos. */
export function plano(texto) {
  return String(texto ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

/** Sustituye {campo} con los valores dados (los que no existan quedan igual). */
export function rellenar(texto, valores) {
  return String(texto ?? "").replace(/\{(\w+)\}/g, (todo, clave) => (valores[clave] ?? todo));
}

export const capitalizar = t => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "2026-10-30" → Date local (sin desfase por zona horaria). */
export function fechaIso(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export const fechaLarga = f => `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
export const fechaCarta = f => `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
export const horaCorta = f => f.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

/** Iniciales para el avatar (sin grado académico). */
export function iniciales(nombre) {
  const partes = String(nombre || "").replace(/^(Mg|Dr|Dra|Lic|Ing)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || "") + (partes.length > 2 ? partes[2][0] : partes[1]?.[0] || "")).toUpperCase() || "?";
}

/** Huella corta y estable de un texto (cyrb53), para detectar cambios en los ítems. */
export function huella(texto, semilla = 0) {
  let h1 = 0xdeadbeef ^ semilla, h2 = 0x41c6ce57 ^ semilla;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36).toUpperCase();
}

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Nombre de archivo seguro: sin tildes ni símbolos. */
export function nombreArchivo(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export const almacen = {
  leer(clave) {
    try { return JSON.parse(localStorage.getItem(clave) || "null"); } catch { return null; }
  },
  escribir(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); return true; } catch { return false; }
  },
  borrar(clave) {
    try { localStorage.removeItem(clave); } catch { /* sin almacenamiento */ }
  },
};
