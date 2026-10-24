// Construcción de la interfaz como un recorrido guiado de pantallas:
//   Bienvenida → una pantalla por dimensión → Opinión final → Firma.
// Cada pantalla tiene una sola acción principal; la información de apoyo
// (definiciones, carta, PDF) aparece solo donde se necesita.

import { el, icono, md, plano, rellenar, fechaCarta } from "./util.js";

const conHtml = (etiqueta, atributos, texto) => el(etiqueta, { ...atributos, html: md(texto) });
const archivoDocumento = (doc, experto) => (experto ? rellenar(doc.archivo, { clave: experto.clave }) : doc.archivo_general || null);
const rangoItems = d => {
  const ns = d.items.map(i => i.numero);
  return ns.length === 1 ? `Pregunta ${ns[0]}` : `Preguntas ${ns[0]} a ${ns[ns.length - 1]}`;
};

// Explicación breve de cada criterio, mostrada una vez por pantalla.
const AYUDA_CRITERIO = { p: "mide lo que debe medir", r: "es importante para el tema", c: "se entiende sin dificultad" };

/* --------------------------------------------------------- Piezas comunes */
function cabeceraPaso({ paso, nombre, parte, fraccion }) {
  return el("div", { clase: "progreso-paso" }, [
    el("p", { clase: "progreso-paso__texto" }, [el("strong", { texto: `Paso ${paso} de 3` }), ` · ${nombre}${parte ? ` · ${parte}` : ""}`]),
    el("div", { clase: "progreso-paso__pista", "aria-hidden": "true" }, el("span", { style: `width:${Math.round(fraccion * 100)}%` })),
  ]);
}

function navegacion({ textoSiguiente = null, estado = null } = {}) {
  return el("div", { clase: "navegacion" }, [
    el("p", { clase: "navegacion__aviso", role: "alert", hidden: true }),
    el("div", { clase: "navegacion__fila" }, [
      el("button", { type: "button", clase: "boton-volver", dataset: { nav: "anterior" } }, ["← Volver"]),
      estado,
      textoSiguiente ? el("button", { type: "button", clase: "boton boton--grande", dataset: { nav: "siguiente" } }, [el("span", { texto: textoSiguiente }), icono("arrow")]) : null,
    ]),
  ]);
}

/* ------------------------------------------------------------- Bienvenida */
export function pantallaInicio(p, experto, avisos) {
  const inv = p.investigacion;
  const inst = p.institucion || {};
  const doc = (p.documentos || []).map(d => ({ ...d, url: archivoDocumento(d, experto) })).find(d => d.url);
  const saludo = experto ? `${experto.tratamiento || "Estimado(a)"} ${experto.grado} ${experto.nombre}:` : "Estimado(a) docente:";
  const n = p.items.length;

  const boton = el("button", { type: "button", clase: "boton boton--grande", id: "boton-empezar", dataset: { nav: "empezar" } }, [el("span", { texto: "Empezar la revisión" }), icono("arrow")]);

  const nodo = el("section", { clase: "pantalla pantalla--inicio", "aria-labelledby": "titulo-inicio" }, [
    avisos,
    el("p", { clase: "inicio__saludo", texto: saludo }),
    el("h1", { clase: "pantalla__titulo inicio__titulo", id: "titulo-inicio", tabindex: "-1", texto: `Le pido revisar las ${n} preguntas de mi cuestionario de tesis` }),
    el("p", { clase: "inicio__texto", texto: "En cada pregunta solo marca Sí o No en tres aspectos. Al final firma en pantalla y se descarga su certificado." }),
    el("ol", { clase: "inicio__pasos" }, [
      ["Revisar las preguntas", "unos 15 minutos"],
      ["Dar su opinión final", null],
      ["Firmar y descargar el certificado", null],
    ].map(([t, s]) => el("li", {}, [el("strong", { texto: t }), s ? el("span", { texto: ` · ${s}` }) : null]))),
    el("div", { clase: "inicio__accion" }, [
      boton,
      el("p", { clase: "nota-suave", texto: "Su avance se guarda en este dispositivo: puede salir y continuar después." }),
    ]),
    el("div", { clase: "inicio__secundario" }, [
      el("details", { clase: "desplegable" }, [el("summary", {}, [icono("mail"), el("span", { texto: "Leer la carta de presentación" })]), carta(p, experto)]),
      doc ? el("a", { clase: "enlace-secundario", href: p.base + doc.url, target: "_blank", rel: "noopener" }, [icono("download"), el("span", { texto: "Descargar el expediente en PDF" })]) : null,
    ]),
    el("p", { clase: "inicio__tesis" }, [
      el("em", { texto: `«${plano(inv.titulo)}»` }), el("br"),
      `${inv.autor}${inst.siglas ? ` · ${inst.siglas}` : ""}`,
    ]),
  ]);
  return { nodo, boton };
}

function carta(p, experto) {
  const c = p.carta || {};
  const inst = p.institucion || {};
  return el("article", { clase: "carta" }, [
    el("p", { clase: "carta__fecha", texto: `${inst.ciudad || "Lima"}, ${fechaCarta(new Date())}` }),
    el("p", { clase: "carta__destinatario", html: experto ? `<strong>${md(experto.grado)}</strong> ${md(experto.nombre)}<br>Presente.` : "<strong>Mg./Dr.</strong> ______________________<br>Presente." }),
    c.asunto ? el("p", { clase: "carta__asunto", html: `<strong>Asunto:</strong> ${md(c.asunto)}` }) : null,
    ...(c.parrafos || []).map(t => el("p", { html: md(rellenar(t, { area: "su especialidad" })) })),
    c.cierre ? el("p", { html: md(c.cierre) }) : null,
    el("div", { clase: "carta__firma" }, [el("strong", { texto: c.firma || p.investigacion.autor }), el("span", { texto: "Investigador" })]),
  ]);
}

/* ------------------------------------------------- Revisión de preguntas */
function segmento(nombre, escala, valorActual, etiquetaGrupo, alElegir) {
  const nodo = el("div", { clase: "segmento", role: "radiogroup", "aria-label": etiquetaGrupo });
  for (const opcion of escala) {
    const input = el("input", { type: "radio", name: nombre, value: String(opcion.valor), dataset: { polo: opcion.polo } });
    input.checked = valorActual === opcion.valor;
    input.addEventListener("change", () => alElegir(opcion.valor));
    nodo.append(el("label", {}, [input, el("span", { texto: opcion.etiqueta })]));
  }
  return nodo;
}

function tarjetaItem(p, estado, it) {
  const ev = p.evaluacion;
  const etiquetaMin = ev.escala.find(e => e.valor === ev.rango.min)?.etiqueta || String(ev.rango.min);
  const nodo = el("article", { clase: "item", id: `item-${it.numero}`, "aria-labelledby": `texto-item-${it.numero}` });
  const aviso = el("p", { clase: "item__aviso", hidden: true }, [icono("alert"), el("span")]);
  const area = el("textarea", { clase: "control", id: `sugerencia-${it.numero}`, rows: "3", maxlength: "600", placeholder: "¿Cómo mejoraría esta pregunta? (opcional)" });
  area.value = estado.datos.sugerencias[it.numero] || "";
  const caja = el("div", { clase: "item__comentario", hidden: !area.value }, [
    el("label", { clase: "visualmente-oculto", for: area.id, texto: `Comentario sobre la pregunta ${it.numero}` }),
    area,
  ]);
  const alternar = el("button", { type: "button", clase: "boton-enlace item__alternar", "aria-controls": caja.id, "aria-expanded": String(!caja.hidden) }, [icono("edit"), el("span", { texto: area.value ? "Ver mi comentario" : "Agregar un comentario" })]);
  const mostrarCaja = visible => {
    caja.hidden = !visible;
    alternar.setAttribute("aria-expanded", String(visible));
    alternar.querySelector("span").textContent = visible ? "Ocultar comentario" : (area.value.trim() ? "Ver mi comentario" : "Agregar un comentario");
  };
  alternar.addEventListener("click", () => { mostrarCaja(caja.hidden); if (!caja.hidden) area.focus(); });
  area.addEventListener("input", () => { estado.sugerir(it, area.value); refrescar(); });

  let abiertaPorObservacion = false;
  const refrescar = () => {
    const completo = estado.itemCompleto(it);
    const observado = estado.itemObservado(it);
    nodo.classList.toggle("completo", completo && !observado);
    nodo.classList.toggle("observado", observado);
    if (completo) nodo.classList.remove("falta");
    const conMin = ev.criterios.filter(c => estado.respuesta(it, c.clave) === ev.rango.min).map(c => c.nombre.toLowerCase());
    aviso.hidden = !conMin.length || !!area.value.trim();
    if (conMin.length) {
      aviso.lastChild.textContent = `Marcó «${etiquetaMin}» en ${conMin.join(" y ")}. Si puede, indique cómo mejorarla.`;
      if (!abiertaPorObservacion && caja.hidden) { mostrarCaja(true); abiertaPorObservacion = true; }
    }
  };

  const criterios = el("div", { clase: "item__criterios", style: `--n-criterios:${ev.criterios.length}` }, ev.criterios.map(c => el("fieldset", { clase: "criterio" }, [
    el("legend", {}, [el("span", { clase: "criterio__nombre", texto: c.nombre })]),
    segmento(`item-${it.numero}-${c.clave}`, ev.escala, estado.respuesta(it, c.clave), `${c.nombre} de la pregunta ${it.numero}`, valor => { estado.responder(it, c.clave, valor); refrescar(); }),
  ])));

  nodo.append(
    el("div", { clase: "item__cabecera" }, [
      el("span", { clase: "item__num", "aria-hidden": "true", texto: String(it.numero) }),
      el("div", {}, [
        el("p", { clase: "item__texto", id: `texto-item-${it.numero}` }, [el("span", { clase: "visualmente-oculto", texto: `Pregunta ${it.numero}: ` }), it.texto]),
        it.indicador ? el("span", { clase: "item__indicador", texto: `Indicador: ${it.indicador}` }) : null,
      ]),
    ]),
    criterios,
    aviso,
    alternar,
    caja,
  );
  caja.id = `comentario-${it.numero}`;
  alternar.setAttribute("aria-controls", caja.id);
  refrescar();
  return nodo;
}

function bloqueSuficiencia(p, estado, d) {
  const ev = p.evaluacion;
  const actual = estado.datos.suficiencia[d.numero] || {};
  const nodo = el("div", { clase: "suficiencia", id: `suficiencia-${d.numero}` });
  const area = el("textarea", { clase: "control", rows: "2", maxlength: "400", id: `suficiencia-obs-${d.numero}`, placeholder: "¿Qué aspecto falta medir? (opcional)" });
  area.value = actual.obs || "";
  const envoltura = el("div", { hidden: !(actual.v === ev.rango.min || area.value) }, [el("label", { clase: "visualmente-oculto", for: area.id, texto: `Qué falta medir en ${d.nombre}` }), area]);
  area.addEventListener("input", () => estado.suficiencia(d, { obs: area.value }));
  const escala = [ev.rango.max, ev.rango.min].map(v => ({ valor: v, etiqueta: ev.escala.find(e => e.valor === v).etiqueta, polo: v === ev.rango.max ? "alto" : "bajo" }));
  nodo.append(
    el("p", { clase: "suficiencia__pregunta", texto: `Para terminar esta parte: ¿estas ${d.items.length} preguntas son suficientes para medir «${d.nombre}»?` }),
    segmento(`suficiencia-${d.numero}`, escala, actual.v ?? null, `Suficiencia de ${d.nombre}`, valor => {
      estado.suficiencia(d, { v: valor });
      nodo.classList.remove("falta");
      if (valor === ev.rango.min) { envoltura.hidden = false; area.focus(); }
    }),
    envoltura,
  );
  return nodo;
}

export function pantallaDimension(p, estado, v, d, indice, total) {
  const ev = p.evaluacion;
  const leyenda = el("p", { clase: "leyenda-criterios" }, [
    "En cada pregunta marque Sí o No: ",
    ...ev.criterios.flatMap((c, i) => [i ? " · " : "", el("strong", { texto: c.nombre }), AYUDA_CRITERIO[c.clave] ? ` (${AYUDA_CRITERIO[c.clave]})` : ""]),
    ".",
  ]);
  const estadoTexto = el("span", { clase: "navegacion__estado", "aria-live": "polite" });

  const nodo = el("section", { clase: "pantalla", "aria-labelledby": `titulo-dim-${d.numero}` }, [
    cabeceraPaso({ paso: 1, nombre: "Revisar las preguntas", parte: `parte ${indice + 1} de ${total}`, fraccion: (indice + 1) / (total + 2) }),
    el("p", { clase: "pantalla__kicker", texto: `${rangoItems(d)} · ${v.nombre}` }),
    el("h2", { clase: "pantalla__titulo", id: `titulo-dim-${d.numero}`, tabindex: "-1", texto: d.nombre }),
    d.definicion ? conHtml("p", { clase: "pantalla__guia" }, d.definicion) : null,
    v.definicion ? el("details", { clase: "desplegable desplegable--chico" }, [
      el("summary", {}, [el("span", { texto: `¿Qué se entiende por «${v.nombre}»?` })]),
      conHtml("p", {}, v.definicion),
    ]) : null,
    leyenda,
    el("div", { clase: "lista-items" }, d.items.map(it => tarjetaItem(p, estado, it))),
    ev.suficiencia?.activa ? bloqueSuficiencia(p, estado, d) : null,
    navegacion({ textoSiguiente: indice === total - 1 ? "Continuar a la opinión final" : "Siguiente parte", estado: estadoTexto }),
  ]);

  const refrescar = () => {
    const hechos = d.items.filter(it => estado.itemCompleto(it)).length;
    estadoTexto.textContent = hechos === d.items.length ? "Parte completa ✓" : `${hechos} de ${d.items.length} respondidas`;
  };
  return { nodo, refrescar };
}

/* ---------------------------------------------------------- Opinión final */
const DESCRIPCIONES_APLICABILIDAD = {
  "Aplicable": "Puede aplicarse tal como está.",
  "Aplicable después de corregir": "Puede aplicarse tras atender mis comentarios.",
  "No aplicable": "Debe reformularse antes de aplicarse.",
};

export function pantallaOpinion(p, estado, fraccion) {
  const ev = p.evaluacion;
  const tonos = ["ok", "aviso", "mal"];
  const iconos = ["check", "alert", "close"];
  const opciones = el("div", { clase: "opciones-tarjeta", id: "aplicabilidad", role: "radiogroup", "aria-labelledby": "titulo-opinion" });
  ev.aplicabilidad.forEach((op, i) => {
    const t = ev.aplicabilidad.length === 3 ? i : Math.round((i * 2) / Math.max(1, ev.aplicabilidad.length - 1));
    const input = el("input", { type: "radio", name: "aplicabilidad", value: op });
    input.checked = estado.datos.aplicabilidad === op;
    input.addEventListener("change", () => { estado.fijar("aplicabilidad", op); opciones.classList.remove("falta"); });
    opciones.append(el("label", { clase: `opcion-tarjeta opcion-tarjeta--${tonos[t]}` }, [
      input,
      el("span", { clase: "opcion-tarjeta__icono" }, [icono(iconos[t])]),
      el("span", {}, [el("strong", { texto: op }), DESCRIPCIONES_APLICABILIDAD[op] ? el("small", { texto: DESCRIPCIONES_APLICABILIDAD[op] }) : null]),
    ]));
  });

  const obs = el("textarea", { clase: "control", id: "observaciones", rows: "4", maxlength: "1500", placeholder: "Por ejemplo: extensión, orden de las preguntas, redacción…" });
  obs.value = estado.datos.observaciones;
  obs.addEventListener("input", () => estado.fijar("observaciones", obs.value));

  return el("section", { clase: "pantalla", "aria-labelledby": "titulo-opinion" }, [
    cabeceraPaso({ paso: 2, nombre: "Opinión final", fraccion }),
    el("h2", { clase: "pantalla__titulo", id: "titulo-opinion", tabindex: "-1", texto: "En general, ¿el cuestionario se puede aplicar?" }),
    opciones,
    el("label", { clase: "campo__etiqueta etiqueta-bloque", for: "observaciones", texto: "Comentarios generales (opcional)" }),
    obs,
    navegacion({ textoSiguiente: "Continuar a la firma" }),
  ]);
}

/* ------------------------------------------------------------------ Firma */
export function pantallaFirma(p, estado, experto) {
  const ev = p.evaluacion;
  const j = estado.datos.juez;
  const campo = (id, etiqueta, control, ayuda, ancho = false) => el("div", { clase: `campo${ancho ? " campo--ancho" : ""}` }, [
    el("label", { clase: "campo__etiqueta", for: id, texto: etiqueta }), control, ayuda ? el("span", { clase: "campo__ayuda", texto: ayuda }) : null,
  ]);
  const grado = el("select", { clase: "control", id: "campo-grado" }, ev.grados.map(g => el("option", { value: g.valor, texto: g.etiqueta })));
  grado.value = j.grado;
  const nombre = el("input", { clase: "control", id: "campo-nombre", type: "text", autocomplete: "name", value: j.nombre, maxlength: "120" });
  const documento = el("input", { clase: "control", id: "campo-documento", type: "text", inputmode: "numeric", autocomplete: "off", maxlength: "12", value: j.documento });
  const especialidad = el("input", { clase: "control", id: "campo-especialidad", type: "text", value: j.especialidad, maxlength: "160" });
  grado.addEventListener("change", () => estado.juez("grado", grado.value));
  for (const [ctrl, clave] of [[nombre, "nombre"], [documento, "documento"], [especialidad, "especialidad"]]) {
    ctrl.addEventListener("input", () => { estado.juez(clave, ctrl.value); ctrl.classList.remove("invalido"); });
  }
  documento.addEventListener("blur", () => {
    const v = documento.value.trim();
    documento.classList.toggle("invalido", !!v && !new RegExp(ev.documento_identidad.patron).test(v));
  });

  const lienzo = el("canvas", { id: "lienzo", role: "img", "aria-label": "Recuadro para firmar" });
  const recuadro = el("div", { clase: "lienzo-firma", id: "lienzo-firma", tabindex: "-1" }, [
    lienzo,
    el("span", { clase: "lienzo-firma__x", "aria-hidden": "true", texto: "×" }),
    el("span", { clase: "lienzo-firma__guia", "aria-hidden": "true" }),
    el("span", { clase: "lienzo-firma__vacio", texto: "Firme aquí con el dedo o el mouse" }),
  ]);
  const subir = el("input", { type: "file", accept: "image/*", id: "subir-firma", hidden: true });
  const herramientas = el("div", { clase: "firma__herramientas" }, [
    el("button", { type: "button", clase: "boton-enlace", dataset: { firma: "deshacer" } }, [icono("undo"), "Deshacer"]),
    el("button", { type: "button", clase: "boton-enlace", dataset: { firma: "borrar" } }, [icono("trash"), "Borrar"]),
    el("label", { clase: "boton-enlace", for: "subir-firma" }, [icono("upload"), "Subir foto de mi firma"]),
    subir,
  ]);

  const declaracion = el("input", { type: "checkbox", id: "casilla-declaracion" });
  declaracion.checked = !!estado.datos.declaracion;
  const etiquetaDeclaracion = el("label", { clase: "declaracion", id: "declaracion", for: "casilla-declaracion" }, [
    declaracion,
    el("span", { texto: "Declaro que esta evaluación refleja mi juicio profesional y autorizo su uso con fines académicos." }),
  ]);
  declaracion.addEventListener("change", () => { estado.fijar("declaracion", declaracion.checked); etiquetaDeclaracion.classList.remove("falta"); });

  const faltantes = el("div", { clase: "faltantes aviso aviso--aviso", hidden: true, role: "alert" });
  const error = el("div", { clase: "aviso aviso--mal", hidden: true, role: "alert" });
  const generar = el("button", { type: "button", clase: "boton boton--grande boton--bloque", id: "generar" }, [icono("file"), "Generar mi certificado (PDF)"]);
  const exito = el("div", { clase: "exito", id: "exito", hidden: true, tabindex: "-1" });

  const nodo = el("section", { clase: "pantalla", "aria-labelledby": "titulo-firma" }, [
    cabeceraPaso({ paso: 3, nombre: "Firma y certificado", fraccion: 1 }),
    el("h2", { clase: "pantalla__titulo", id: "titulo-firma", tabindex: "-1", texto: "Revise sus datos y firme" }),
    el("p", { clase: "pantalla__guia", texto: "Estos datos aparecerán en su certificado. Su DNI no se guarda en ningún servidor." }),
    el("div", { clase: "rejilla-campos" }, [
      campo("campo-grado", "Grado académico", grado),
      campo("campo-documento", ev.documento_identidad.nombre, documento),
      campo("campo-nombre", "Apellidos y nombres", nombre, null, true),
      campo("campo-especialidad", "Especialidad", especialidad, null, true),
    ]),
    el("h3", { clase: "subtitulo", texto: "Su firma" }),
    recuadro,
    herramientas,
    etiquetaDeclaracion,
    faltantes,
    generar,
    error,
    exito,
    navegacion(),
  ]);
  return { nodo, lienzo, recuadro, subir, generar, faltantes, error, exito, etiquetaDeclaracion };
}

/* ------------------------------------------------------------------- Pie */
export function pie(p) {
  const c = p.contacto || {};
  return el("footer", { clase: "pie" }, el("div", { clase: "pie__marco" }, [
    el("p", {}, [el("strong", { texto: "¿Alguna duda? " }), `Escriba a ${c.nombre || p.investigacion.autor}`,
      c.whatsapp ? [" por ", el("a", { href: `https://wa.me/${c.whatsapp}`, target: "_blank", rel: "noopener", texto: "WhatsApp" })] : "",
      c.correo ? [" o a ", el("a", { href: `mailto:${c.correo}`, texto: c.correo })] : "", "."].flat()),
  ]));
}
