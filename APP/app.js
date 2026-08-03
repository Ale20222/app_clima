/**
 * app.js
 * Controla la interfaz: tabs, clima actual, pronóstico de 5 días
 * y comparación de múltiples ciudades.
 */

import {
  obtenerClima,
  obtenerPronostico5Dias,
  obtenerClimaMultiplesCiudades,
} from "./api.js";
import { limpiarCache } from "./cache.js";

// ============ Botón: borrar caché guardado ============
const botonBorrarCache = document.getElementById("clear-cache-btn");

botonBorrarCache.addEventListener("click", () => {
  limpiarCache();

  // Feedback visual breve para confirmar la acción al usuario
  const textoOriginal = botonBorrarCache.textContent;
  botonBorrarCache.textContent = "✅ Caché borrado";
  botonBorrarCache.disabled = true;

  setTimeout(() => {
    botonBorrarCache.textContent = textoOriginal;
    botonBorrarCache.disabled = false;
  }, 1500);
});

// ============ Navegación por pestañas ============
const botonesTab = document.querySelectorAll(".tab-btn");
const paneles = {
  actual: document.getElementById("panel-actual"),
  pronostico: document.getElementById("panel-pronostico"),
  comparar: document.getElementById("panel-comparar"),
};

botonesTab.forEach((boton) => {
  boton.addEventListener("click", () => {
    botonesTab.forEach((b) => b.classList.remove("active"));
    Object.values(paneles).forEach((p) => p.classList.remove("active"));
    boton.classList.add("active");
    paneles[boton.dataset.tab].classList.add("active");
  });
});

// ============ Panel 1: Clima actual ============
const inputCiudad = document.getElementById("city-input");
const botonBuscar = document.getElementById("search-btn");
const contenedorResultado = document.getElementById("result-container");
const historyCityContainer = document.getElementById("city-history");

const HISTORIAL_CLIMA_KEY = "clima_historial_clima";
const HISTORIAL_PRONOSTICO_KEY = "clima_historial_pronostico";
const HISTORIAL_COMPARAR_KEY = "clima_historial_comparar";
const MAX_HISTORIAL = 10;

botonBuscar.addEventListener("click", manejarBusquedaActual);
inputCiudad.addEventListener("keydown", (e) => {
  if (e.key === "Enter") manejarBusquedaActual();
});
inputCiudad.addEventListener("focus", () => mostrarHistorial(inputCiudad, HISTORIAL_CLIMA_KEY, historyCityContainer));
inputCiudad.addEventListener("input", () => mostrarHistorial(inputCiudad, HISTORIAL_CLIMA_KEY, historyCityContainer));
inputCiudad.addEventListener("blur", () => ocultarHistorialConRetraso(historyCityContainer));

async function manejarBusquedaActual() {
  const ciudad = inputCiudad.value.trim();
  if (!ciudad) {
    mostrarError(contenedorResultado, "Por favor escribe el nombre de una ciudad.");
    return;
  }

  guardarHistorialBusqueda(HISTORIAL_CLIMA_KEY, ciudad);
  botonBuscar.disabled = true;
  contenedorResultado.innerHTML = `<p class="loading-text">Buscando clima... ⏳</p>`;

  try {
    const clima = await obtenerClima(ciudad);
    renderClimaActual(clima);
  } catch (error) {
    mostrarError(contenedorResultado, error.message);
  } finally {
    botonBuscar.disabled = false;
  }
}

function obtenerHistorial(key) {
  const crudo = window.localStorage.getItem(key);
  if (!crudo) return [];
  try {
    return JSON.parse(crudo) || [];
  } catch {
    return [];
  }
}

function guardarHistorialBusqueda(key, valor) {
  const texto = valor.trim();
  if (!texto) return;
  const historial = obtenerHistorial(key).filter((item) => item.toLowerCase() !== texto.toLowerCase());
  historial.unshift(texto);
  if (historial.length > MAX_HISTORIAL) historial.length = MAX_HISTORIAL;
  window.localStorage.setItem(key, JSON.stringify(historial));
}

function mostrarHistorial(input, key, contenedor) {
  const valor = input.value.trim().toLowerCase();
  const historial = obtenerHistorial(key);
  if (historial.length === 0) {
    contenedor.classList.add("hidden");
    contenedor.innerHTML = "";
    return;
  }

  const coincidencias = valor
    ? historial.filter((item) => item.toLowerCase().includes(valor))
    : historial;

  if (coincidencias.length === 0) {
    contenedor.classList.add("hidden");
    contenedor.innerHTML = "";
    return;
  }

  contenedor.innerHTML = `
    <div class="history-title">Historial reciente</div>
    <ul>
      ${coincidencias
        .map(
          (item) =>
            `<li><button type="button" class="history-item">${item}</button></li>`
        )
        .join("")}
    </ul>
  `;
  contenedor.classList.remove("hidden");

  contenedor.querySelectorAll(".history-item").forEach((boton) => {
    boton.addEventListener("mousedown", (e) => {
      e.preventDefault();
      input.value = boton.textContent;
      input.focus();
      contenedor.classList.add("hidden");
    });
  });
}

function ocultarHistorialConRetraso(contenedor) {
  setTimeout(() => contenedor.classList.add("hidden"), 150);
}

function renderClimaActual(clima) {
  const { ciudad, temperatura, descripcion, humedad, viento, precipitacion, _cacheStale } = clima;
  contenedorResultado.innerHTML = `
    <div class="weather-result">
      ${_cacheStale ? avisoCacheVieja() : ""}
      <h2 class="city-name">${ciudad}</h2>
      <p class="temperature">${temperatura}°C</p>
      <p class="description">${descripcion}</p>
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-icon">💧</span>
          <span class="detail-label">Humedad</span>
          <span class="detail-value">${humedad}%</span>
        </div>
        <div class="detail-item">
          <span class="detail-icon">💨</span>
          <span class="detail-label">Viento</span>
          <span class="detail-value">${viento} km/h</span>
        </div>
        <div class="detail-item">
          <span class="detail-icon">🌧️</span>
          <span class="detail-label">Precipitación</span>
          <span class="detail-value">${precipitacion} mm</span>
        </div>
      </div>
    </div>
  `;
}

// ============ Panel 2: Pronóstico 5 días ============
const inputPronostico = document.getElementById("forecast-input");
const botonPronostico = document.getElementById("forecast-btn");
const contenedorPronostico = document.getElementById("forecast-container");
const historyForecastContainer = document.getElementById("forecast-history");

botonPronostico.addEventListener("click", manejarPronostico);
inputPronostico.addEventListener("keydown", (e) => {
  if (e.key === "Enter") manejarPronostico();
});
inputPronostico.addEventListener("focus", () => mostrarHistorial(inputPronostico, HISTORIAL_PRONOSTICO_KEY, historyForecastContainer));
inputPronostico.addEventListener("input", () => mostrarHistorial(inputPronostico, HISTORIAL_PRONOSTICO_KEY, historyForecastContainer));
inputPronostico.addEventListener("blur", () => ocultarHistorialConRetraso(historyForecastContainer));

async function manejarPronostico() {
  const ciudad = inputPronostico.value.trim();
  if (!ciudad) {
    mostrarError(contenedorPronostico, "Por favor escribe el nombre de una ciudad.");
    return;
  }

  guardarHistorialBusqueda(HISTORIAL_PRONOSTICO_KEY, ciudad);
  botonPronostico.disabled = true;
  contenedorPronostico.innerHTML = `<p class="loading-text">Cargando pronóstico... ⏳</p>`;

  try {
    const pronostico = await obtenerPronostico5Dias(ciudad);
    renderPronostico(pronostico);
  } catch (error) {
    mostrarError(contenedorPronostico, error.message);
  } finally {
    botonPronostico.disabled = false;
  }
}

function renderPronostico(pronostico) {
  const { ciudad, dias, _cacheStale } = pronostico;

  const tarjetas = dias
    .map((dia) => {
      // "T00:00:00" evita desfases de zona horaria al crear el Date
      const fecha = new Date(`${dia.fecha}T00:00:00`);
      const nombreDia = fecha.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

      return `
        <div class="forecast-card">
          <p class="forecast-day">${nombreDia}</p>
          <p class="forecast-desc">${dia.descripcion}</p>
          <p class="forecast-temps">
            <span class="temp-max">${dia.tempMax}°</span> / <span class="temp-min">${dia.tempMin}°</span>
          </p>
          <p class="forecast-precip">🌧️ ${dia.precipitacion} mm</p>
        </div>
      `;
    })
    .join("");

  contenedorPronostico.innerHTML = `
    ${_cacheStale ? avisoCacheVieja() : ""}
    <h2 class="city-name">${ciudad}</h2>
    <div class="forecast-grid">${tarjetas}</div>
  `;
}

// ============ Panel 3: Comparar ciudades ============
const inputComparar = document.getElementById("compare-input");
const botonComparar = document.getElementById("compare-btn");
const contenedorComparar = document.getElementById("compare-container");
const historyCompareContainer = document.getElementById("compare-history");

botonComparar.addEventListener("click", manejarComparacion);
inputComparar.addEventListener("keydown", (e) => {
  if (e.key === "Enter") manejarComparacion();
});
inputComparar.addEventListener("focus", () => mostrarHistorial(inputComparar, HISTORIAL_COMPARAR_KEY, historyCompareContainer));
inputComparar.addEventListener("input", () => mostrarHistorial(inputComparar, HISTORIAL_COMPARAR_KEY, historyCompareContainer));
inputComparar.addEventListener("blur", () => ocultarHistorialConRetraso(historyCompareContainer));

async function manejarComparacion() {
  const texto = inputComparar.value.trim();
  const ciudades = texto
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (ciudades.length < 2) {
    mostrarError(contenedorComparar, "Ingresa al menos dos ciudades separadas por comas (ej: Bogotá, Madrid).");
    return;
  }

  guardarHistorialBusqueda(HISTORIAL_COMPARAR_KEY, texto);
  botonComparar.disabled = true;
  contenedorComparar.innerHTML = `<p class="loading-text">Comparando ciudades... ⏳</p>`;

  // obtenerClimaMultiplesCiudades() ya captura los errores de cada ciudad
  // individualmente (no relanza), pero igual usamos try/finally: si algo
  // inesperado fallara, el botón no debe quedar bloqueado para siempre.
  try {
    const resultados = await obtenerClimaMultiplesCiudades(ciudades);
    renderComparacion(resultados);
  } catch (error) {
    mostrarError(contenedorComparar, "Ocurrió un error inesperado al comparar. Intenta de nuevo.");
  } finally {
    botonComparar.disabled = false;
  }
}

function renderComparacion(resultados) {
  const tarjetas = resultados
    .map((r) => {
      if (r.error) {
        return `
          <div class="compare-card compare-card-error">
            <p class="city-name">${r.ciudad}</p>
            <p class="error-text">⚠️ ${r.error}</p>
          </div>
        `;
      }

      return `
        <div class="compare-card">
          <p class="city-name">${r.ciudad}</p>
          <p class="temperature">${r.temperatura}°C</p>
          <p class="description">${r.descripcion}</p>
          <p class="compare-detail">💧 ${r.humedad}% · 💨 ${r.viento} km/h</p>
        </div>
      `;
    })
    .join("");

  contenedorComparar.innerHTML = `<div class="compare-grid">${tarjetas}</div>`;
}

// ============ Utilidad compartida ============
/**
 * Muestra un mensaje de error dentro de un contenedor específico.
 * Se recibe el contenedor como parámetro porque ahora hay 3 paneles distintos.
 */
function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = `<p class="error-text">⚠️ ${mensaje}</p>`;
}

/**
 * Aviso que se muestra cuando la API falló y estamos mostrando un dato
 * guardado en caché aunque ya haya expirado (ver api.js / cache.js).
 */
function avisoCacheVieja() {
  return `<p class="error-text">⚠️ No se pudo conectar con el servicio ahora mismo. Mostrando el último dato guardado.</p>`;
}