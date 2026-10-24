# Validación de instrumentos por juicio de expertos

Sitio estático (GitHub Pages) para que los expertos validen el contenido de un instrumento de investigación desde el celular o la computadora: leen el expediente, evalúan cada ítem, firman en pantalla y descargan el **certificado de validez de contenido en PDF**, que luego envían al investigador por WhatsApp o correo.

- **Publicado en:** <https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/>
- **Proyecto activo:** tesis «Impacto de la inteligencia artificial generativa en la productividad laboral en personal de agencias de marketing digital en Lima, 2026» (UPNW).
- **Reutilizable:** cada validación es una carpeta en `proyectos/` con un `proyecto.json`. No hay que tocar el código para validar otro instrumento.

## Enlaces personales

| Experto | Enlace |
| --- | --- |
| Mg. Sandro Antonio Vidaurrázaga Sferrazza (metodólogo) | <https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/?e=vidaurrazaga> |
| Mg. Lloy Pinedo (TI e IA) | <https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/?e=pinedo> |
| Mg. Ivette Cárdenas Marquina (talento humano y marketing) | <https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/?e=cardenas> |

Formato general: `?e=<clave del experto>` abre el proyecto predeterminado (`proyectos/index.json`); `?p=<id del proyecto>&e=<clave>` abre otro proyecto. Sin `e`, la página funciona igual y el experto escribe sus datos.

## Qué hace la página

1. **Expediente:** carta de presentación personalizada, definiciones de variables y dimensiones, matriz de operacionalización y vista previa del cuestionario; enlace al expediente en PDF.
2. **Evaluación:** cada ítem con sus criterios (por defecto pertinencia, relevancia y claridad, Sí/No), sugerencias por ítem y suficiencia por dimensión. Si el experto marca «No», la página le pide una sugerencia.
3. **Valoración global:** opinión de aplicabilidad, observaciones generales y un resumen visual de toda la evaluación.
4. **Firma y envío:** datos del juez (grado, nombre, DNI, especialidad), firma con el dedo, lápiz o mouse (o imagen escaneada), declaración de conformidad y certificado en PDF con el formato del expediente, código de verificación y pie de página.

Además: avance guardado en el dispositivo (puede cerrar y continuar), barra de progreso, botón «Siguiente pendiente», índice lateral con avance por dimensión, modo oscuro automático, diseño adaptable (desde 320 px) y accesible (teclado, lectores de pantalla, `prefers-reduced-motion`).

**Privacidad:** no hay servidor ni base de datos. Las respuestas se guardan solo en el navegador del experto y el PDF se genera en su dispositivo. El sitio no se indexa en buscadores (`robots.txt` y `noindex`).

## Estructura

```
index.html                    ← página única (carga el proyecto según el enlace)
404.html · robots.txt · .nojekyll · manifest.webmanifest
assets/
  css/app.css                 ← sistema de diseño (tokens, componentes, tema oscuro, impresión)
  js/main.js                  ← arranque, navegación, progreso, generación del PDF
  js/vista.js                 ← construcción de la interfaz a partir del proyecto
  js/datos.js                 ← carga y comprobación de proyecto.json
  js/estado.js                ← respuestas y guardado en el dispositivo
  js/firma.js                 ← recuadro de firma (trazos suavizados, deshacer, imagen)
  js/certificado.js           ← certificado en PDF (jsPDF + AutoTable)
  js/util.js                  ← utilidades
  vendor/                     ← jsPDF 2.5.1 y AutoTable 3.8.2 (copias locales, sin CDN)
  img/favicon.svg
proyectos/
  index.json                  ← proyecto predeterminado
  tesis-iag-productividad/    ← proyecto.json, logo.jpg, expedientes/*.pdf
plantilla/proyecto.json       ← punto de partida para una validación nueva
esquema/proyecto.schema.json  ← esquema JSON (autocompletado en VS Code)
herramientas/
  validar_proyecto.py         ← revisa un proyecto antes de publicarlo
  consolidar_respuestas.py    ← lee los PDF firmados y calcula la V de Aiken
docs/GUIA_NUEVA_VALIDACION.md ← paso a paso para otra investigación
.github/workflows/validar.yml ← revisión automática en cada push
```

## Uso diario

```bash
python3 -m http.server 8000                      # probar en http://localhost:8000/?e=vidaurrazaga
python3 herramientas/validar_proyecto.py         # revisar antes de publicar
git add -A && git commit -m "…" && git push      # publicar (Pages tarda 1–2 minutos)
```

El proyecto de la tesis **no se edita aquí a mano**: se genera desde el repositorio de la tesis (`~/Proyects/tesis`) con `python3 scripts/generar_validacion_web.py` y se publica con `scripts/publicar_ficha_web.sh`, que copia la carpeta a `proyectos/tesis-iag-productividad/`, la valida, hace commit y push.

## Cuando lleguen los certificados firmados

Guárdalos en una carpeta fuera de este repositorio (en la tesis: `02_Instrumento/validacion_expertos/firmadas/`) y ejecuta:

```bash
python3 herramientas/consolidar_respuestas.py ~/Proyects/tesis/02_Instrumento/validacion_expertos/firmadas/
```

Se generan `respuestas.csv`, `aiken.csv` (V de Aiken por ítem y criterio) y `resumen.md` (decisión por ítem con el umbral 0.80, suficiencia, aplicabilidad y todas las sugerencias). Los datos salen de los metadatos del PDF; el DNI no se guarda ahí.

## Publicación en GitHub Pages (una sola vez)

1. Crear el repositorio público `sjaquer/validacion_instrumento_sebastian_jaque` en GitHub (vacío, sin README).
2. `git remote add origin git@github.com:sjaquer/validacion_instrumento_sebastian_jaque.git && git push -u origin main`
3. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`**.

## Validar otro instrumento

Ver [`docs/GUIA_NUEVA_VALIDACION.md`](docs/GUIA_NUEVA_VALIDACION.md).
