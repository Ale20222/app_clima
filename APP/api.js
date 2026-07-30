/**
 * api.js
 * Se encarga de toda la comunicación con las APIs externas de Open-Meteo.
 * No toca el DOM: solo pide datos y los retorna (o lanza errores controlados).
 */

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

/**
 * Traduce el "weather code" numérico de Open-Meteo a una descripción legible.
 * Referencia: tabla WMO Weather interpretation codes usada por Open-Meteo.
 */
function getWeatherDescription(code) {
  const weatherCodes = {
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

  return weatherCodes[code] ?? "Condición desconocida";
}

/**
 * Obtiene el clima actual para una ciudad dada.
 *
 * @param {string} cityName - Nombre de la ciudad a buscar.
 * @returns {Promise<{city: string, country: string, temperature: number, description: string}>}
 * @throws {Error} Con un mensaje claro si la ciudad no existe o falla la petición.
 */
export async function getWeatherByCity(cityName) {
  if (!cityName || !cityName.trim()) {
    throw new Error("Debes ingresar el nombre de una ciudad.");
  }

  // 1. Geocodificación: convertir el nombre de la ciudad en coordenadas
  let geoData;
  try {
    const geoResponse = await fetch(
      `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1&language=es&format=json`
    );

    if (!geoResponse.ok) {
      throw new Error("No se pudo conectar con el servicio de ubicación.");
    }

    geoData = await geoResponse.json();
  } catch (error) {
    // Errores de red (sin internet, CORS, etc.)
    throw new Error("Error de red al buscar la ciudad. Verifica tu conexión.");
  }

  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`No se encontró la ciudad "${cityName}". Intenta con otro nombre.`);
  }

  const { latitude, longitude, name, country } = geoData.results[0];

  // 2. Clima: usar las coordenadas obtenidas para pedir el clima actual
  let weatherData;
  try {
    const weatherResponse = await fetch(
      `${WEATHER_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    );

    if (!weatherResponse.ok) {
      throw new Error("No se pudo obtener el clima en este momento.");
    }

    weatherData = await weatherResponse.json();
  } catch (error) {
    throw new Error("Error de red al obtener el clima. Intenta nuevamente.");
  }

  if (!weatherData.current_weather) {
    throw new Error("El servicio de clima no devolvió información válida.");
  }

  const { temperature, weathercode } = weatherData.current_weather;

  // 3. Retornar un objeto ya "listo" para que app.js solo lo renderice
  return {
    city: name,
    country: country ?? "",
    temperature,
    description: getWeatherDescription(weathercode),
  };
}