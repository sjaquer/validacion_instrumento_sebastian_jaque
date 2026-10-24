# Cómo crear una validación nueva

La página no tiene contenido fijo: todo sale de `proyectos/<id>/proyecto.json`. Para validar otro instrumento (otra tesis, un artículo, un trabajo de un compañero) solo hay que crear una carpeta nueva.

## 1. Crear la carpeta del proyecto

```bash
mkdir -p proyectos/mi-proyecto/expedientes
cp plantilla/proyecto.json proyectos/mi-proyecto/
cp ruta/al/logo.jpg proyectos/mi-proyecto/logo.jpg
```

El nombre de la carpeta es el **id** del proyecto: solo minúsculas, números y guiones. Cambia también `"id"` dentro del JSON para que coincida.

## 2. Completar `proyecto.json`

Abre el archivo en VS Code: gracias a `"$schema"` tendrás autocompletado y descripción de cada campo. Lo esencial:

| Campo | Qué poner |
| --- | --- |
| `investigacion` | Título, tipo de trabajo, autor, asesor y enfoque. |
| `institucion` | Nombre, unidad, programa, ciudad y `logo` (ruta dentro de la carpeta). |
| `tema.acento` | Color institucional `#RRGGBB`; el resto de la paleta (claro y oscuro) se calcula solo. |
| `contacto` | A quién envía el experto el PDF: `whatsapp` con código de país y sin «+», y `correo`. |
| `carta` | Asunto, párrafos, contenido del expediente, cierre y firma. `{area}` se reemplaza con el área de cada experto. |
| `variables` | Variables → dimensiones → `indicadores` (con sus números de ítem) e `items` (`numero`, `texto`). Los números de ítem no se repiten. |
| `cuestionario` | Opcional: vista previa del cuestionario como lo verán los participantes (bloques de `opciones` o de `escala`). |
| `expertos` | `clave` (va en el enlace), `grado`, `nombre`, `tratamiento`, `rol`, `area` (completa la carta) y `especialidad` (se precarga en el certificado). |
| `documentos` | PDF del expediente: `archivo` admite `{clave}` para la versión personalizada de cada experto y `archivo_general` para quien no tenga enlace personal. |
| `fecha_limite` · `estado` | Fecha sugerida de entrega (AAAA-MM-DD). Con `"estado": "cerrado"` la página avisa que la validación terminó y bloquea las respuestas. |

En los textos puedes usar `**negrita**`, `*cursiva*` y `[enlaces](https://…)`.

### Cambiar los criterios o la escala

Por defecto se evalúan **pertinencia, relevancia y claridad** con **Sí (1) / No (0)** y suficiencia por dimensión, como en el formato de la UPNW. Para otra guía, edita `evaluacion`:

```json
"criterios": [
  { "clave": "s", "nombre": "Suficiencia", "definicion": "…" },
  { "clave": "cl", "nombre": "Claridad", "definicion": "…" },
  { "clave": "co", "nombre": "Coherencia", "definicion": "…" },
  { "clave": "re", "nombre": "Relevancia", "definicion": "…" }
],
"escala": [
  { "valor": 1, "etiqueta": "1" }, { "valor": 2, "etiqueta": "2" },
  { "valor": 3, "etiqueta": "3" }, { "valor": 4, "etiqueta": "4" }
],
"suficiencia": { "activa": false }
```

El valor mayor de la escala se muestra en verde, el menor en rojo y los intermedios con el color institucional. La V de Aiken de `consolidar_respuestas.py` usa el mínimo y el máximo de la escala, así que funciona igual con Sí/No o con escalas de 1 a 4 o de 1 a 5.

## 3. Expedientes en PDF

Coloca en `expedientes/` el expediente general (`expediente.pdf`) y, si quieres, uno personalizado por experto (`expediente_<clave>.pdf`). Si no tienes PDF, deja `"documentos": []`.

## 4. Revisar, probar y publicar

```bash
python3 herramientas/validar_proyecto.py proyectos/mi-proyecto/proyecto.json
python3 -m http.server 8000      # abrir http://localhost:8000/?p=mi-proyecto&e=<clave>
git add proyectos/mi-proyecto && git commit -m "Agregar validación mi-proyecto" && git push
```

Enlace para cada experto: `https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/?p=mi-proyecto&e=<clave>`.
Si quieres que sea el proyecto por defecto (enlaces más cortos, solo `?e=<clave>`), cambia `"predeterminado"` en `proyectos/index.json`.

## 5. Recibir y consolidar

Cuando lleguen los certificados, guárdalos **fuera del repositorio público** y ejecuta `herramientas/consolidar_respuestas.py <carpeta>`. Al terminar la validación, marca el proyecto como `"estado": "cerrado"`.

## Buenas prácticas

- No subas al repositorio certificados firmados, DNI ni datos personales de los expertos más allá de su nombre y grado: el repositorio es público.
- Si cambias el texto de un ítem cuando un experto ya empezó, la página descarta solo las respuestas de ese ítem (compara una huella del texto) y le avisa que debe evaluarlo de nuevo.
- GitHub Pages guarda los archivos en caché unos 10 minutos. Si cambias el código, sube también el número de `?v=` en `index.html` (`app.css?v=…`, `main.js?v=…`); `proyecto.json` siempre se pide sin caché.
