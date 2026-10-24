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
// Recorrido guiado: una pantalla visible a la vez.
//   0 = bienvenida · 1..N = una por dimensión · N+1 = opinión final · N+2 = firma
let mostrarPantallaDe = null;

function montar(p, experto, estado, { claveDesconocida }) {
  const dims = p.variables.flatMap(v => v.dimensiones.map(d => ({ v, d })));
  const total = dims.length;
  const avisos = el("div", { clase: "avisos" });

  const inicio = vista.pantallaInicio(p, experto, avisos);
  const revisiones = dims.map(({ v, d }, i) => vista.pantallaDimension(p, estado, v, d, i, total));
  const opinion = vista.pantallaOpinion(p, estado, (total + 1) / (total + 2));
  const firma = vista.pantallaFirma(p, estado, experto);
  const pantallas = [inicio.nodo, ...revisiones.map(r => r.nodo), opinion, firma.nodo];
  const notificacion = el("div", { clase: "notificacion", role: "status", "aria-live": "polite" });

  app.replaceChildren(
    el("main", { clase: "flujo", id: "contenido", tabindex: "-1" }, pantallas),
    vista.pie(p),
    notificacion,
  );
  app.removeAttribute("aria-busy");

  let actual = 0;
  const reducido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function ir(n, { historial = true, desplazar = true, enfocar = true } = {}) {
    actual = Math.max(0, Math.min(pantallas.length - 1, n));
    pantallas.forEach((pn, i) => { pn.hidden = i !== actual; });
    for (const aviso of $$(".navegacion__aviso")) aviso.hidden = true;
    const hash = actual ? `#p${actual}` : location.pathname + location.search;
    if (historial) history.pushState({ pantalla: actual }, "", hash);
    else history.replaceState({ pantalla: actual }, "", hash);
    if (desplazar) window.scrollTo({ top: 0, behavior: "auto" });
    if (enfocar) pantallas[actual].querySelector(".pantalla__titulo")?.focus({ preventScroll: true });
  }

  // Lleva a la pantalla que contiene un elemento (se usa al señalar lo que falta).
  mostrarPantallaDe = id => {
    const nodo = document.getElementById(id);
    const idx = pantallas.findIndex(pn => pn.contains(nodo));
    if (idx >= 0 && idx !== actual) ir(idx, { desplazar: false, enfocar: false });
  };

  const faltantesEn = pantalla => estado.pendientes().filter(x => pantalla.contains(document.getElementById(x.id)));
  const primeraPendiente = () => {
    const x = estado.siguientePendiente();
    if (!x) return pantallas.length - 1;
    const idx = pantallas.findIndex(pn => pn.contains(document.getElementById(x.id)));
    return idx > 0 ? idx : 1;
  };

  function avanzar() {
    const pantalla = pantallas[actual];
    const faltan = faltantesEn(pantalla);
    if (!faltan.length) { ir(actual + 1); return; }
    for (const x of faltan) {
      const nodo = document.getElementById(x.id);
      if (nodo?.matches(".item, .suficiencia, .opciones-tarjeta")) nodo.classList.add("falta");
    }
    const aviso = pantalla.querySelector(".navegacion__aviso");
    const items = faltan.filter(x => x.id.startsWith("item-")).length;
    const otras = faltan.length - items;
    aviso.textContent = [
      items ? `Falta responder ${items === 1 ? "1 pregunta" : `${items} preguntas`}` : "",
      otras ? (faltan[faltan.length - 1].id.startsWith("suficiencia") ? "la pregunta final de esta parte" : "elegir una opción") : "",
    ].filter(Boolean).join(" y ") + ". Las marcamos en color.";
    aviso.hidden = false;
    irA(faltan[0].id);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-nav]");
    if (!b) return;
    const accion = b.dataset.nav;
    if (accion === "empezar") ir(estado.avance().hechas ? primeraPendiente() : 1);
    else if (accion === "siguiente") avanzar();
    else if (accion === "anterior") ir(actual - 1);
  });
  window.addEventListener("popstate", e => ir(e.state?.pantalla ?? 0, { historial: false }));
  $(".marca")?.addEventListener("click", e => { e.preventDefault(); ir(0); });

  const refrescar = () => {
    revisiones.forEach(r => r.refrescar());
    inicio.boton.firstChild.textContent = estado.avance().hechas ? "Continuar donde lo dejé" : "Empezar la revisión";
  };
  estado.alCambiar(evento => {
    if (evento.tipo === "cambio") refrescar();
    if (evento.tipo === "guardado") indicarGuardado(evento.ok);
  });
  refrescar();

  if (p.estado === "cerrado") {
    document.body.classList.add("cerrado");
    avisos.append(aviso("aviso--aviso", "lock", "Esta validación ya cerró.", "Si necesita enviar su certificado, comuníquese con el investigador."));
  }
  if (claveDesconocida) {
    avisos.append(aviso("aviso--aviso", "alert", "No reconocimos su enlace.", "Puede continuar igual; al final escribirá sus datos."));
  }
  mostrarRestauracion(p, estado, avisos);

  const inicial = /^#p(\d+)$/.exec(location.hash);
  ir(inicial ? Number(inicial[1]) : 0, { historial: false, enfocar: false });

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
    location.href = location.pathname + location.search;
  });
  const texto = `Lleva ${porcentaje} % avanzado.${r.descartados ? ` ${r.descartados} ${r.descartados === 1 ? "pregunta cambió" : "preguntas cambiaron"} y debe${r.descartados === 1 ? "" : "n"} responderse de nuevo.` : ""}`;
  avisos.append(aviso("aviso--acento", "check-circle", "Bienvenido de nuevo.", texto, el("div", { style: "margin-top:6px" }, boton)));
}

let temporizadorGuardado;
function indicarGuardado(ok) {
  const nodo = $("#indicador-guardado");
  if (!nodo) return;
  nodo.hidden = false;
  nodo.style.color = ok ? "" : "var(--aviso)";
  nodo.querySelector("span").textContent = ok ? "Guardado" : "Sin guardar en este dispositivo";
  clearTimeout(temporizadorGuardado);
  if (ok) temporizadorGuardado = setTimeout(() => { nodo.hidden = true; }, 2200);
}

function irA(id) {
  mostrarPantallaDe?.(id);
  setTimeout(() => {
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
  }, 60);
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
      f.generar.lastChild.textContent = "Generar mi certificado (PDF)";
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
