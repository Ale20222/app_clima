# 🌤️ App del Clima

## Resumen del Proyecto

Aplicación web sencilla desarrollada en **JavaScript vanilla** (sin frameworks ni dependencias externas) que permite consultar el clima actual de cualquier ciudad del mundo, en donde el usuario escribe el nombre de una ciudad, la aplicación la geolocaliza y muestra la temperatura actual junto con una descripción del estado del cielo, todo en español.

El proyecto está pensado como ejercicio práctico de consumo de APIs REST con `fetch`, manejo de promesas (`async/await`), manipulación del DOM y organización de código en módulos ES6 (`import`/`export`).

---

## Instrucciones de Instalación

Esta aplicación **no requiere instalación de dependencias** (no usa `npm`, ni frameworks, ni build tools). Solo necesitas:

1. Tener los 4 archivos del proyecto dentro de la siguiente estructura de carpetas:
   ```
   APP_CLIMA/
   └── APP/
       ├── api.js
       ├── app.js
       ├── index.html
       └── style.css
   ```
2. Un navegador moderno (Chrome, Firefox, Edge) con conexión a internet, ya que la app consume APIs externas en tiempo real.
3. **Importante:** como `app.js` se carga con `type="module"`, algunos navegadores bloquean los módulos ES6 si abres `index.html` directamente con doble clic (protocolo `file://`). Para evitarlo, sirve la carpeta con un servidor local:

   **Opción A — VS Code (recomendado):**
   - Instala la extensión "Live Server".
   - Clic derecho sobre `index.html` → "Open with Live Server".

   **Opción B — Python (si ya lo tienes instalado):**
   ```bash
   cd APP_CLIMA/APP
   python -m http.server 8080
   ```
   Luego abre `http://localhost:8080` en el navegador.

   **Opción C — Node.js:**
   ```bash
   npx serve APP_CLIMA/APP
   ```

No se requiere API key: la API de Open-Meteo utilizada es de acceso público y gratuito.

---

## Guía de Uso

1. Abre la aplicación en el navegador (ver sección anterior).
2. Escribe el nombre de una ciudad en el campo de texto (ej. `Bogotá`, `Madrid`, `Tokio`).
3. Haz clic en el botón **"Buscar"**, o simplemente presiona la tecla **Enter**.
4. Mientras se consulta la información, verás un mensaje de carga (`Buscando clima... ⏳`).
5. El resultado se mostrará automáticamente: nombre de la ciudad, temperatura actual en °C y descripción del clima.
6. Si ocurre un error (ciudad no encontrada, campo vacío, sin conexión), se mostrará un mensaje claro en lugar del resultado.
7. Puedes realizar nuevas búsquedas cuantas veces quieras; el botón se deshabilita brevemente mientras se procesa cada consulta para evitar peticiones duplicadas.

---

## Ejemplo de Resultados

**Entrada:** `Bogotá`

**Objeto devuelto por `api.js` (formato interno):**
```json
{
  "ciudad": "Bogotá",
  "temperatura": 17.3,
  "descripcion": "Parcialmente nublado"
}
```

**Renderizado en pantalla:**
```
Bogotá
17.3°C
Parcialmente nublado
```

**Ejemplo de error (ciudad inexistente), entrada `asdfqwerty123`:**
```
⚠️ No se encontró la ciudad "asdfqwerty123". Intenta con otro nombre.
```

---

## Funcionalidades

- 🔍 Búsqueda de clima actual por nombre de ciudad.
- 🌍 Geocodificación automática (convierte el nombre de la ciudad en coordenadas) usando Open-Meteo.
- 🌡️ Temperatura actual en grados Celsius.
- ☁️ Descripción del clima traducida a español a partir del código meteorológico (`weathercode`) de la API.
- ⌨️ Búsqueda mediante clic en el botón o tecla **Enter**.
- ⏳ Estado de carga visual mientras se resuelve la consulta.
- 🚫 Bloqueo del botón de búsqueda durante la carga, para evitar peticiones simultáneas.
- 🎨 Interfaz moderna tipo tarjeta, centrada, con gradiente de fondo y diseño responsivo (se adapta a pantallas móviles).
- 🧩 Código modular: `api.js` (lógica de datos) separado de `app.js` (lógica de interfaz).

---

## Manejo de Errores

La aplicación distingue y comunica claramente distintos tipos de fallo:

| Situación | Mensaje mostrado al usuario |
|---|---|
| Campo de búsqueda vacío o solo con espacios | "Debes ingresar el nombre de una ciudad." / "Por favor escribe el nombre de una ciudad." |
| Ciudad que no existe o mal escrita | `No se encontró la ciudad "X". Intenta con otro nombre.` |
| Sin conexión a internet o fallo de red | "Error de red al buscar la ciudad. Verifica tu conexión." / "Error de red al obtener el clima. Intenta nuevamente." |
| El servidor de geocodificación responde con error HTTP | "No se pudo conectar con el servicio de ubicación." |
| El servidor de clima responde con error HTTP | "No se pudo obtener el clima en este momento." |
| Respuesta del servidor corrupta o no parseable | "La respuesta del servicio de ubicación/clima no es válida." |

Internamente, `api.js` separa el manejo de **errores de red** (el `fetch` falla por completo, sin internet) de los **errores HTTP** (el servidor respondió pero con un código de error), para que cada caso muestre el mensaje correcto en lugar de un mensaje genérico. Todos los errores se lanzan como `Error` de JavaScript y son capturados en `app.js` mediante `try/catch`, mostrándose en el contenedor de resultados sin necesidad de `alert()` ni interrumpir la interfaz.

---

## Información de la API

Se utiliza la API pública y gratuita **[Open-Meteo](https://open-meteo.com/)**, que no requiere autenticación ni API key.

1. **API de Geocodificación**
   `https://geocoding-api.open-meteo.com/v1/search?name={ciudad}&count=1&language=es&format=json`
   Convierte el nombre de una ciudad en coordenadas (`latitude`, `longitude`) y devuelve el nombre normalizado de la ciudad encontrada.

2. **API de Clima (Forecast)**
   `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`
   Devuelve el clima actual para esas coordenadas, incluyendo `temperature` y `weathercode`.

El `weathercode` es un valor numérico estandarizado (tabla WMO) que la propia aplicación traduce a texto en español dentro de `api.js`, ya que Open-Meteo no ofrece esta traducción directamente.

---

## Caché y buena práctica para clase

La aplicación guarda cada consulta en un `Map` en memoria con una clave normalizada por tipo de consulta y ciudad. Antes de llamar a la API verifica que la entrada siga vigente: el clima actual dura 10 minutos y el pronóstico una hora. Si la API falla, devuelve la última respuesta guardada, incluso si ya venció, como respaldo temporal.

**Idea clave:** una caché debe tener un tiempo de expiración (TTL). Guardar datos sin definir cuánto tiempo son confiables puede mostrar información desactualizada como si fuera actual; los datos vencidos solo deben usarse de forma explícita, por ejemplo ante un fallo de red.

## Mejoras Futuras

- 🌡️ Permitir alternar entre Celsius y Fahrenheit.
- 📍 Detectar automáticamente la ubicación del usuario (Geolocation API) para mostrar su clima local al abrir la app.
- 🕐 Mostrar datos adicionales: sensación térmica, humedad, velocidad del viento, pronóstico por horas o próximos días.
- 🗂️ Manejar múltiples coincidencias de ciudad (por ejemplo, "San José" existe en varios países) dejando que el usuario elija entre las opciones en vez de tomar siempre la primera.
- 💾 Guardar un historial de búsquedas recientes (usando `localStorage` o similar) para acceso rápido.
- 🌐 Detectar el idioma del navegador para adaptar los textos.
- ♿ Mejorar accesibilidad (atributos ARIA, navegación completa por teclado, contraste de colores).
- 🧪 Agregar pruebas automatizadas (unitarias para `api.js` con mocks de `fetch`, y de interfaz para `app.js`).
- 🎨 Añadir íconos o ilustraciones dinámicas según la condición climática (sol, lluvia, nieve, etc.).
