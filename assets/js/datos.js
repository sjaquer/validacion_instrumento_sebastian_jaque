// Carga del proyecto (proyectos/<id>/proyecto.json), valores por defecto y comprobaciones.

import { huella } from "./util.js";

export class ErrorProyecto extends Error {
  constructor(titulo, detalle) { super(titulo); this.detalle = detalle; }
}

const POR_DEFECTO = {
  estado: "abierto",
  tema: { acento: "#8c1d40" },
  evaluacion: {
    minutos: 15,
    criterios: [
      { clave: "p", nombre: "Pertinencia", definicion: "el ítem corresponde al concepto teórico formulado." },
      { clave: "r", nombre: "Relevancia", definicion: "el ítem es apropiado para representar al componente o dimensión específica del constructo." },
      { clave: "c", nombre: "Claridad", definicion: "se entiende sin dificultad alguna el enunciado del ítem; es conciso, exacto y directo." },
    ],
    escala: [{ valor: 1, etiqueta: "Sí" }, { valor: 0, etiqueta: "No" }],
    suficiencia: { activa: true, definicion: "se dice que hay suficiencia cuando los ítems planteados son suficientes para medir la dimensión." },
    aplicabilidad: ["Aplicable", "Aplicable después de corregir", "No aplicable"],
    grados: [{ valor: "Mg.", etiqueta: "Magíster (Mg.)" }, { valor: "Dr.", etiqueta: "Doctor (Dr.)" }],
    documento_identidad: { nombre: "DNI", patron: "^[0-9A-Za-z]{8,12}$" },
  },
  certificado: {
    titulo: "CERTIFICADO DE VALIDEZ DE CONTENIDO DEL INSTRUMENTO",
    nota: "",
    etiqueta_observaciones: "Observaciones (precisar si hay suficiencia):",
    etiqueta_juez: "Apellidos y nombres del juez validador (Dr./Mg.):",
    etiqueta_firma: "Firma del experto informante",
  },
  documentos: [],
  expertos: [],
};

async function leerJson(url) {
  let respuesta;
  try {
    respuesta = await fetch(url, { cache: "no-cache" });
  } catch {
    throw new ErrorProyecto("No se pudo conectar", "Revise su conexión a internet y vuelva a cargar la página.");
  }
  if (!respuesta.ok) return null;
  try { return await respuesta.json(); } catch {
    throw new ErrorProyecto("El archivo del proyecto tiene un error", `No se pudo leer ${url}: el JSON no es válido.`);
  }
}

/** Resuelve qué proyecto abrir: ?p=<id>, o el predeterminado de proyectos/index.json. */
export async function resolverProyecto(parametros) {
  const pedido = (parametros.get("p") || "").trim();
  const indice = (await leerJson("proyectos/index.json")) || { proyectos: [] };
  const id = pedido || indice.predeterminado || indice.proyectos?.[0]?.id;
  if (!id || !/^[a-z0-9][a-z0-9_-]*$/i.test(id)) {
    throw new ErrorProyecto("No se indicó el proyecto", "El enlace no corresponde a ninguna validación activa. Use el enlace personal que recibió.");
  }
  return id;
}

export async function cargarProyecto(id) {
  const base = `proyectos/${id}/`;
  const crudo = await leerJson(`${base}proyecto.json`);
  if (!crudo) {
    throw new ErrorProyecto("Validación no encontrada", "El enlace no corresponde a ninguna validación activa. Revise que esté completo o solicite uno nuevo al investigador.");
  }
  return normalizar(crudo, base);
}

function normalizar(crudo, base) {
  const p = {
    ...POR_DEFECTO,
    ...crudo,
    tema: { ...POR_DEFECTO.tema, ...crudo.tema },
    evaluacion: { ...POR_DEFECTO.evaluacion, ...crudo.evaluacion },
    certificado: { ...POR_DEFECTO.certificado, ...crudo.certificado },
    base,
  };
  p.evaluacion.suficiencia = { ...POR_DEFECTO.evaluacion.suficiencia, ...crudo.evaluacion?.suficiencia };
  p.evaluacion.documento_identidad = { ...POR_DEFECTO.evaluacion.documento_identidad, ...crudo.evaluacion?.documento_identidad };

  const errores = [];
  if (!p.investigacion?.titulo) errores.push("falta investigacion.titulo");
  if (!Array.isArray(p.variables) || !p.variables.length) errores.push("falta la lista de variables");
  if (p.evaluacion.escala.length < 2) errores.push("la escala debe tener al menos dos valores");

  // Escala: el valor más alto se marca como «alto» (verde) y el más bajo como «bajo» (rojo).
  const valores = p.evaluacion.escala.map(e => Number(e.valor));
  const [min, max] = [Math.min(...valores), Math.max(...valores)];
  p.evaluacion.escala = p.evaluacion.escala.map(e => ({
    ...e, valor: Number(e.valor), polo: Number(e.valor) === max ? "alto" : Number(e.valor) === min ? "bajo" : "medio",
  }));
  p.evaluacion.rango = { min, max };

  // Índices derivados: dimensiones e ítems en orden, con su variable, dimensión e indicador.
  p.dimensiones = [];
  p.items = [];
  const vistos = new Set();
  for (const v of p.variables || []) {
    for (const d of v.dimensiones || []) {
      d.variable = v;
      p.dimensiones.push(d);
      for (const it of d.items || []) {
        if (vistos.has(it.numero)) errores.push(`el ítem ${it.numero} está repetido`);
        vistos.add(it.numero);
        it.dimension = d;
        it.indicador = (d.indicadores || []).find(i => (i.items || []).includes(it.numero))?.nombre || "";
        it.huella = huella(it.texto);
        p.items.push(it);
      }
      if (!(d.items || []).length) errores.push(`la dimensión «${d.nombre}» no tiene ítems`);
    }
  }
  if (errores.length) throw new ErrorProyecto("El proyecto está incompleto", errores.join("; ") + ".");
  return p;
}

export function buscarExperto(proyecto, clave) {
  if (!clave) return null;
  return proyecto.expertos.find(e => e.clave === clave) || null;
}
