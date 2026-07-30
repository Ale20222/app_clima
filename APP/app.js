/**
 * app.js
 * Controla la interfaz: escucha eventos del usuario, llama a api.js
 * y renderiza los resultados (carga, éxito o error) en el DOM.
 */

import { getWeatherByCity } from "./api.js";

// --- Selección de elementos del DOM ---
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const resultContainer = document.getElementById("result-container");

// --- Event listeners ---
searchBtn.addEventListener("click", handleSearch);

cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleSearch();
  }
});

/**
 * Función principal que orquesta la búsqueda:
 * lee el input, muestra estado de carga, llama a la API y renderiza el resultado.
 */
async function handleSearch() {
  const city = cityInput.value.trim();

  if (!city) {
    renderError("Por favor escribe el nombre de una ciudad.");
    return;
  }

  renderLoading();

  try {
    const weather = await getWeatherByCity(city);
    renderWeather(weather);
  } catch (error) {
    renderError(error.message);
  }
}

/**
 * Muestra un estado de "cargando" mientras se espera la respuesta de la API.
 */
function renderLoading() {
  resultContainer.innerHTML = `
    <p class="loading-text">Buscando clima... ⏳</p>
  `;
}

/**
 * Renderiza la tarjeta con los datos del clima.
 * @param {{city: string, country: string, temperature: number, description: string}} weather
 */
function renderWeather(weather) {
  const { city, country, temperature, description } = weather;

  resultContainer.innerHTML = `
    <div class="weather-result">
      <h2 class="city-name">${city}${country ? `, ${country}` : ""}</h2>
      <p class="temperature">${temperature}°C</p>
      <p class="description">${description}</p>
    </div>
  `;
}

/**
 * Muestra un mensaje de error claro para el usuario.
 * @param {string} message
 */
function renderError(message) {
  resultContainer.innerHTML = `
    <p class="error-text">⚠️ ${message}</p>
  `;
}