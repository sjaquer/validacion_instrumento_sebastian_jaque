// Estado de la evaluación: respuestas, sugerencias, datos del juez y firma.
// Se guarda en el navegador del experto (localStorage) y nunca sale de su dispositivo,
// salvo dentro del PDF que él mismo descarga y envía.

import { almacen, debounce } from "./util.js";

const VERSION = 1;

export class Estado {
  constructor(proyecto, experto) {
    this.proyecto = proyecto;
    this.experto = experto;
    this.clave = `validacion:${proyecto.id}:${experto ? experto.clave : "general"}:v${VERSION}`;
    this.oyentes = new Set();
    this.datos = this.vacio();
    this.restaurado = null;
    this.guardarLuego = debounce(() => this.guardar(), 350);
  }

  vacio() {
    const e = this.experto;
    return {
      version: VERSION,
      actualizado: null,
      respuestas: {},      // { [n.° de ítem]: { [clave de criterio]: valor } }
      sugerencias: {},     // { [n.° de ítem]: texto }
      huellas: {},         // { [n.° de ítem]: huella del texto evaluado }
      suficiencia: {},     // { [n.° de dimensión]: { v: valor, obs: texto } }
      aplicabilidad: null,
      observaciones: "",
      juez: {
        grado: e?.grado || this.proyecto.evaluacion.grados[0]?.valor || "",
        nombre: e?.nombre || "",
        documento: "",
        especialidad: e?.especialidad || "",
      },
      firma: null,         // { imagen: dataURL, trazos: [...] | null }
      declaracion: false,
      generado: null,      // fecha del último PDF generado
    };
  }

  /** Recupera el avance guardado; descarta respuestas de ítems cuyo texto cambió desde entonces. */
  restaurar() {
    const guardado = almacen.leer(this.clave);
    if (!guardado || guardado.version !== VERSION) return null;
    const base = this.vacio();
    const datos = { ...base, ...guardado, juez: { ...base.juez, ...guardado.juez } };
    let descartados = 0;
    for (const it of this.proyecto.items) {
      const h = datos.huellas[it.numero];
      if (h && h !== it.huella) {
        delete datos.respuestas[it.numero];
        delete datos.sugerencias[it.numero];
        descartados++;
      }
    }
    for (const n of Object.keys(datos.respuestas)) {
      if (!this.proyecto.items.some(it => String(it.numero) === n)) delete datos.respuestas[n];
    }
    this.datos = datos;
    this.restaurado = { fecha: guardado.actualizado ? new Date(guardado.actualizado) : null, descartados };
    return this.restaurado;
  }

  guardar() {
    this.datos.actualizado = new Date().toISOString();
    const ok = almacen.escribir(this.clave, this.datos);
    this.emitir({ tipo: "guardado", ok });
  }

  reiniciar() {
    almacen.borrar(this.clave);
    this.datos = this.vacio();
    this.restaurado = null;
  }

  alCambiar(fn) { this.oyentes.add(fn); return () => this.oyentes.delete(fn); }
  emitir(evento) { for (const fn of this.oyentes) fn(evento); }

  cambio(evento) {
    this.emitir({ tipo: "cambio", ...evento });
    this.guardarLuego();
  }

  // --- Escritura ---
  responder(item, criterio, valor) {
    const r = (this.datos.respuestas[item.numero] ||= {});
    r[criterio] = valor;
    this.datos.huellas[item.numero] = item.huella;
    this.cambio({ campo: "respuesta", item: item.numero });
  }
  sugerir(item, texto) {
    if (texto.trim()) this.datos.sugerencias[item.numero] = texto; else delete this.datos.sugerencias[item.numero];
    this.datos.huellas[item.numero] = item.huella;
    this.cambio({ campo: "sugerencia", item: item.numero });
  }
  suficiencia(dimension, cambios) {
    this.datos.suficiencia[dimension.numero] = { ...this.datos.suficiencia[dimension.numero], ...cambios };
    this.cambio({ campo: "suficiencia", dimension: dimension.numero });
  }
  fijar(campo, valor) {
    this.datos[campo] = valor;
    this.cambio({ campo });
  }
  juez(campo, valor) {
    this.datos.juez[campo] = valor;
    this.cambio({ campo: "juez" });
  }

  // --- Lectura ---
  respuesta(item, criterio) { return this.datos.respuestas[item.numero]?.[criterio] ?? null; }
  itemCompleto(item) { return this.proyecto.evaluacion.criterios.every(c => this.respuesta(item, c.clave) !== null); }
  itemObservado(item) {
    const { min } = this.proyecto.evaluacion.rango;
    return this.proyecto.evaluacion.criterios.some(c => this.respuesta(item, c.clave) === min);
  }
  dimensionCompleta(d) {
    const suf = !this.proyecto.evaluacion.suficiencia.activa || this.datos.suficiencia[d.numero]?.v != null;
    return suf && d.items.every(it => this.itemCompleto(it));
  }

  /** Avance: respuestas dadas sobre el total (criterios × ítems + suficiencia por dimensión). */
  avance() {
    const { criterios, suficiencia } = this.proyecto.evaluacion;
    const total = this.proyecto.items.length * criterios.length + (suficiencia.activa ? this.proyecto.dimensiones.length : 0);
    let hechas = 0;
    for (const it of this.proyecto.items) for (const c of criterios) if (this.respuesta(it, c.clave) !== null) hechas++;
    if (suficiencia.activa) for (const d of this.proyecto.dimensiones) if (this.datos.suficiencia[d.numero]?.v != null) hechas++;
    return { hechas, total, porcentaje: total ? Math.round((100 * hechas) / total) : 0 };
  }

  /** Lo que falta para generar el certificado, en orden de aparición. */
  pendientes() {
    const p = this.proyecto;
    const faltan = [];
    for (const d of p.dimensiones) {
      for (const it of d.items) if (!this.itemCompleto(it)) faltan.push({ id: `item-${it.numero}`, texto: `Ítem ${it.numero}`, grupo: "items" });
      if (p.evaluacion.suficiencia.activa && this.datos.suficiencia[d.numero]?.v == null) {
        faltan.push({ id: `suficiencia-${d.numero}`, texto: `Suficiencia de la dimensión ${d.numero}`, grupo: "items" });
      }
    }
    if (!this.datos.aplicabilidad) faltan.push({ id: "aplicabilidad", texto: "Opinión de aplicabilidad" });
    const j = this.datos.juez;
    if (!j.nombre.trim()) faltan.push({ id: "campo-nombre", texto: "Apellidos y nombres" });
    if (!new RegExp(p.evaluacion.documento_identidad.patron).test(j.documento.trim())) {
      faltan.push({ id: "campo-documento", texto: `${p.evaluacion.documento_identidad.nombre} válido` });
    }
    if (!j.especialidad.trim()) faltan.push({ id: "campo-especialidad", texto: "Especialidad" });
    if (!this.datos.firma?.imagen) faltan.push({ id: "lienzo-firma", texto: "Firma" });
    if (!this.datos.declaracion) faltan.push({ id: "declaracion", texto: "Declaración de conformidad" });
    return faltan;
  }

  /** Siguiente ítem o suficiencia sin responder (para el botón «Siguiente pendiente»). */
  siguientePendiente() {
    return this.pendientes()[0] || null;
  }
}
