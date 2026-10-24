// Construcción de la interfaz a partir del proyecto. Cada bloque devuelve su nodo y,
// cuando corresponde, una función `refrescar()` que lo sincroniza con el estado.

import { $, $$, el, icono, md, plano, rellenar, capitalizar, fechaIso, fechaLarga, fechaCarta, iniciales } from "./util.js";

const rangoItems = d => {
  const ns = d.items.map(i => i.numero);
  return ns.length === 1 ? `ítem ${ns[0]}` : `ítems ${ns[0]} al ${ns[ns.length - 1]}`;
};
const conHtml = (etiqueta, atributos, texto) => el(etiqueta, { ...atributos, html: md(texto) });
const archivoDocumento = (doc, experto) => (experto ? rellenar(doc.archivo, { clave: experto.clave }) : doc.archivo_general || null);

/* ---------------------------------------------------------------- Portada */
export function portada(p, experto) {
  const inv = p.investigacion;
  const ev = p.evaluacion;
  const meta = [
    ["Investigador", inv.autor],
    ["Asesor", inv.asesor],
    ["Programa académico", p.institucion?.programa],
    ["Línea de investigación", inv.linea],
    ["Enfoque metodológico", inv.enfoque],
    ["Tipo de instrumento", inv.instrumento],
  ].filter(([, v]) => v);

  const destacados = [
    { icono: "clock", titulo: `~${ev.minutos} min`, desc: "Tiempo estimado" },
    { icono: "file", titulo: `${p.items.length} ítems`, desc: "Marque Sí o No" },
    { icono: "shield", titulo: "Autoguardado", desc: "No pierde su avance" },
    { icono: "sign", titulo: "Firma digital", desc: "Certificado en PDF" },
  ];

  const detallesAcademicos = el("details", { clase: "meta-caja" }, [
    el("summary", {}, [
      el("span", { texto: "📋 Ver información académica del proyecto de tesis" }),
      icono("chevron"),
    ]),
    el("dl", { clase: "meta" }, meta.map(([k, v]) => el("div", {}, [el("dt", { texto: k }), el("dd", { texto: v })]))),
  ]);

  const texto = el("div", { clase: "portada__texto" }, [
    el("p", { clase: "sobretitulo", texto: "Validación por Juicio de Expertos" }),
    el("h1", { clase: "portada__titulo", id: "titulo-portada", texto: plano(inv.titulo) }),
    el("p", { clase: "portada__tipo", texto: "Agradecemos su valiosa colaboración académica evaluando la pertinencia, relevancia y claridad de los ítems de este instrumento." }),
    detallesAcademicos,
    el("div", { clase: "destacados-evaluacion" }, destacados.map(d => el("div", { clase: "destacado-pildora" }, [
      icono(d.icono),
      el("div", {}, [el("strong", { texto: d.titulo }), el("span", { texto: d.desc })]),
    ]))),
  ]);

  const limite = fechaIso(p.fecha_limite);
  const lista = [
    el("li", {}, [icono("clock"), el("span", { texto: `Evaluación rápida de 24 preguntas breves. Puede responder desde su celular, tablet o computadora.` })]),
    limite ? el("li", {}, [icono("calendar"), el("span", { html: `Fecha sugerida de respuesta: <strong>${fechaLarga(limite)}</strong>.` })]) : null,
    el("li", {}, [icono("shield"), el("span", { texto: "Sus respuestas se guardan automáticamente en este navegador; puede pausar y retomar cuando desee." })]),
  ];
  const docPrincipal = p.documentos.map(d => ({ ...d, url: archivoDocumento(d, experto) })).find(d => d.url);

  const invitacion = el("aside", { clase: "invitacion tarjeta", "aria-label": "Invitación personal" }, [
    el("p", { clase: "sobretitulo", texto: experto ? "Invitación personal" : "Invitación a validar" }),
    el("div", { clase: "invitacion__cabecera" }, [
      el("div", { clase: "avatar", "aria-hidden": "true", texto: experto ? iniciales(experto.nombre) : "" }, experto ? [] : [icono("sign")]),
      el("div", {}, [
        el("div", { clase: "invitacion__nombre", texto: experto ? `${experto.grado} ${experto.nombre}` : "Estimado(a) Docente / Experto(a)" }),
        el("div", { clase: "invitacion__rol", texto: experto?.rol || "Juez validador del instrumento" }),
      ]),
    ]),
    el("ul", { clase: "invitacion__lista" }, lista),
    el("div", { clase: "botones" }, [
      el("a", { clase: "boton boton--grande", href: "#evaluacion" }, ["Comenzar evaluación", icono("arrow")]),
      docPrincipal ? el("a", { clase: "boton boton--secundario", href: p.base + docPrincipal.url, target: "_blank", rel: "noopener" }, [icono("download"), "Ver expediente (PDF)"]) : null,
    ]),
  ]);

  return el("section", { clase: "portada", id: "inicio", "aria-labelledby": "titulo-portada" }, [
    el("div", { clase: "portada__marco" }, [texto, invitacion]),
  ]);
}

export function pasos(p) {
  const datos = [
    ["1. Revise el expediente", "Consulte la carta oficial, variables y cuestionario en las pestañas."],
    ["2. Califique cada ítem", "Lea cada pregunta y marque con un toque: Sí o No."],
    ["3. Emita su dictamen", "Indique si el instrumento es aplicable y sus observaciones."],
    ["4. Firme en pantalla", "Firme con el dedo o mouse y descargue su certificado en PDF."],
  ];
  return el("ol", { clase: "pasos", "aria-label": "Cómo funciona" }, datos.map(([t, d], i) => el("li", { clase: "paso tarjeta" }, [
    el("span", { clase: "paso__numero", texto: String(i + 1) }),
    el("div", {}, [el("h3", { texto: t }), el("p", { texto: d })]),
  ])));
}

/* ----------------------------------------------------------------- Índice */
export function indice(p) {
  const anillo = el("div", { clase: "anillo", "aria-hidden": "true", html: '<svg viewBox="0 0 56 56"><circle class="pista" cx="28" cy="28" r="24"/><circle class="valor" cx="28" cy="28" r="24"/></svg><span>0 %</span>' });
  const enlace = (href, num, texto, extra = {}) => el("a", { href, ...extra }, [num !== null ? el("span", { clase: "indice__num", texto: String(num) }) : null, el("span", { texto })]);
  const subDim = d => el("li", {}, [el("a", { href: `#dimension-${d.numero}`, clase: "indice__sub", dataset: { dimension: d.numero } }, [
    el("span", { texto: `D${d.numero}. ${d.nombre}` }), el("span", { clase: "indice__cuenta", texto: `0/${d.items.length}` }),
  ])]);

  const nodo = el("nav", { clase: "indice", id: "indice", "aria-label": "Índice de la validación" }, [
    el("button", { type: "button", clase: "boton-icono indice__cerrar", "aria-label": "Cerrar el índice", dataset: { cerrarIndice: "" } }, [icono("close")]),
    el("div", { clase: "indice__progreso tarjeta" }, [
      anillo,
      el("div", {}, [el("strong", { texto: "Su avance", id: "indice-titulo-avance" }), el("small", { id: "indice-texto-avance", texto: "" })]),
    ]),
    el("p", { clase: "indice__titulo", texto: "Contenido" }),
    el("ol", {}, [
      el("li", { clase: "indice__grupo" }, [enlace("#expediente", 1, "Expediente", { dataset: { seccion: "expediente" } })]),
      el("li", { clase: "indice__grupo" }, [
        enlace("#evaluacion", 2, "Evaluación de ítems", { dataset: { seccion: "evaluacion" } }),
        el("ol", {}, p.dimensiones.map(subDim)),
      ]),
      el("li", { clase: "indice__grupo" }, [enlace("#valoracion", 3, "Valoración global", { dataset: { seccion: "valoracion" } })]),
      el("li", { clase: "indice__grupo" }, [enlace("#firma-envio", 4, "Firma y envío", { dataset: { seccion: "firma-envio" } })]),
    ]),
    el("button", { type: "button", clase: "boton boton--suave boton--bloque", style: "margin-top:16px", dataset: { siguiente: "" } }, ["Ir al siguiente pendiente", icono("arrow")]),
    el("div", { clase: "indice__pie" }, [icono("lock"), el("span", { texto: "Sus respuestas no se envían a ningún servidor: el PDF se genera en su propio dispositivo." })]),
  ]);
  return nodo;
}

/* ------------------------------------------------------------- Cabeceras */
function cabeceraSeccion(numero, titulo, entrada) {
  return el("header", { clase: "seccion__cabecera" }, [
    el("span", { clase: "seccion__num", "aria-hidden": "true", texto: String(numero) }),
    el("div", {}, [el("h2", { clase: "seccion__titulo", id: `titulo-seccion-${numero}`, texto: titulo }), entrada ? el("p", { clase: "seccion__entrada", texto: entrada }) : null]),
  ]);
}

/* ------------------------------------------------------- 1. Expediente */
export function seccionExpediente(p, experto) {
  const paneles = [
    { id: "carta", titulo: "Carta", icono: "mail", cuerpo: () => carta(p, experto) },
    { id: "variables", titulo: "Variables", icono: "layers", cuerpo: () => definiciones(p) },
    { id: "matriz", titulo: "Matriz", icono: "list", cuerpo: () => matriz(p) },
    p.cuestionario ? { id: "cuestionario", titulo: "Cuestionario", icono: "file", cuerpo: () => cuestionario(p.cuestionario) } : null,
  ].filter(Boolean);

  const lista = el("div", { clase: "pestanas", role: "tablist", "aria-label": "Partes del expediente" });
  const contenedor = el("div");
  paneles.forEach((pn, i) => {
    const boton = el("button", {
      type: "button", clase: "pestana", role: "tab", id: `pestana-${pn.id}`, "aria-controls": `panel-${pn.id}`,
      "aria-selected": i === 0 ? "true" : "false", tabindex: i === 0 ? "0" : "-1", dataset: { panel: pn.id },
    }, [icono(pn.icono), pn.titulo]);
    lista.append(boton);
    contenedor.append(el("div", { clase: "panel", role: "tabpanel", id: `panel-${pn.id}`, "aria-labelledby": `pestana-${pn.id}`, tabindex: "0", hidden: i !== 0 }, [pn.cuerpo()]));
  });

  const activar = (boton, enfocar = true) => {
    for (const b of $$(".pestana", lista)) {
      const sel = b === boton;
      b.setAttribute("aria-selected", String(sel));
      b.tabIndex = sel ? 0 : -1;
      $(`#panel-${b.dataset.panel}`, contenedor).hidden = !sel;
    }
    if (enfocar) boton.focus();
  };
  lista.addEventListener("click", e => { const b = e.target.closest(".pestana"); if (b) activar(b, false); });
  lista.addEventListener("keydown", e => {
    const botones = $$(".pestana", lista);
    const i = botones.indexOf(document.activeElement);
    if (i < 0) return;
    const mover = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: botones.length - 1 - i }[e.key];
    if (mover === undefined) return;
    e.preventDefault();
    activar(botones[(i + mover + botones.length) % botones.length]);
  });

  const documentos = p.documentos.map(d => ({ ...d, url: archivoDocumento(d, experto) })).filter(d => d.url);
  return el("section", { clase: "seccion", id: "expediente", "aria-labelledby": "titulo-seccion-1" }, [
    cabeceraSeccion(1, "Expediente de validación", "Todo el expediente está en esta página. Revise cada pestaña antes de evaluar; si lo prefiere, descargue la versión en PDF."),
    lista,
    contenedor,
    documentos.length ? el("div", { clase: "documentos" }, documentos.map(d => el("a", { clase: "documento-enlace tarjeta", href: p.base + d.url, target: "_blank", rel: "noopener" }, [
      el("span", { clase: "documento-enlace__icono" }, [icono("file")]),
      el("span", {}, [el("strong", { texto: d.titulo }), d.descripcion ? el("span", { texto: d.descripcion }) : null]),
      icono("download"),
    ]))) : null,
  ]);
}

function carta(p, experto) {
  const c = p.carta || {};
  const hoy = new Date();
  const area = experto?.area || "______________________________";
  const inst = p.institucion || {};
  return el("article", { clase: "documento tarjeta" }, [el("div", { clase: "carta" }, [
    el("div", { clase: "carta__membrete" }, [
      inst.logo ? el("img", { src: p.base + inst.logo, alt: inst.nombre || "", loading: "lazy" }) : el("span"),
      el("div", { html: [inst.nombre, inst.unidad, inst.programa].filter(Boolean).map(x => md(x)).join("<br>") }),
    ]),
    el("p", { clase: "carta__fecha", texto: `${inst.ciudad || "Lima"}, ${fechaCarta(hoy)}` }),
    el("p", { clase: "carta__destinatario", html: experto
      ? `<strong>${md(experto.grado)}</strong> ${md(experto.nombre)}<br><strong>Presente.</strong>`
      : "<strong>Mg./Dr.</strong> ______________________<br><strong>Presente.</strong>" }),
    c.asunto ? el("p", { clase: "carta__asunto", html: `<strong>Asunto:</strong> ${md(c.asunto)}` }) : null,
    ...(c.parrafos || []).map(t => el("p", { html: md(rellenar(t, { area })) })),
    c.contenido_titulo ? el("p", { html: md(c.contenido_titulo) }) : null,
    c.contenido?.length ? el("ul", {}, c.contenido.map(x => el("li", { html: md(x) }))) : null,
    c.cierre ? el("p", { html: md(c.cierre) }) : null,
    el("div", { clase: "carta__firma" }, [
      el("p", { texto: "Atentamente,", style: "margin-bottom:.4em" }),
      el("strong", { texto: c.firma || p.investigacion.autor }),
      el("span", { texto: p.investigacion.tipo ? "Investigador" : "" }),
    ]),
  ])]);
}

function definiciones(p) {
  return el("div", { clase: "definiciones" }, p.variables.map(v => el("article", { clase: "variable-ficha tarjeta" }, [
    el("span", { clase: "chip chip--acento", texto: `Variable ${v.numero}` }),
    el("h3", { texto: v.nombre }),
    conHtml("p", {}, v.definicion),
    el("div", { clase: "dim-ficha" }, v.dimensiones.map(d => el("article", {}, [
      el("h4", { texto: `Dimensión ${d.numero}: ${d.nombre}` }),
      conHtml("p", {}, d.definicion),
    ]))),
  ])));
}

function matriz(p) {
  const bloques = p.variables.map(v => {
    const cuerpo = el("tbody");
    for (const d of v.dimensiones) {
      const inds = d.indicadores?.length ? d.indicadores : [{ nombre: "—", items: d.items.map(i => i.numero) }];
      inds.forEach((ind, i) => cuerpo.append(el("tr", { clase: i < inds.length - 1 ? "tabla__continua" : "" }, [
        i === 0 ? el("td", { clase: "tabla__dim", rowspan: String(inds.length), texto: `D${d.numero}: ${d.nombre}` }) : null,
        el("td", { texto: ind.nombre }),
        el("td", { clase: "tabla__items", texto: `${(ind.items || []).length === 1 ? "Ítem" : "Ítems"} ${(ind.items || []).join(", ")}` }),
      ])));
    }
    return el("article", { clase: "matriz__variable tarjeta" }, [
      el("div", { clase: "matriz__cabecera" }, [
        el("h3", { texto: `V${v.numero}: ${v.nombre}` }),
        el("div", { clase: "matriz__datos" }, [v.escala ? el("span", { clase: "chip", texto: v.escala }) : null, el("span", { clase: "chip", texto: `${v.dimensiones.reduce((n, d) => n + d.items.length, 0)} ítems` })]),
        v.niveles?.length ? el("ul", { clase: "matriz__niveles" }, v.niveles.map(n => el("li", { texto: `Niveles y rangos · ${n}` }))) : null,
      ]),
      el("table", { clase: "tabla" }, [
        el("thead", {}, el("tr", {}, [el("th", { scope: "col", texto: "Dimensión" }), el("th", { scope: "col", texto: "Indicador" }), el("th", { scope: "col", texto: "Ítems", style: "text-align:right" })])),
        cuerpo,
      ]),
    ]);
  });
  return el("div", { clase: "matriz" }, [...bloques, p.nota_matriz ? el("p", { clase: "nota", html: `<em>Nota.</em> ${md(p.nota_matriz)}` }) : null]);
}

function cuestionario(c) {
  const opciones = lista => el("div", { clase: "vista-opciones" }, lista.map(o => el("span", { texto: o })));
  const bloques = (c.bloques || []).map(b => {
    const hijos = [el("h4", { texto: b.titulo })];
    if (b.tipo === "opciones") {
      b.preguntas.forEach((q, i) => hijos.push(el("div", { clase: "vista-pregunta" }, [
        el("p", {}, [b.preguntas.length > 1 ? `${i + 1}. ` : "", q.texto, q.nota ? el("small", { texto: ` (${q.nota})` }) : null]),
        opciones(q.opciones),
      ])));
    } else if (b.tipo === "escala") {
      if (b.instrucciones) hijos.push(el("p", { texto: b.instrucciones, style: "font-size:.92rem" }));
      if (b.escala?.length) hijos.push(el("div", { clase: "vista-escala", texto: b.escala.join(" · ") }));
      const puntos = Math.max(2, b.escala?.length || 5);
      for (const g of b.grupos || []) {
        hijos.push(el("p", { clase: "vista-grupo", texto: g.titulo }));
        for (const it of g.items) hijos.push(el("div", { clase: "vista-item" }, [
          el("span", { texto: `${it.numero}. ${it.texto}` }),
          el("div", { clase: "vista-item__burbujas", "aria-hidden": "true" }, Array.from({ length: puntos }, (_, k) => el("span", { texto: String(k + 1) }))),
        ]));
      }
    }
    return el("div", { clase: "vista-cuestionario__bloque" }, hijos);
  });
  return el("article", { clase: "vista-cuestionario tarjeta" }, [
    el("p", { clase: "sobretitulo", texto: "Vista previa · así lo verán los participantes", style: "text-align:center" }),
    el("h3", { clase: "vista-cuestionario__titulo", texto: c.titulo }),
    c.presentacion ? conHtml("p", { style: "font-size:.93rem; color:var(--tinta-2)" }, c.presentacion) : null,
    ...(c.notas || []).map(n => el("div", { clase: "aviso", style: "margin-top:10px" }, [icono("info"), conHtml("p", {}, n)])),
    ...bloques,
    c.cierre ? el("p", { clase: "suave", texto: c.cierre, style: "text-align:center; margin-top:22px; font-style:italic" }) : null,
  ]);
}

/* ------------------------------------------------- 2. Evaluación de ítems */
function segmento(nombre, escala, valorActual, etiquetaGrupo, alElegir) {
  const nodo = el("div", { clase: "segmento", role: "radiogroup", "aria-label": etiquetaGrupo });
  for (const opcion of escala) {
    const input = el("input", { type: "radio", name: nombre, value: String(opcion.valor), dataset: { polo: opcion.polo } });
    input.checked = valorActual === opcion.valor;
    input.addEventListener("change", () => alElegir(opcion.valor));
    const prefijo = opcion.polo === "alto" ? "✓ " : opcion.polo === "bajo" ? "✕ " : "";
    nodo.append(el("label", {}, [input, el("span", { texto: `${prefijo}${opcion.etiqueta}` })]));
  }
  return nodo;
}

function tarjetaItem(p, estado, it) {
  const ev = p.evaluacion;
  const etiquetaMin = ev.escala.find(e => e.valor === ev.rango.min)?.etiqueta || String(ev.rango.min);
  const nodo = el("article", { clase: "item", id: `item-${it.numero}`, "aria-labelledby": `texto-item-${it.numero}` });
  const aviso = el("p", { clase: "item__aviso", hidden: true }, [icono("alert"), el("span")]);
  const area = el("textarea", { clase: "control", id: `sugerencia-${it.numero}`, rows: "3", maxlength: "600", placeholder: "Por ejemplo, una redacción alternativa del ítem o el motivo de su observación" });
  area.value = estado.datos.sugerencias[it.numero] || "";
  const contador = el("span", { clase: "contador" });
  const caja = el("div", { clase: "sugerencia", hidden: !area.value }, [
    el("label", { clase: "visualmente-oculto", for: area.id, texto: `Sugerencia para el ítem ${it.numero}` }),
    area,
    el("div", { clase: "sugerencia__acciones" }, [
      el("button", { type: "button", clase: "boton-enlace", on: { click: () => { if (!area.value.trim()) { area.value = it.texto; area.dispatchEvent(new Event("input")); } area.focus(); } } }, [icono("edit"), "Partir del texto actual"]),
      contador,
    ]),
  ]);
  const alternar = el("button", { type: "button", clase: "boton-enlace", "aria-controls": `sugerencia-${it.numero}` }, [icono("edit"), ""]);
  const mostrarCaja = visible => {
    caja.hidden = !visible;
    alternar.setAttribute("aria-expanded", String(visible));
    alternar.lastChild.textContent = visible ? "Ocultar sugerencia" : area.value.trim() ? "Ver sugerencia" : "Agregar sugerencia (opcional)";
  };
  mostrarCaja(!caja.hidden);
  alternar.addEventListener("click", () => {
    mostrarCaja(caja.hidden);
    if (!caja.hidden) area.focus();
  });
  const contar = () => { contador.textContent = `${area.value.length}/600`; };
  area.addEventListener("input", () => { estado.sugerir(it, area.value); contar(); refrescar(); });
  contar();

  let abiertaPorObservacion = false;
  const refrescar = () => {
    const completo = estado.itemCompleto(it);
    const observado = estado.itemObservado(it);
    nodo.classList.toggle("completo", completo && !observado);
    nodo.classList.toggle("observado", observado);
    if (completo) nodo.classList.remove("falta");
    const conMin = ev.criterios.filter(c => estado.respuesta(it, c.clave) === ev.rango.min).map(c => c.nombre.toLowerCase());
    aviso.hidden = !conMin.length;
    if (conMin.length) {
      aviso.lastChild.textContent = `Marcó «${etiquetaMin}» en ${conMin.join(" y ")}. ${area.value.trim() ? "Gracias por su sugerencia." : "Le agradeceremos indicar cómo mejorar el ítem."}`;
      if (!abiertaPorObservacion && caja.hidden) { mostrarCaja(true); abiertaPorObservacion = true; }
    }
  };

  const criterios = el("div", { clase: "item__criterios", style: `--n-criterios:${ev.criterios.length}` }, ev.criterios.map(c => el("fieldset", { clase: "criterio" }, [
    el("legend", { texto: c.nombre }),
    segmento(`item-${it.numero}-${c.clave}`, ev.escala, estado.respuesta(it, c.clave), `${c.nombre} del ítem ${it.numero}`, valor => { estado.responder(it, c.clave, valor); refrescar(); }),
  ])));

  nodo.append(
    el("div", { clase: "item__cabecera" }, [
      el("span", { clase: "item__num", "aria-hidden": "true", texto: String(it.numero).padStart(2, "0") }),
      el("div", {}, [
        el("p", { clase: "item__texto", id: `texto-item-${it.numero}` }, [el("span", { clase: "visualmente-oculto", texto: `Ítem ${it.numero}: ` }), it.texto]),
        it.indicador ? el("span", { clase: "item__indicador", texto: `Indicador: ${it.indicador}` }) : null,
      ]),
    ]),
    criterios,
    el("div", { clase: "item__pie" }, [aviso, alternar, caja]),
  );
  refrescar();
  return nodo;
}

function bloqueSuficiencia(p, estado, d) {
  const ev = p.evaluacion;
  const actual = estado.datos.suficiencia[d.numero] || {};
  const nodo = el("div", { clase: "suficiencia", id: `suficiencia-${d.numero}` });
  const area = el("textarea", { clase: "control", rows: "2", maxlength: "400", id: `suficiencia-obs-${d.numero}`, placeholder: "¿Qué aspecto de la dimensión falta medir? (opcional)" });
  area.value = actual.obs || "";
  const envoltura = el("div", { hidden: !(actual.v === ev.rango.min || area.value) }, [el("label", { clase: "visualmente-oculto", for: area.id, texto: `Observación sobre la suficiencia de la dimensión ${d.numero}` }), area]);
  area.addEventListener("input", () => estado.suficiencia(d, { obs: area.value }));
  const escala = [{ valor: ev.rango.max, etiqueta: ev.escala.find(e => e.valor === ev.rango.max).etiqueta, polo: "alto" }, { valor: ev.rango.min, etiqueta: ev.escala.find(e => e.valor === ev.rango.min).etiqueta, polo: "bajo" }];
  nodo.append(
    el("div", { clase: "suficiencia__fila" }, [
      el("div", {}, [
        el("strong", { texto: "Suficiencia de la dimensión" }),
        el("span", { texto: `¿Los ${d.items.length} ítems son suficientes para medir «${d.nombre}»?` }),
      ]),
      segmento(`suficiencia-${d.numero}`, escala, actual.v ?? null, `Suficiencia de la dimensión ${d.numero}`, valor => {
        estado.suficiencia(d, { v: valor });
        nodo.classList.remove("falta");
        if (valor === ev.rango.min) { envoltura.hidden = false; area.focus(); }
      }),
    ]),
    envoltura,
  );
  return nodo;
}

export function seccionEvaluacion(p, estado) {
  const ev = p.evaluacion;
  const escalaTexto = ev.escala.map(e => e.etiqueta).join(" / ");
  const criterios = el("div", { clase: "criterios" }, ev.criterios.map((c, i) => el("article", { clase: "criterio-ficha tarjeta" }, [
    el("span", { clase: "criterio-ficha__marca", texto: String(i + 1) }),
    el("div", {}, [el("h3", { texto: c.nombre }), el("p", { texto: capitalizar(c.definicion) })]),
  ])));

  const refrescos = [];
  const variables = p.variables.map(v => {
    const dims = v.dimensiones.map(d => {
      const barra = el("span");
      const cuenta = el("span", { texto: `0/${d.items.length}` });
      const tarjeta = el("section", { clase: "dimension tarjeta", id: `dimension-${d.numero}`, "aria-labelledby": `titulo-dimension-${d.numero}` }, [
        el("header", { clase: "dimension__cabecera" }, [
          el("p", { clase: "sobretitulo", texto: `Dimensión ${d.numero} · ${rangoItems(d)}`, style: "margin-bottom:4px" }),
          el("div", { clase: "dimension__fila" }, [
            el("h4", { id: `titulo-dimension-${d.numero}`, texto: d.nombre }),
            el("span", { clase: "dimension__avance" }, [el("span", { clase: "mini-barra", "aria-hidden": "true" }, barra), cuenta]),
          ]),
        ]),
        el("div", { clase: "dimension__contexto" }, el("details", { clase: "desplegable" }, [
          el("summary", {}, [el("span", { texto: "Definición e indicadores" }), icono("chevron")]),
          el("div", { clase: "contenido-desplegable" }, [
            conHtml("p", {}, d.definicion),
            d.indicadores?.length ? el("ul", {}, d.indicadores.map(i => el("li", { texto: `${i.nombre} (${(i.items || []).length === 1 ? "ítem" : "ítems"} ${(i.items || []).join(", ")})` }))) : null,
          ]),
        ])),
        ...d.items.map(it => tarjetaItem(p, estado, it)),
        ev.suficiencia.activa ? bloqueSuficiencia(p, estado, d) : null,
      ]);
      refrescos.push(() => {
        const hechos = d.items.filter(it => estado.itemCompleto(it)).length;
        barra.style.width = `${(100 * hechos) / d.items.length}%`;
        cuenta.textContent = `${hechos}/${d.items.length}`;
        tarjeta.classList.toggle("completa", estado.dimensionCompleta(d));
      });
      return tarjeta;
    });
    return el("div", { clase: "variable" }, [
      el("header", { clase: "variable__cabecera" }, [
        el("p", { clase: "sobretitulo", texto: `Variable ${v.numero}` }),
        el("h3", { texto: v.nombre }),
        conHtml("p", {}, v.definicion),
      ]),
      ...dims,
    ]);
  });

  const nodo = el("section", { clase: "seccion", id: "evaluacion", "aria-labelledby": "titulo-seccion-2" }, [
    cabeceraSeccion(2, "Evaluación de los ítems", `Lea cada enunciado y marque Sí o No en los tres criterios (Pertinencia, Relevancia y Claridad). Si marca No en alguno, podrá ingresar una sugerencia de mejora si lo desea.`),
    criterios,
    ev.suficiencia.activa && ev.suficiencia.definicion
      ? el("div", { clase: "aviso" }, [icono("info"), el("p", { html: `<strong>Suficiencia:</strong> ${md(ev.suficiencia.definicion)} Se evalúa al final de cada dimensión.` })])
      : null,
    ...variables,
  ]);
  return { nodo, refrescar: () => refrescos.forEach(f => f()) };
}

/* ---------------------------------------------------- 3. Valoración global */
const DESCRIPCIONES_APLICABILIDAD = {
  "Aplicable": "El instrumento puede aplicarse tal como está.",
  "Aplicable después de corregir": "Puede aplicarse tras atender las sugerencias.",
  "No aplicable": "Debe reformularse antes de aplicarse.",
};

export function seccionValoracion(p, estado) {
  const ev = p.evaluacion;
  const tonos = ["ok", "aviso", "mal"];
  const iconos = ["check-circle", "edit", "x-circle"];
  const opciones = el("div", { clase: "opciones-tarjeta", id: "aplicabilidad", role: "radiogroup", "aria-label": "Opinión de aplicabilidad" });
  ev.aplicabilidad.forEach((op, i) => {
    const t = ev.aplicabilidad.length === 3 ? i : Math.round((i * 2) / Math.max(1, ev.aplicabilidad.length - 1));
    const input = el("input", { type: "radio", name: "aplicabilidad", value: op });
    input.checked = estado.datos.aplicabilidad === op;
    input.addEventListener("change", () => { estado.fijar("aplicabilidad", op); opciones.classList.remove("falta"); });
    opciones.append(el("label", { clase: `opcion-tarjeta tarjeta opcion-tarjeta--${tonos[t]}` }, [
      input,
      el("span", { clase: "opcion-tarjeta__icono" }, [icono(iconos[t])]),
      el("span", {}, [el("strong", { texto: op }), DESCRIPCIONES_APLICABILIDAD[op] ? el("small", { texto: DESCRIPCIONES_APLICABILIDAD[op] }) : null]),
      el("span", { clase: "opcion-tarjeta__check", "aria-hidden": "true" }, [icono("check")]),
    ]));
  });

  const obs = el("textarea", { clase: "control", id: "observaciones", rows: "4", maxlength: "1500", placeholder: "Comentarios sobre el instrumento en su conjunto: estructura, extensión, escala, redacción…" });
  obs.value = estado.datos.observaciones;
  const contador = el("div", { clase: "contador" });
  const contar = () => { contador.textContent = `${obs.value.length}/1500`; };
  obs.addEventListener("input", () => { estado.fijar("observaciones", obs.value); contar(); });
  contar();

  // Resumen de la evaluación.
  const cifras = el("div", { clase: "resumen__cifras" });
  const mapa = el("div", { clase: "resumen__mapa" });
  const celdas = p.items.map(it => {
    const puntos = el("span", { clase: "celda__puntos" }, ev.criterios.map(() => el("i")));
    const celda = el("a", { clase: "celda", href: `#item-${it.numero}`, title: `Ítem ${it.numero}` }, [el("span", { texto: String(it.numero) }), puntos]);
    mapa.append(celda);
    return { it, celda, puntos };
  });
  const refrescar = () => {
    const evaluados = p.items.filter(it => estado.itemCompleto(it)).length;
    const observados = p.items.filter(it => estado.itemObservado(it)).length;
    const sugerencias = Object.values(estado.datos.sugerencias).filter(s => s.trim()).length;
    cifras.replaceChildren(...[[`${evaluados}/${p.items.length}`, "ítems evaluados"], [observados, "ítems con observación"], [sugerencias, "sugerencias escritas"]]
      .map(([n, t]) => el("div", { clase: "resumen__cifra" }, [el("strong", { texto: String(n) }), el("span", { texto: t })])));
    for (const { it, celda, puntos } of celdas) {
      ev.criterios.forEach((c, i) => {
        const v = estado.respuesta(it, c.clave);
        const polo = v === null ? "" : ev.escala.find(e => e.valor === v)?.polo || "";
        puntos.children[i].className = polo;
      });
      celda.classList.toggle("con-sugerencia", !!estado.datos.sugerencias[it.numero]?.trim());
      celda.setAttribute("aria-label", `Ítem ${it.numero}: ${estado.itemCompleto(it) ? (estado.itemObservado(it) ? "con observación" : "evaluado") : "pendiente"}`);
    }
  };

  const leyenda = el("div", { clase: "resumen__leyenda" }, [
    el("span", {}, [el("i", { style: "background:var(--ok)" }), ev.escala.find(e => e.polo === "alto").etiqueta]),
    el("span", {}, [el("i", { style: "background:var(--mal)" }), ev.escala.find(e => e.polo === "bajo").etiqueta]),
    el("span", {}, [el("i", { style: "background:var(--superficie-3); border:1px solid var(--borde-fuerte)" }), "Pendiente"]),
    el("span", {}, [el("i", { style: "background:var(--aviso); border-radius:2px; height:3px; width:12px" }), "Con sugerencia"]),
    el("span", { texto: `Cada punto: ${ev.criterios.map(c => c.nombre.toLowerCase()).join(", ")}` }),
  ]);

  const nodo = el("section", { clase: "seccion", id: "valoracion", "aria-labelledby": "titulo-seccion-3" }, [
    cabeceraSeccion(3, "Valoración global", "Indique su opinión sobre la aplicabilidad del instrumento y, si lo desea, agregue observaciones generales."),
    el("h3", { clase: "panel-tarjeta__titulo", texto: "Opinión de aplicabilidad", style: "margin-bottom:12px" }),
    opciones,
    el("div", { clase: "panel-tarjeta tarjeta" }, [
      el("label", { clase: "panel-tarjeta__titulo", for: "observaciones", texto: "Observaciones generales", style: "display:block" }),
      el("p", { clase: "panel-tarjeta__entrada", texto: "Opcional. Aparecerán en el certificado junto con la suficiencia de cada dimensión." }),
      obs, contador,
    ]),
    el("div", { clase: "panel-tarjeta tarjeta" }, [
      el("h3", { clase: "panel-tarjeta__titulo", texto: "Resumen de su evaluación" }),
      el("p", { clase: "panel-tarjeta__entrada", texto: "Toque un ítem para revisarlo." }),
      cifras, mapa, leyenda,
    ]),
  ]);
  return { nodo, refrescar };
}

/* ---------------------------------------------------------- 4. Firma y envío */
export function seccionFirma(p, estado, experto) {
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
    el("span", { clase: "lienzo-firma__vacio", texto: "Firme aquí con el dedo, el lápiz o el mouse" }),
  ]);
  const subir = el("input", { type: "file", accept: "image/*", id: "subir-firma", hidden: true });
  const barra = el("div", { clase: "firma__barra" }, [
    el("span", { clase: "campo__ayuda", texto: "También puede subir una foto o escaneo de su firma sobre papel blanco." }),
    el("div", { clase: "botones" }, [
      el("button", { type: "button", clase: "boton boton--secundario boton--chico", dataset: { firma: "deshacer" } }, [icono("undo"), "Deshacer"]),
      el("button", { type: "button", clase: "boton boton--secundario boton--chico", dataset: { firma: "borrar" } }, [icono("trash"), "Borrar"]),
      el("label", { clase: "boton boton--secundario boton--chico", for: "subir-firma" }, [icono("upload"), "Subir imagen"]),
      subir,
    ]),
  ]);

  const declaracion = el("input", { type: "checkbox", id: "casilla-declaracion" });
  declaracion.checked = !!estado.datos.declaracion;
  const etiquetaDeclaracion = el("label", { clase: "declaracion", id: "declaracion", for: "casilla-declaracion" }, [
    declaracion,
    el("span", { texto: `Declaro que he revisado el instrumento y que esta evaluación refleja mi juicio profesional. Autorizo su uso con fines académicos en la investigación «${plano(p.investigacion.titulo)}».` }),
  ]);
  declaracion.addEventListener("change", () => { estado.fijar("declaracion", declaracion.checked); etiquetaDeclaracion.classList.remove("falta"); });

  const faltantes = el("div", { clase: "faltantes aviso aviso--aviso", hidden: true, role: "alert" });
  const error = el("div", { clase: "aviso aviso--mal", hidden: true, role: "alert", style: "margin-top:14px" });
  const generar = el("button", { type: "button", clase: "boton boton--grande boton--bloque", id: "generar" }, [icono("file"), "Generar certificado firmado (PDF)"]);
  const exito = el("div", { clase: "exito tarjeta", id: "exito", hidden: true, tabindex: "-1" });

  const nodo = el("section", { clase: "seccion", id: "firma-envio", "aria-labelledby": "titulo-seccion-4" }, [
    cabeceraSeccion(4, "Datos del validador y firma", "Con estos datos se completa el certificado de validez de contenido. El documento de identidad solo aparece en el PDF."),
    el("div", { clase: "panel-tarjeta tarjeta" }, [
      el("h3", { clase: "panel-tarjeta__titulo", texto: "Datos del juez validador" }),
      el("p", { clase: "panel-tarjeta__entrada", texto: experto ? "Precargamos sus datos; corríjalos si es necesario." : "Complete sus datos tal como deben figurar en el certificado." }),
      el("div", { clase: "rejilla-campos" }, [
        campo("campo-grado", "Grado académico", grado),
        campo("campo-documento", ev.documento_identidad.nombre, documento, "No se guarda fuera de su dispositivo."),
        campo("campo-nombre", "Apellidos y nombres", nombre, null, true),
        campo("campo-especialidad", "Especialidad", especialidad, null, true),
      ]),
    ]),
    el("div", { clase: "panel-tarjeta tarjeta" }, [
      el("h3", { clase: "panel-tarjeta__titulo", texto: "Firma" }),
      el("p", { clase: "panel-tarjeta__entrada", texto: "Su firma se insertará en el certificado sobre la línea «" + p.certificado.etiqueta_firma + "»." }),
      recuadro, barra,
    ]),
    el("div", { clase: "panel-tarjeta tarjeta" }, [
      etiquetaDeclaracion,
      el("div", { style: "margin-top:16px" }, [generar]),
      el("p", { clase: "campo__ayuda", style: "text-align:center; margin:10px 0 0", texto: "El PDF se genera en su dispositivo y se descarga de inmediato." }),
      faltantes, error,
    ]),
    exito,
  ]);
  return { nodo, lienzo, recuadro, subir, generar, faltantes, error, exito, etiquetaDeclaracion };
}

/* ------------------------------------------------------------------- Pie */
export function pie(p) {
  const c = p.contacto || {};
  return el("footer", { clase: "pie" }, el("div", { clase: "pie__marco" }, [
    el("p", {}, [el("strong", { texto: "¿Consultas? " }), `Escriba a ${c.nombre || p.investigacion.autor}`,
      c.whatsapp ? [" por ", el("a", { href: `https://wa.me/${c.whatsapp}`, target: "_blank", rel: "noopener", texto: "WhatsApp" })] : "",
      c.correo ? [" o a ", el("a", { href: `mailto:${c.correo}`, texto: c.correo })] : "", "."].flat()),
    el("p", { texto: `${p.institucion?.nombre || ""}${p.institucion?.unidad ? ` · ${p.institucion.unidad}` : ""}${p.actualizado ? ` · Expediente actualizado el ${p.actualizado.split("-").reverse().join("/")}` : ""}` }),
  ]));
}

export function barraMovil() {
  return el("div", { clase: "barra-movil", id: "barra-movil" }, el("div", { clase: "barra-movil__marco" }, [
    el("div", { clase: "barra-movil__progreso" }, [
      el("div", { clase: "barra-movil__pista", "aria-hidden": "true" }, el("span", { id: "barra-movil-relleno" })),
      el("div", { clase: "barra-movil__texto", id: "barra-movil-texto", "aria-live": "polite" }),
    ]),
    el("button", { type: "button", clase: "boton", id: "barra-movil-boton", dataset: { siguiente: "" } }, [el("span", { texto: "Siguiente" }), icono("arrow")]),
  ]));
}
