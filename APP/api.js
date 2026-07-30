/**
 * api.js
 * Contiene la lógica para comunicarse con las APIs de Open-Meteo.
 * Este archivo NO toca el DOM: solo obtiene datos y los devuelve listos para usar.
 */

// Paso 0: URLs base de las APIs que vamos a consumir
const URL_GEOCODIFICACION = "https://geocoding-api.open-meteo.com/v1/search";
const URL_CLIMA = "https://api.open-meteo.com/v1/forecast";

/**
 * Traduce el código numérico "weathercode" de Open-Meteo a una descripción
 * en español. Basado en la tabla oficial de códigos WMO que usa Open-Meteo.
 * @param {number} codigo
 * @returns {string} descripción en español
 */
function traducirWeatherCode(codigo) {
  const codigos = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna intensa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada intensa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia intensa",
    66: "Lluvia helada ligera",
    67: "Lluvia helada intensa",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada intensa",
    77: "Granos de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    85: "Chubascos de nieve ligeros",
    86: "Chubascos de nieve intensos",
    95: "Tormenta eléctrica",
    96: "Tormenta con granizo ligero",
    99: "Tormenta con granizo intenso",
  };

  // Si el código no está en la tabla, devolvemos un texto genérico
  return codigos[codigo] ?? "Condición desconocida";
}

/**
 * Obtiene el clima actual de una ciudad.
 *
 * @param {string} ciudad - Nombre de la ciudad a consultar.
 * @returns {Promise<{ciudad: string, temperatura: number, descripcion: string}>}
 * @throws {Error} Si la ciudad no existe, la API falla o hay un error de red.
 */
export async function obtenerClima(ciudad) {
  // Validación básica del parámetro de entrada
  if (!ciudad || !ciudad.trim()) {
    throw new Error("Debes ingresar el nombre de una ciudad.");
  }

  // ===== PASO 1: Geocodificación (obtener latitud y longitud) =====
  let datosGeo;
  try {
    const respuestaGeo = await fetch(
      `${URL_GEOCODIFICACION}?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`
    );

    // response.ok verifica que el servidor respondió con un estado 2xx
    if (!respuestaGeo.ok) {
      throw new Error("No se pudo conectar con el servicio de ubicación.");
    }

    datosGeo = await respuestaGeo.json();
  } catch (error) {
    // Captura errores de red (sin internet, dominio caído, CORS, etc.)
    throw new Error("Error de red al buscar la ciudad. Verifica tu conexión.");
  }

  // Validamos que la API haya encontrado resultados para esa ciudad
  if (!datosGeo.results || datosGeo.results.length === 0) {
    throw new Error(`No se encontró la ciudad "${ciudad}". Intenta con otro nombre.`);
  }

  const { latitude: lat, longitude: lon, name: nombreCiudad } = datosGeo.results[0];

  // ===== PASO 2: Obtener el clima con las coordenadas =====
  let datosClima;
  try {
    const respuestaClima = await fetch(
      `${URL_CLIMA}?latitude=${lat}&longitude=${lon}&current_weather=true`
    );

    if (!respuestaClima.ok) {
      throw new Error("No se pudo obtener el clima en este momento.");
    }

    datosClima = await respuestaClima.json();
  } catch (error) {
    throw new Error("Error de red al obtener el clima. Intenta nuevamente.");
  }

  // Validamos que la respuesta tenga la información que necesitamos
  if (!datosClima.current_weather) {
    throw new Error("El servicio de clima no devolvió información válida.");
  }

  const { temperature, weathercode } = datosClima.current_weather;

  // ===== PASO 3: Armar y devolver el objeto final =====
  return {
    ciudad: nombreCiudad,
    temperatura: temperature,
    descripcion: traducirWeatherCode(weathercode),
  };
}