// Punto de entrada: carga el proyecto, monta la interfaz y conecta la navegación,
// el progreso, la firma y la generación del certificado.
//
// Enlaces: ?e=<clave del experto>  (proyecto predeterminado de proyectos/index.json)
//          ?p=<id del proyecto>&e=<clave del experto>

import { $, $$, el, icono, plano, nombreArchivo, horaCorta } from "./util.js";
import { resolverProyecto, cargarProyecto, buscarExperto, ErrorProyecto } from "./datos.js";
import { Estado } from "./estado.js";
import { PanelFirma } from "./firma.js";
import { generarCertificado } from "./certificado.js";
import * as vista from "./vista.js";

const parametros = new URLSearchParams(location.search);
const app = $("#app");

iniciar();

async function iniciar() {
  try {
    inicializarAccesibilidad();
    const id = await resolverProyecto(parametros);
    const proyecto = await cargarProyecto(id);
    const clave = (parametros.get("e") || "").trim().toLowerCase();
    const experto = buscarExperto(proyecto, clave);
    aplicarTema(proyecto);
    const estado = new Estado(proyecto, experto);
    estado.restaurar();
    montar(proyecto, experto, estado, { claveDesconocida: clave && !experto });
  } catch (e) {
    if (!(e instanceof ErrorProyecto)) console.error(e);
    mostrarError(e);
  }
}

function inicializarAccesibilidad() {
  const raiz = document.documentElement;

  // 1. Control de tema (Auto / Claro / Oscuro)
  const botonTema = $("#boton-tema");
  const iconoTema = $("#icono-tema use");
  const textoTema = $("#texto-tema");
  const temaGuardado = localStorage.getItem("tema_preferido") || "auto";

  function aplicarModoTema(modo) {
    if (modo === "claro") {
      raiz.setAttribute("data-tema", "light");
      if (textoTema) textoTema.textContent = "Claro";
      if (iconoTema) iconoTema.setAttribute("href", "#i-sun");
      $('meta[name="theme-color"]')?.setAttribute("content", "#0f3c6e");
    } else if (modo === "oscuro") {
      raiz.setAttribute("data-tema", "dark");
      if (textoTema) textoTema.textContent = "Oscuro";
      if (iconoTema) iconoTema.setAttribute("href", "#i-moon");
      $('meta[name="theme-color"]')?.setAttribute("content", "#091322");
    } else {
      raiz.removeAttribute("data-tema");
      if (textoTema) textoTema.textContent = "Auto";
      if (iconoTema) iconoTema.setAttribute("href", "#i-contrast");
      const esOscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
      $('meta[name="theme-color"]')?.setAttribute("content", esOscuro ? "#091322" : "#0f3c6e");
    }
    localStorage.setItem("tema_preferido", modo);
  }

  aplicarModoTema(temaGuardado);

  if (botonTema) {
    botonTema.addEventListener("click", () => {
      const actual = localStorage.getItem("tema_preferido") || "auto";
      const siguiente = actual === "auto" ? "claro" : actual === "claro" ? "oscuro" : "auto";
      aplicarModoTema(siguiente);
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem("tema_preferido") || "auto") === "auto") {
      aplicarModoTema("auto");
    }
  });

  // 2. Control de tamaño de letra (Normal / Grande / Extra)
  const botonFuente = $("#boton-fuente");
  const textoFuente = $("#texto-fuente");
  const fuenteGuardada = localStorage.getItem("tamano_fuente") || "normal";

  function aplicarModoFuente(tamano) {
    if (tamano === "grande") {
      raiz.setAttribute("data-fuente", "grande");
      if (textoFuente) textoFuente.textContent = "Letra grande";
    } else if (tamano === "muy-grande") {
      raiz.setAttribute("data-fuente", "muy-grande");
      if (textoFuente) textoFuente.textContent = "Letra extra";
    } else {
      raiz.removeAttribute("data-fuente");
      if (textoFuente) textoFuente.textContent = "Letra normal";
    }
    localStorage.setItem("tamano_fuente", tamano);
  }

  aplicarModoFuente(fuenteGuardada);

  if (botonFuente) {
    botonFuente.addEventListener("click", () => {
      const actual = localStorage.getItem("tamano_fuente") || "normal";
      const siguiente = actual === "normal" ? "grande" : actual === "grande" ? "muy-grande" : "normal";
      aplicarModoFuente(siguiente);
    });
  }
}

function aplicarTema(p) {
  const raiz = document.documentElement;
  if (/^#[0-9a-f]{6}$/i.test(p.tema?.acento || "")) {
    raiz.style.setProperty("--acento", p.tema.acento);
  }
  const inst = p.institucion || {};
  document.title = `Validación del instrumento · ${inst.siglas || inst.nombre || plano(p.investigacion.titulo)}`;
  $("#marca-institucion").textContent = inst.nombre || "Validación por juicio de expertos";
  $("#marca-unidad").textContent = "Validación por juicio de expertos";
  if (inst.logo) {
    const logo = $("#marca-logo");
    logo.src = p.base + inst.logo;
    logo.alt = inst.siglas || "";
    logo.hidden = false;
  }
}

function mostrarError(e) {
  const conocido = e instanceof ErrorProyecto;
  app.removeAttribute("aria-busy");
  app.replaceChildren(el("div", { clase: "estado-pagina tarjeta" }, [
    el("div", { clase: "estado-pagina__icono" }, [icono("alert")]),
    el("h1", { texto: conocido ? e.message : "No se pudo abrir la validación" }),
    el("p", { texto: conocido ? e.detalle : "Ocurrió un error inesperado. Vuelva a cargar la página; si el problema continúa, comuníquese con el investigador." }),
    el("div", { clase: "botones", style: "justify-content:center; margin-top:18px" }, [
      el("button", { type: "button", clase: "boton", on: { click: () => location.reload() } }, [icono("refresh"), "Volver a cargar"]),
    ]),
  ]));
}

/* ------------------------------------------------------------------------- */
function montar(p, experto, estado, { claveDesconocida }) {
  const indice = vista.indice(p);
  const evaluacion = vista.seccionEvaluacion(p, estado);
  const valoracion = vista.seccionValoracion(p, estado);
  const firma = vista.seccionFirma(p, estado, experto);
  const avisos = el("div", { clase: "avisos", style: "display:grid; gap:10px; padding-top:28px" });

  const contenido = el("main", { clase: "contenido", id: "contenido", tabindex: "-1" }, [
    avisos,
    vista.pasos(p),
    vista.seccionExpediente(p, experto),
    evaluacion.nodo,
    valoracion.nodo,
    firma.nodo,
  ]);
  const fondo = el("div", { clase: "fondo-cajon", "aria-hidden": "true" });
  const notificacion = el("div", { clase: "notificacion", role: "status", "aria-live": "polite" });

  app.replaceChildren(
    vista.portada(p, experto),
    el("div", { clase: "disposicion" }, [indice, contenido]),
    vista.pie(p),
    vista.barraMovil(),
    fondo,
    notificacion,
  );
  app.removeAttribute("aria-busy");

  if (p.estado === "cerrado") {
    document.body.classList.add("cerrado");
    avisos.append(aviso("aviso--aviso", "lock", "Esta validación ya cerró.", "La recepción de certificados terminó. Si necesita enviar el suyo, comuníquese con el investigador."));
  }
  if (claveDesconocida) {
    avisos.append(aviso("aviso--aviso", "alert", "No reconocimos su enlace personal.", "Puede completar la validación igualmente: escriba sus datos en el paso 4."));
  }
  mostrarRestauracion(p, estado, avisos);

  const refrescar = () => { evaluacion.refrescar(); valoracion.refrescar(); actualizarProgreso(p, estado); };
  estado.alCambiar(evento => {
    if (evento.tipo === "cambio") refrescar();
    if (evento.tipo === "guardado") indicarGuardado(evento.ok);
  });
  refrescar();

  conectarIndice(indice, fondo);
  conectarSeguimiento(p);
  conectarSiguiente(estado);
  conectarFirma(p, experto, estado, firma, notificacion);
}

function aviso(clase, nombreIcono, titulo, texto, extra = null) {
  return el("div", { clase: `aviso ${clase}` }, [icono(nombreIcono), el("div", {}, [el("p", { style: "margin:0" }, [el("strong", { texto: titulo }), " ", texto]), extra])]);
}

function mostrarRestauracion(p, estado, avisos) {
  const r = estado.restaurado;
  if (!r) return;
  const { porcentaje, hechas } = estado.avance();
  if (!hechas && !estado.datos.firma) return;
  const cuando = r.fecha ? `${r.fecha.toLocaleDateString("es-PE")} a las ${horaCorta(r.fecha)}` : "su última visita";
  const boton = el("button", { type: "button", clase: "boton-enlace", style: "padding:0" }, [icono("refresh"), "Empezar de nuevo"]);
  let confirmar = false;
  boton.addEventListener("click", () => {
    if (!confirmar) {
      confirmar = true;
      boton.lastChild.textContent = "Confirmar: borrar mis respuestas";
      boton.style.color = "var(--mal)";
      setTimeout(() => { confirmar = false; boton.lastChild.textContent = "Empezar de nuevo"; boton.style.color = ""; }, 5000);
      return;
    }
    estado.reiniciar();
    location.reload();
  });
  const texto = `Retomamos lo que avanzó el ${cuando} (${porcentaje} %).${r.descartados ? ` ${r.descartados} ${r.descartados === 1 ? "ítem cambió" : "ítems cambiaron"} desde entonces y debe${r.descartados === 1 ? "" : "n"} evaluarse de nuevo.` : ""}`;
  avisos.append(aviso("aviso--acento", "check-circle", "Bienvenido de nuevo.", texto, el("div", { style: "margin-top:6px" }, boton)));
}

let temporizadorGuardado;
function indicarGuardado(ok) {
  const nodo = $("#indicador-guardado");
  nodo.hidden = false;
  nodo.style.color = ok ? "" : "var(--aviso)";
  nodo.querySelector("span").textContent = ok ? "Guardado" : "Sin guardar en este dispositivo";
  clearTimeout(temporizadorGuardado);
  if (ok) temporizadorGuardado = setTimeout(() => { nodo.hidden = true; }, 2200);
}

function actualizarProgreso(p, estado) {
  const { hechas, total, porcentaje } = estado.avance();
  const texto = `${hechas} de ${total} respuestas`;
  $("#barra-relleno").style.width = `${porcentaje}%`;
  $("#pildora-progreso").hidden = false;
  $("#pildora-valor").textContent = `${porcentaje} %`;
  $("#barra-movil-relleno").style.width = `${porcentaje}%`;
  const anillo = $(".anillo");
  anillo.style.setProperty("--p", porcentaje);
  anillo.querySelector("span").textContent = `${porcentaje} %`;
  $("#indice-texto-avance").textContent = texto;

  const faltan = estado.pendientes();
  const faltanItems = faltan.filter(f => f.grupo === "items").length;
  $("#barra-movil-texto").textContent = faltanItems ? `${texto} · faltan ${faltanItems}` : faltan.length ? "Ítems completos · falta firmar" : "Todo listo para generar el certificado";
  const boton = $("#barra-movil-boton");
  boton.firstChild.textContent = faltanItems ? "Siguiente" : faltan.length ? "Completar" : "Generar PDF";

  for (const d of p.dimensiones) {
    const enlace = $(`.indice a[data-dimension="${d.numero}"]`);
    const hechos = d.items.filter(it => estado.itemCompleto(it)).length;
    enlace.querySelector(".indice__cuenta").textContent = `${hechos}/${d.items.length}`;
    enlace.classList.toggle("completo", estado.dimensionCompleta(d));
  }
  $('.indice a[data-seccion="evaluacion"]').classList.toggle("completo", p.dimensiones.every(d => estado.dimensionCompleta(d)));
  $('.indice a[data-seccion="valoracion"]').classList.toggle("completo", !!estado.datos.aplicabilidad);
  $('.indice a[data-seccion="firma-envio"]').classList.toggle("completo", !faltan.length);
}

/* ------------------------------------------------------------ Navegación */
function conectarIndice(indice, fondo) {
  const abrir = $("#abrir-indice");
  const pantallaChica = () => window.matchMedia("(max-width: 1079px)").matches;
  const fijar = abierto => {
    indice.classList.toggle("abierto", abierto);
    fondo.classList.toggle("abierto", abierto);
    abrir.setAttribute("aria-expanded", String(abierto));
    document.body.style.overflow = abierto ? "hidden" : "";
    if (abierto) indice.querySelector("a, button")?.focus();
  };
  abrir.addEventListener("click", () => fijar(true));
  fondo.addEventListener("click", () => fijar(false));
  indice.addEventListener("click", e => {
    if (e.target.closest("[data-cerrar-indice]") || (e.target.closest("a, [data-siguiente]") && pantallaChica())) fijar(false);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && indice.classList.contains("abierto")) { fijar(false); abrir.focus(); } });
}

/** Resalta en el índice la sección o dimensión visible. */
function conectarSeguimiento(p) {
  const objetivos = [
    ...["expediente", "evaluacion", "valoracion", "firma-envio"].map(id => ({ nodo: document.getElementById(id), enlace: $(`.indice a[data-seccion="${id}"]`) })),
    ...p.dimensiones.map(d => ({ nodo: document.getElementById(`dimension-${d.numero}`), enlace: $(`.indice a[data-dimension="${d.numero}"]`), padre: $('.indice a[data-seccion="evaluacion"]') })),
  ];
  const visibles = new Map();
  const observador = new IntersectionObserver(entradas => {
    for (const e of entradas) visibles.set(e.target, e.isIntersecting ? e.boundingClientRect.top : null);
    const actual = objetivos.filter(o => visibles.get(o.nodo) !== null && visibles.get(o.nodo) !== undefined)
      .sort((a, b) => (b.padre ? 1 : 0) - (a.padre ? 1 : 0) || visibles.get(a.nodo) - visibles.get(b.nodo))[0];
    if (!actual) return;
    $$(".indice a.activo").forEach(a => a.classList.remove("activo"));
    actual.enlace.classList.add("activo");
    actual.padre?.classList.add("activo");
  }, { rootMargin: "-30% 0px -55% 0px" });
  objetivos.forEach(o => o.nodo && observador.observe(o.nodo));

  // La barra inferior se oculta mientras se ve la portada.
  const barra = $("#barra-movil");
  const portada = $("#inicio");
  new IntersectionObserver(([e]) => barra.classList.toggle("oculta", e.isIntersecting), { threshold: 0.35 }).observe(portada);
}

function irA(id) {
  const nodo = document.getElementById(id);
  if (!nodo) return;
  nodo.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  if (nodo.classList.contains("item") || nodo.classList.contains("suficiencia")) {
    nodo.classList.remove("resaltado");
    void nodo.offsetWidth;
    nodo.classList.add("resaltado");
    setTimeout(() => nodo.querySelector("input")?.focus({ preventScroll: true }), 450);
  } else if (/^campo-/.test(id)) {
    setTimeout(() => nodo.focus({ preventScroll: true }), 450);
  }
}

function conectarSiguiente(estado) {
  document.addEventListener("click", e => {
    if (!e.target.closest("[data-siguiente]")) return;
    const siguiente = estado.siguientePendiente();
    if (siguiente) irA(siguiente.id);
    else { irA("generar"); setTimeout(() => $("#generar").focus({ preventScroll: true }), 450); }
  });
}

/* ------------------------------------------------------- Firma y PDF */
function conectarFirma(p, experto, estado, f, notificacion) {
  const panel = new PanelFirma(f.lienzo, {
    alCambiar: firma => { estado.fijar("firma", firma); f.recuadro.classList.remove("falta"); },
  });
  panel.cargar(estado.datos.firma);
  f.nodo.addEventListener("click", e => {
    const accion = e.target.closest("[data-firma]")?.dataset.firma;
    if (accion === "deshacer") panel.deshacer();
    if (accion === "borrar") panel.borrar();
  });
  f.subir.addEventListener("change", async () => {
    const archivo = f.subir.files[0];
    f.subir.value = "";
    if (!archivo) return;
    try { await panel.subir(archivo); avisar(notificacion, "Firma cargada. Revise que se vea bien en el recuadro."); }
    catch (e) { avisar(notificacion, e.message); }
  });

  let resultado = null;
  f.generar.addEventListener("click", async () => {
    f.error.hidden = true;
    $$(".falta").forEach(n => n.classList.remove("falta"));
    const faltan = estado.pendientes();
    if (faltan.length) {
      mostrarFaltantes(f, faltan);
      return;
    }
    f.faltantes.hidden = true;
    f.generar.disabled = true;
    f.generar.lastChild.textContent = "Generando el certificado…";
    try {
      resultado = await generarCertificado(p, experto, estado);
      const apellidos = nombreArchivo(estado.datos.juez.nombre.trim().split(/\s+/).slice(-2).join(" "));
      resultado.archivo = `Certificado_Validez_${apellidos || "Experto"}.pdf`;
      resultado.doc.save(resultado.archivo);
      estado.fijar("generado", new Date().toISOString());
      mostrarExito(p, f, resultado, notificacion);
    } catch (e) {
      console.error(e);
      f.error.replaceChildren(icono("alert"), el("p", { texto: `No se pudo generar el PDF. ${e.message || ""}` }));
      f.error.hidden = false;
    } finally {
      f.generar.disabled = false;
      f.generar.lastChild.textContent = "Generar certificado firmado (PDF)";
    }
  });
}

function mostrarFaltantes(f, faltan) {
  const items = faltan.filter(x => x.grupo === "items");
  const otros = faltan.filter(x => x.grupo !== "items");
  const enlaces = [];
  if (items.length) enlaces.push({ id: items[0].id, texto: items.length === 1 ? items[0].texto : `${items.length} respuestas de la evaluación (empezando por ${items[0].texto.toLowerCase()})` });
  enlaces.push(...otros);
  f.faltantes.replaceChildren(icono("alert"), el("div", {}, [
    el("p", { style: "margin:0" }, [el("strong", { texto: "Antes de generar el certificado, complete:" })]),
    el("ul", {}, enlaces.map(x => el("li", {}, el("a", { href: `#${x.id}`, texto: x.texto, on: { click: e => { e.preventDefault(); irA(x.id); } } })))),
  ]));
  f.faltantes.hidden = false;
  for (const x of faltan) {
    const nodo = document.getElementById(x.id);
    if (!nodo) continue;
    if (nodo.matches(".item, .suficiencia, .opciones-tarjeta, .lienzo-firma, .declaracion")) nodo.classList.add("falta");
    if (nodo.matches(".control")) nodo.classList.add("invalido");
  }
  f.faltantes.scrollIntoView({ behavior: "smooth", block: "center" });
}

function mostrarExito(p, f, resultado, notificacion) {
  const c = p.contacto || {};
  const primerNombre = (c.nombre || "").split(" ")[0];
  const mensaje = `Hola${primerNombre ? `, ${primerNombre}` : ""}. Le envío mi certificado de validez de contenido firmado (${resultado.archivo}).`;
  const blob = () => resultado.doc.output("blob");
  const compartir = el("button", { type: "button", clase: "boton boton--whatsapp" }, [icono("whatsapp"), "Enviar por WhatsApp"]);
  compartir.addEventListener("click", async () => {
    const archivo = new File([blob()], resultado.archivo, { type: "application/pdf" });
    if (navigator.canShare?.({ files: [archivo] })) {
      try { await navigator.share({ files: [archivo], text: mensaje }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    // Sin hoja de compartir archivos (computadora): se abre el chat y el PDF se adjunta desde Descargas.
    window.open(`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener");
    avisar(notificacion, "Adjunte en el chat el PDF que se descargó.");
  });
  const correo = el("a", {
    clase: "boton boton--secundario",
    href: `mailto:${c.correo}?subject=${encodeURIComponent("Certificado de validez de contenido firmado")}&body=${encodeURIComponent(`${mensaje}\n\n(Adjunte el PDF descargado.)`)}`,
  }, [icono("mail"), "Enviar por correo"]);
  const ver = el("button", { type: "button", clase: "boton boton--secundario" }, [icono("eye"), "Ver PDF"]);
  ver.addEventListener("click", () => window.open(URL.createObjectURL(blob()), "_blank", "noopener"));
  const descargar = el("button", { type: "button", clase: "boton boton--secundario" }, [icono("download"), "Descargar de nuevo"]);
  descargar.addEventListener("click", () => resultado.doc.save(resultado.archivo));

  f.exito.replaceChildren(
    el("div", { clase: "exito__icono" }, [icono("check")]),
    el("h3", { texto: "¡Listo! Su certificado está firmado" }),
    el("p", { texto: `Se descargó en su dispositivo. Para terminar, envíelo a ${c.nombre || "el investigador"}.` }),
    el("span", { clase: "exito__archivo" }, [icono("file"), resultado.archivo]),
    el("div", { clase: "botones" }, [c.whatsapp ? compartir : null, c.correo ? correo : null, ver, descargar]),
    el("p", { clase: "exito__pie", texto: `Código de verificación: ${resultado.registro.codigo}. Si el archivo no se adjunta solo, búsquelo en «Descargas» (o «Archivos» en iPhone). ¡Muchas gracias por su apoyo!` }),
  );
  f.exito.hidden = false;
  f.exito.scrollIntoView({ behavior: "smooth", block: "center" });
  f.exito.focus({ preventScroll: true });
}

let temporizadorAviso;
function avisar(nodo, texto) {
  nodo.textContent = texto;
  nodo.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => nodo.classList.remove("visible"), 3800);
}
