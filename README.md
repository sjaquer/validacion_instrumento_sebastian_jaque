# Validación de instrumentos por juicio de expertos

Plataforma web estática (SPA) diseñada para la evaluación psicométrica y validación de contenido de instrumentos de investigación científica mediante juicio de expertos. Permite a los jueces examinar el marco teórico y metodológico, evaluar cada ítem según criterios estandarizados (o escalas tipo Likert), emitir sugerencias, calificar la suficiencia dimensional, estampar su firma digital en pantalla y generar un **certificado oficial de validez de contenido en PDF** con metadatos estructurados para consolidación estadística automatizada.

- **Demostración en vivo:** [https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/](https://sjaquer.github.io/validacion_instrumento_sebastian_jaque/)
- **Arquitectura:** 100% del lado del cliente (Vanilla HTML5 / CSS3 / ES Modules) sin servidores ni base de datos centralizada.
- **Data-Driven:** El sistema desacopla la lógica del contenido; cualquier instrumento se define de forma declarativa en `proyectos/<id>/proyecto.json`.

---

## Cómo funciona el código

La aplicación opera bajo un modelo de arquitectura desacoplada donde la interfaz y la lógica de validación se construyen dinámicamente a partir de un archivo de configuración JSON.

```
                    ┌─────────────────────────┐
                    │      URL / Enlace       │
                    │   ?p=<id>&e=<clave>     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │     main.js (Router)    │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │     datos.js (Fetch)    │     │    estado.js (Store)    │
    │  Carga y normaliza JSON │     │  localStorage + Hashes  │
    └────────────┬────────────┘     └────────────┬────────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    vista.js (Render)    │
                    │  Montaje reactivo DOM   │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │    firma.js (Canvas)    │     │  certificado.js (PDF)   │
    │  Captura de trazo suave │     │  jsPDF + JSON en Meta   │
    └─────────────────────────┘     └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │ consolidar_respuestas.py│
                                    │ Extracción + V de Aiken │
                                    └─────────────────────────┘
```

### 1. Inicialización y Enrutamiento (`assets/js/main.js`)

- **Detección de contexto:** Lee los parámetros de búsqueda en la URL (`URLSearchParams`):
  - `p`: Identificador de la carpeta del proyecto dentro de `proyectos/`. Si se omite, recurre al valor predeterminado definido en `proyectos/index.json`.
  - `e`: Clave identificadora del evaluador para precargar sus datos institucionales.
- **Inyección dinámica de estilos:** Extrae la paleta institucional (`tema.acento`) del JSON y recalcula las variables CSS dinámicas (`--color-acento`, hover y contrastes) en tiempo de ejecución.
- **Orquestador de navegación:** Controla el ciclo de vida del asistente paso a paso (*Wizard*):
  1. `Pantalla Inicio`: Presentación institucional, carta formal al experto y acceso al expediente completo.
  2. `Pantalla Evaluación`: Formulario reactivo de ítems, criterios y suficiencia.
  3. `Pantalla Cierre`: Opinión global de aplicabilidad, observaciones finales, datos del juez y panel de firma.
- **Accesibilidad y preferencias:** Gestión de tema (claro/oscuro con detección de `prefers-color-scheme`), escalado de tipografía y accesibilidad de teclado.

### 2. Capa de Datos y Normalización (`assets/js/datos.js`)

- **Carga asíncrona:** Realiza peticiones `fetch()` con cabeceras de no-caché para garantizar que siempre se visualice la versión vigente de la matriz.
- **Normalización contra esquema:** Completa campos omitidos con valores por defecto (criterios por defecto de Pertinencia, Relevancia y Claridad con escala binaria Sí/No, formato de certificado, reglas de validación de documentos de identidad).
- **Sanitización y Markdown:** Contiene un compilador ligero para convertir Markdown (`**negrita**`, `*cursiva*`, `[enlace](url)`) en HTML seguro sin dependencias externas pesadas.
- **Cálculo de huellas criptográficas:** Genera una huella (*hash* FNV-1a) para el texto de cada ítem, lo cual permite detectar si el enunciado fue modificado posteriormente.

### 3. Máquina de Estado y Persistencia Local (`assets/js/estado.js`)

- **Persistencia en el navegador:** Guarda las respuestas, sugerencias y firmas directamente en `localStorage` bajo una clave con *namespace* (`validacion:<id_proyecto>:<clave_experto>:v1`).
- **Escritura debounced:** Implementa aplazamiento (*debounce* de 350 ms) para optimizar el rendimiento y evitar escrituras continuas durante la digitación o el marcado de opciones.
- **Integridad psicométrica ante cambios:** Si el investigador actualiza la redacción de un ítem en `proyecto.json`, el comparador de huellas invalida automáticamente las respuestas previas de ese ítem específico, alertando al experto para que lo vuelva a calificar.
- **Cálculo reactivo del progreso:** Evalúa continuamente ítems pendientes, suficiencias y campos obligatorios, sincronizando la barra de progreso superior y el índice lateral de navegación.

### 4. Renderizado Dinámico de la Interfaz (`assets/js/vista.js`)

- **Construcción modular del DOM:** Crea elementos HTML de forma programática y eficiente:
  - Tarjetas de ítems agrupadas jerárquicamente por Dimensiones e Indicadores.
  - Selectores dinámicos adaptados a la escala configurada (botones binarios Sí/No con acentos semánticos verde/rojo o escalas multicriterio de 1 a 4 o 1 a 5).
  - Campos de sugerencia de apertura condicional (obligatorios si se rechaza un criterio o se califica con puntaje bajo).
  - Bloque de suficiencia dimensional al término de cada bloque temático.

### 5. Motor de Firma Digital (`assets/js/firma.js`)

- **Canvas interactivo unificado:** Captura trazos mediante `PointerEvents` y `TouchEvents`, adaptándose a mouse, trackpad, lápices ópticos (stylus) y pantallas táctiles móviles.
- **Suavizado de curvas:** Aplica interpolación de curvas de Bézier cuadráticas para evitar trazos angulosos o pixelados.
- **Historial y gestión de imagen:** Permite deshacer trazos progresivamente, limpiar el lienzo o subir una imagen escaneada de firma física, optimizándola y aplanándola sobre fondo blanco para el PDF.

### 6. Motor de Certificación PDF en el Cliente (`assets/js/certificado.js`)

- **Renderizado vectorial:** Emplea `jsPDF` y el plugin `AutoTable` para maquetar el certificado formal en formato A4 con encabezado institucional, datos del perito, tabla de ítems con sus calificaciones, resumen de suficiencia, dictamen de aplicabilidad y firma integrada.
- **Inyección de metadatos estructurados:** El objeto con la totalidad de respuestas, tiempos y valoraciones se serializa en JSON (codificado en ASCII/Latin-1) y se inyecta directamente en el metadato `/Subject` del documento PDF generado. Esto permite una recolección automatizada de datos sin vulnerar la privacidad del experto (datos sensibles como el DNI no se incluyen en el JSON).

---

## Procesamiento de Datos y Análisis Estadístico

El repositorio incluye herramientas en Python para auditar la configuración y automatizar el análisis psicométrico tras recibir los certificados firmados.

```
Certificados PDF firmados
   ├── certificado_1.pdf  ──┐
   ├── certificado_2.pdf  ──┼──►  herramientas/consolidar_respuestas.py
   └── certificado_n.pdf  ──┘                     │
                                                  ▼
                                 ┌──────────────────────────────────┐
                                 │ • respuestas.csv (matriz cruda)  │
                                 │ • aiken.csv      (V por criterio)│
                                 │ • resumen.md     (reporte formal)│
                                 └──────────────────────────────────┘
```

### 1. Extracción de Metadatos y Cálculo de la V de Aiken (`herramientas/consolidar_respuestas.py`)

Lee la carpeta donde se almacenan los certificados firmados y extrae el payload JSON incrustado en cada archivo sin requerir transcripción manual ni OCR.

Aplica la formulación matemática de la **V de Aiken** (*Aiken, 1980, 1985*):

$$
V = \frac{S}{n \cdot (c - 1)}
$$

Donde:

- $S$: Suma de las diferencias entre las calificaciones asignadas por los jueces y la calificación mínima posible de la escala ($S = \sum (x_i - l)$).
- $n$: Número total de jueces evaluadores.
- $c$: Número de valores o categorías posibles en la escala de evaluación.

Para la escala binaria Sí (1) / No (0), $V$ equivale a la proporción directa de jueces que respondieron favorablemente.

**Archivos generados:**

- `respuestas.csv`: Matriz desagregada con una fila por experto e ítem, detallando cada criterio y las observaciones textuales.
- `aiken.csv`: Coeficiente $V$ calculado para cada ítem en cada criterio evaluado, junto con la media global del ítem.
- `resumen.md`: Informe técnico que contrasta el coeficiente contra el umbral psicométrico de aceptación (típicamente $V \ge 0.80$), consolidando la suficiencia por dimensión y las sugerencias para el ajuste del instrumento.

### 2. Validador Estático de Proyectos (`herramientas/validar_proyecto.py`)

Herramienta de control de calidad integrada en el flujo de integración continua (`.github/workflows/validar.yml`). Audita:

- Cumplimiento de la estructura definida en el esquema JSON (`esquema/proyecto.schema.json`).
- Unicidad correlativa de los identificadores de ítems.
- Consistencia entre dimensiones e indicadores.
- Integridad de recursos referenciados (rutas de logotipos, archivos de expediente en PDF).

---

## Parámetros de Enlace y Personalización

El comportamiento de la interfaz se parametriza mediante la cadena de consulta (*query string*) de la URL:

| Parámetro            | Función                                                                                                                         | Ejemplo de uso                                       |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `?e=<clave>`        | Carga el proyecto predeterminado y precarga los datos del juez validador según la clave configurada en `expertos`.            | `https://sitio.com/?e=experto1`                    |
| `?p=<id>&e=<clave>` | Selecciona un proyecto específico en `proyectos/<id>/` y vincula al experto indicado.                                         | `https://sitio.com/?p=mi-investigacion&e=experto2` |
| *(Sin parámetros)* | Modo abierto. Se carga el proyecto predeterminado y el evaluador ingresa manualmente su nombre, grado, documento y especialidad. | `https://sitio.com/`                               |

---

## Estructura del Repositorio

```
├── index.html                    # Entrada SPA: estructura semántica base y enlaces a módulos
├── 404.html                      # Manejo de rutas no encontradas en GitHub Pages
├── robots.txt                    # Directiva para evitar indexación en motores de búsqueda
├── manifest.webmanifest          # Metadatos para comportamiento web progresivo
│
├── assets/
│   ├── css/
│   │   ├── tokens.css            # Variables CSS: colores, elevaciones, tipografías y temas
│   │   ├── base.css              # Normalización, resets y reglas base de accesibilidad
│   │   ├── layout.css            # Estructura de cabecera, contenedor de pantallas y pie
│   │   ├── componentes.css       # Botones, switches, campos de texto, badges y alertas
│   │   ├── inicio.css            # Estilos de la carta institucional y ficha técnica
│   │   ├── evaluacion.css        # Cuadrícula de tarjetas de ítems, criterios y barra de progreso
│   │   ├── cierre.css            # Panel de dictamen global, inputs de juez y canvas de firma
│   │   └── impresion.css         # Reglas para medios impresos (@media print)
│   │
│   ├── js/
│   │   ├── main.js               # Enrutador, inicializador de estado, control de pasos y UI
│   │   ├── vista.js              # Generador de componentes del DOM a partir del JSON
│   │   ├── datos.js              # Gestor de fetch, validación y normalización de esquemas
│   │   ├── estado.js             # Gestor de persistencia en localStorage y detección de huellas
│   │   ├── firma.js              # Controlador del canvas de firma con suavizado de curvas
│   │   ├── certificado.js        # Generador de PDF con jsPDF y metadatos JSON integrados
│   │   └── util.js               # Funciones auxiliares (DOM, hashing FNV-1a, debounce)
│   │
│   └── vendor/                   # Dependencias locales (jsPDF 2.5.1 y AutoTable 3.8.2)
│
├── esquema/
│   └── proyecto.schema.json      # Esquema JSON formal (validación y autocompletado en IDEs)
│
├── plantilla/
│   └── proyecto.json             # Plantilla base para inicializar un nuevo instrumento
│
├── proyectos/
│   ├── index.json                # Registro central de proyectos y designación del predeterminado
│   └── tesis-iag-productividad/  # Instancia de validación activa (metadatos, expedientes y logo)
│
├── herramientas/
│   ├── validar_proyecto.py       # Script de verificación estática de consistencia
│   └── consolidar_respuestas.py  # Script de extracción de PDF y cálculo de V de Aiken
│
├── docs/
│   └── GUIA_NUEVA_VALIDACION.md  # Instrucciones paso a paso para crear un nuevo instrumento
│
└── .github/workflows/
    └── validar.yml               # Workflow de GitHub Actions para validación automática
```

---

## Desarrollo Local y Despliegue

### 1. Entorno de Desarrollo Local

Dado que el proyecto utiliza módulos estándar de ECMAScript (`import`/`export`), debe ejecutarse bajo un servidor HTTP local para evitar bloqueos por políticas CORS:

```bash
# Iniciar servidor local
python3 -m http.server 8000

# Abrir en el navegador con un proyecto y clave de prueba
# http://localhost:8000/?p=tesis-iag-productividad&e=demo
```

### 2. Comprobación y Calidad de Código

Antes de realizar commits o desplegar modificaciones:

```bash
# Validar la integridad de los proyectos contra el esquema
python3 herramientas/validar_proyecto.py
```

### 3. Publicación

El sitio se encuentra optimizado para **GitHub Pages**. Cualquier cambio enviado a la rama `main` activa el flujo de validación automática y se publica de forma inmediata.

---

## Privacidad y Seguridad

- **Ejecución confinada:** Las respuestas, datos personales y firmas residen exclusivamente en la memoria del navegador y en el almacenamiento local del dispositivo del evaluador.
- **Sin rastreo:** No se emplean servicios externos de analítica, cookies de seguimiento ni llamadas a APIs remotas de terceros.
- **Protección contra indexación:** El archivo `robots.txt` y las etiquetas meta `noindex, nofollow` impiden la catalogación pública de los expedientes por parte de motores de búsqueda.
- **Documento de identidad:** El número de documento de identidad del evaluador se imprime en el certificado visual pero se excluye intencionalmente del payload de metadatos JSON del PDF, mitigando la divulgación accidental de datos personales en el procesamiento estadístico.
