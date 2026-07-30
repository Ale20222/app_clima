/**
 * app.js
 * Controla la interfaz de usuario:
 * captura la interacción, llama a api.js y muestra el resultado (o error) en el DOM.
 */

// Paso 1: Importamos la función que hace todo el trabajo de red
import { obtenerClima } from "./api.js";

// Paso 2: Capturamos los elementos del DOM que vamos a usar
const inputCiudad = document.getElementById("city-input");
const botonBuscar = document.getElementById("search-btn");
const contenedorResultado = document.getElementById("result-container");

// Paso 3: Escuchamos el clic en el botón
botonBuscar.addEventListener("click", manejarBusqueda);

// Paso 4: Escuchamos la tecla Enter dentro del input
inputCiudad.addEventListener("keydown", (evento) => {
  if (evento.key === "Enter") {
    manejarBusqueda();
  }
});

/**
 * Función principal: lee el input, muestra el estado de carga,
 * llama a obtenerClima() y renderiza el resultado o el error.
 */
async function manejarBusqueda() {
  const ciudad = inputCiudad.value.trim();

  // Validación simple antes de llamar a la API
  if (!ciudad) {
    mostrarError("Por favor escribe el nombre de una ciudad.");
    return;
  }

  // Bloqueamos el botón mientras se resuelve la petición para evitar
  // que el usuario dispare varias búsquedas simultáneas (doble clic, Enter + clic).
  botonBuscar.disabled = true;
  mostrarCargando();

  try {
    // Paso 5: Llamamos a la función asíncrona de api.js
    const clima = await obtenerClima(ciudad);
    mostrarResultado(clima);
  } catch (error) {
    // Si obtenerClima() lanzó un error, lo mostramos en el DOM
    mostrarError(error.message);
  } finally {
    // Pase lo que pase (éxito o error), volvemos a habilitar el botón
    botonBuscar.disabled = false;
  }
}

/**
 * Muestra un mensaje de "cargando" mientras esperamos la respuesta.
 */
function mostrarCargando() {
  contenedorResultado.innerHTML = `
    <p class="loading-text">Buscando clima... ⏳</p>
  `;
}

/**
 * Imprime en el DOM el objeto de clima devuelto por api.js.
 * @param {{ciudad: string, temperatura: number, descripcion: string}} clima
 */
function mostrarResultado(clima) {
  const { ciudad, temperatura, descripcion } = clima;

  contenedorResultado.innerHTML = `
    <div class="weather-result">
      <h2 class="city-name">${ciudad}</h2>
      <p class="temperature">${temperatura}°C</p>
      <p class="description">${descripcion}</p>
    </div>
  `;
}

/**
 * Muestra un mensaje de error claro y comprensible para el usuario.
 * @param {string} mensaje
 */
function mostrarError(mensaje) {
  contenedorResultado.innerHTML = `
    <p class="error-text">⚠️ ${mensaje}</p>
  `;
}