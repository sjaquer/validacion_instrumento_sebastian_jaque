// Recuadro de firma: trazos suavizados con el dedo, el lápiz o el mouse.
// Los trazos se guardan en coordenadas relativas a la altura del recuadro (x medida desde el centro),
// así la firma se vuelve a dibujar nítida y sin deformarse al girar el teléfono o cambiar el tamaño
// de la ventana, y se puede deshacer trazo por trazo.

const TINTA = "#0f1b3d";
const ANCHO_EXPORTACION = 900;

export class PanelFirma {
  constructor(lienzo, { alCambiar } = {}) {
    this.lienzo = lienzo;
    this.ctx = lienzo.getContext("2d");
    this.alCambiar = alCambiar || (() => {});
    this.trazos = [];          // [[{x, y, p}], …] en unidades de la altura del recuadro
    this.imagen = null;        // firma subida como imagen (HTMLImageElement)
    this.actual = null;
    this.ajustar = this.ajustar.bind(this);
    this.conectar();
    new ResizeObserver(this.ajustar).observe(lienzo);
  }

  get vacia() { return !this.trazos.length && !this.imagen; }

  conectar() {
    const l = this.lienzo;
    l.addEventListener("pointerdown", e => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      l.setPointerCapture(e.pointerId);
      this.actual = [this.punto(e)];
      this.trazos.push(this.actual);
      this.dibujar();
    });
    l.addEventListener("pointermove", e => {
      if (!this.actual) return;
      e.preventDefault();
      const eventos = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of eventos) this.actual.push(this.punto(ev));
      this.dibujar();
    });
    const terminar = () => {
      if (!this.actual) return;
      this.actual = null;
      this.alCambiar(this.exportar());
    };
    l.addEventListener("pointerup", terminar);
    l.addEventListener("pointercancel", terminar);
    l.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") terminar(); });
  }

  punto(e) {
    const r = this.lienzo.getBoundingClientRect();
    const presion = e.pointerType === "pen" && e.pressure ? e.pressure : 0.5;
    return { x: (e.clientX - r.left - r.width / 2) / r.height, y: (e.clientY - r.top) / r.height, p: presion };
  }

  ajustar() {
    const r = this.lienzo.getBoundingClientRect();
    if (!r.width) return;
    const escala = Math.min(window.devicePixelRatio || 1, 3);
    const ancho = Math.round(r.width * escala), alto = Math.round(r.height * escala);
    if (this.lienzo.width !== ancho || this.lienzo.height !== alto) {
      this.lienzo.width = ancho;
      this.lienzo.height = alto;
    }
    this.dibujar();
  }

  /** Dibuja en cualquier contexto (el lienzo visible o el de exportación). */
  pintar(ctx, ancho, alto) {
    ctx.clearRect(0, 0, ancho, alto);
    if (this.imagen) {
      const margen = alto * 0.08;
      const f = Math.min((ancho - 2 * margen) / this.imagen.width, (alto - 2 * margen) / this.imagen.height);
      const w = this.imagen.width * f, h = this.imagen.height * f;
      ctx.drawImage(this.imagen, (ancho - w) / 2, (alto - h) / 2, w, h);
    }
    const grosor = Math.max(1.6, Math.min(ancho, alto * 3) / 260);
    ctx.strokeStyle = TINTA;
    ctx.fillStyle = TINTA;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const trazo of this.trazos) {
      const pts = trazo.map(q => ({ x: ancho / 2 + q.x * alto, y: q.y * alto, p: q.p }));
      if (pts.length === 1) {
        ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, grosor * 0.6, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      ctx.lineWidth = grosor * (0.7 + pts[0].p * 0.6);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      // Curvas cuadráticas entre puntos medios: trazo continuo y sin quiebres.
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const ultimo = pts[pts.length - 1];
      ctx.lineTo(ultimo.x, ultimo.y);
      ctx.stroke();
    }
  }

  dibujar() {
    this.pintar(this.ctx, this.lienzo.width, this.lienzo.height);
    this.lienzo.closest(".lienzo-firma")?.classList.toggle("activo", !this.vacia);
    const vacio = this.lienzo.parentElement.querySelector(".lienzo-firma__vacio");
    if (vacio) vacio.hidden = !this.vacia;
  }

  deshacer() {
    if (this.trazos.length) this.trazos.pop(); else this.imagen = null;
    this.dibujar();
    this.alCambiar(this.exportar());
  }

  borrar() {
    this.trazos = [];
    this.imagen = null;
    this.dibujar();
    this.alCambiar(null);
  }

  /** Firma en PNG con fondo transparente, recortada a su contenido, más los trazos para restaurarla. */
  exportar() {
    if (this.vacia) return null;
    const r = this.lienzo.getBoundingClientRect();
    const proporcion = r.width && r.height ? r.height / r.width : 0.3;
    const lienzo = document.createElement("canvas");
    lienzo.width = ANCHO_EXPORTACION;
    lienzo.height = Math.round(ANCHO_EXPORTACION * proporcion);
    this.pintar(lienzo.getContext("2d"), lienzo.width, lienzo.height);
    const recorte = recortar(lienzo);
    return {
      imagen: recorte.toDataURL("image/png"),
      trazos: this.imagen ? null : this.trazos.map(t => t.map(q => ({ x: +q.x.toFixed(4), y: +q.y.toFixed(4), p: +q.p.toFixed(2) }))),
      origen: this.imagen ? "imagen" : "trazo",
    };
  }

  /** Restaura una firma guardada (trazos) o carga una imagen (dataURL). */
  async cargar(firma) {
    if (!firma) return;
    if (firma.trazos?.length) {
      this.trazos = firma.trazos;
      this.imagen = null;
    } else if (firma.imagen) {
      this.imagen = await cargarImagen(firma.imagen);
      this.trazos = [];
    }
    this.dibujar();
  }

  /** Firma escaneada o fotografiada: se aclara el fondo para que solo quede la tinta. */
  async subir(archivo) {
    const url = await new Promise((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(lector.result);
      lector.onerror = mal;
      lector.readAsDataURL(archivo);
    });
    const img = await cargarImagen(url);
    this.imagen = await cargarImagen(quitarFondo(img));
    this.trazos = [];
    this.dibujar();
    this.alCambiar(this.exportar());
  }
}

function cargarImagen(src) {
  return new Promise((ok, mal) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => mal(new Error("No se pudo leer la imagen de la firma."));
    img.src = src;
  });
}

function quitarFondo(img) {
  const max = 1400;
  const f = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * f);
  c.height = Math.round(img.height * f);
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const datos = ctx.getImageData(0, 0, c.width, c.height);
  const px = datos.data;
  for (let i = 0; i < px.length; i += 4) {
    const luz = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    // Claro → transparente; oscuro → tinta, con transición suave en los bordes.
    const alfa = Math.max(0, Math.min(1, (200 - luz) / 90));
    px[i + 3] = Math.round(px[i + 3] * alfa);
  }
  ctx.putImageData(datos, 0, 0);
  return recortar(c).toDataURL("image/png");
}

/** Recorta los márgenes transparentes de un lienzo (deja un pequeño borde). */
function recortar(lienzo) {
  const ctx = lienzo.getContext("2d");
  const { width: w, height: h } = lienzo;
  const px = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return lienzo;
  const borde = 12;
  x0 = Math.max(0, x0 - borde); y0 = Math.max(0, y0 - borde);
  x1 = Math.min(w - 1, x1 + borde); y1 = Math.min(h - 1, y1 + borde);
  const salida = document.createElement("canvas");
  salida.width = x1 - x0 + 1;
  salida.height = y1 - y0 + 1;
  salida.getContext("2d").drawImage(lienzo, x0, y0, salida.width, salida.height, 0, 0, salida.width, salida.height);
  return salida;
}
