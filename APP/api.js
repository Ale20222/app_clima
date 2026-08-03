/**
 * api.js
 * Toda la comunicación con las APIs de Open-Meteo:
 * clima actual, pronóstico de 5 días y comparación multi-ciudad.
 * No toca el DOM; solo obtiene y da forma a los datos.
 */

import { obtenerEntradaCache, guardarEnCache, generarClave } from "./cache.js";

// Duraciones de caché por tipo de dato: el clima actual (sobre todo la
// precipitación) cambia mucho más rápido que un pronóstico a 5 días.
const DURACION_CLIMA_MS = 10 * 60 * 1000;       // 10 minutos
const DURACION_PRONOSTICO_MS = 60 * 60 * 1000;  // 1 hora

const URL_GEOCODIFICACION = "https://geocoding-api.open-meteo.com/v1/search";
const URL_CLIMA = "https://api.open-meteo.com/v1/forecast";

/**
 * Traduce el weather_code numérico de Open-Meteo (tabla WMO) a español.
 */
function traducirWeatherCode(codigo) {
  const codigos = {
    0: "Cielo despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado",
    3: "Nublado", 45: "Niebla", 48: "Niebla con escarcha",
    51: "Llovizna ligera", 53: "Llovizna moderada", 55: "Llovizna intensa",
    56: "Llovizna helada ligera", 57: "Llovizna helada intensa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia intensa",
    66: "Lluvia helada ligera", 67: "Lluvia helada intensa",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada intensa",
    77: "Granos de nieve", 80: "Chubascos ligeros", 81: "Chubascos moderados",
    82: "Chubascos violentos", 85: "Chubascos de nieve ligeros",
    86: "Chubascos de nieve intensos", 95: "Tormenta eléctrica",
    96: "Tormenta con granizo ligero", 99: "Tormenta con granizo intenso",
  };
  return codigos[codigo] ?? "Condición desconocida";
}

/**
 * Convierte un nombre de ciudad en coordenadas + nombre normalizado.
 * Compartida por obtenerClima() y obtenerPronostico5Dias().
 * @param {string} ciudad
 * @returns {Promise<{latitude:number, longitude:number, name:string}>}
 */
async function geocodificarCiudad(ciudad) {
  let respuesta;
  try {
    respuesta = await fetch(
      `${URL_GEOCODIFICACION}?name=${encodeURIComponent(ciudad)}&count=1&language=es&format=json`
    );
  } catch {
    throw new Error("Error de red al buscar la ciudad. Verifica tu conexión.");
  }

  if (!respuesta.ok) {
    throw new Error("No se pudo conectar con el servicio de ubicación.");
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error("La respuesta del servicio de ubicación no es válida.");
  }

  if (!datos.results || datos.results.length === 0) {
    throw new Error(`No se encontró la ciudad "${ciudad}". Intenta con otro nombre.`);
  }

  const { latitude, longitude, name } = datos.results[0];
  return { latitude, longitude, name };
}

/**
 * Obtiene el clima ACTUAL de una ciudad: temperatura, descripción,
 * humedad, viento y precipitación. Usa caché de 1 hora.
 *
 * @param {string} ciudad
 * @returns {Promise<{ciudad:string, temperatura:number, descripcion:string,
 *                     humedad:number, viento:number, precipitacion:number}>}
 */
export async function obtenerClima(ciudad, { forzarActualizacion = false } = {}) {
  const ciudadLimpia = ciudad ? ciudad.trim() : "";
  if (!ciudadLimpia) {
    throw new Error("Debes ingresar el nombre de una ciudad.");
  }

  // 1. Revisamos si ya tenemos este resultado en caché y sigue vigente
  //    (salvo que el usuario haya pedido forzar una actualización).
  const clave = generarClave("clima", ciudadLimpia);
  if (!forzarActualizacion) {
    const entradaCache = obtenerEntradaCache(clave, DURACION_CLIMA_MS);
    if (entradaCache) {
      return {
        ...entradaCache.datos,
        _desdeCache: true,
        _cacheTimestamp: entradaCache.timestamp,
      };
    }
  }

  // 2. Geocodificación
  const { latitude: lat, longitude: lon, name: nombreCiudad } =
    await geocodificarCiudad(ciudadLimpia);

  // 3. Clima actual, pidiendo explícitamente humedad, viento y precipitación
  let respuestaClima;
  try {
    respuestaClima = await fetch(
      `${URL_CLIMA}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code` +
      `&timezone=auto`
    );
  } catch {
    throw new Error("Error de red al obtener el clima. Intenta nuevamente.");
  }

  if (!respuestaClima.ok) {
    throw new Error("No se pudo obtener el clima en este momento.");
  }

  let datosClima;
  try {
    datosClima = await respuestaClima.json();
  } catch {
    throw new Error("La respuesta del servicio de clima no es válida.");
  }

  if (!datosClima.current) {
    throw new Error("El servicio de clima no devolvió información válida.");
  }

  const {
    temperature_2m,
    relative_humidity_2m,
    wind_speed_10m,
    precipitation,
    weather_code,
  } = datosClima.current;

  const resultado = {
    ciudad: nombreCiudad,
    temperatura: temperature_2m,
    descripcion: traducirWeatherCode(weather_code),
    humedad: relative_humidity_2m,
    viento: wind_speed_10m,
    precipitacion: precipitation,
  };

  // 4. Guardamos en caché para futuras consultas dentro de los próximos 10 min
  guardarEnCache(clave, resultado);
  return { ...resultado, _desdeCache: false, _cacheTimestamp: Date.now() };
}

/**
 * Obtiene el pronóstico de 5 días de una ciudad. Usa caché de 1 hora.
 *
 * @param {string} ciudad
 * @returns {Promise<{ciudad:string, dias: Array<{fecha:string, tempMax:number,
 *                     tempMin:number, descripcion:string, precipitacion:number}>}>}
 */
export async function obtenerPronostico5Dias(ciudad) {
  const ciudadLimpia = ciudad ? ciudad.trim() : "";
  if (!ciudadLimpia) {
    throw new Error("Debes ingresar el nombre de una ciudad.");
  }

  const clave = generarClave("pronostico", ciudadLimpia);
  const enCache = obtenerDeCache(clave);
  if (enCache) return enCache;

  const { latitude: lat, longitude: lon, name: nombreCiudad } =
    await geocodificarCiudad(ciudadLimpia);

  let respuesta;
  try {
    respuesta = await fetch(
      `${URL_CLIMA}?latitude=${lat}&longitude=${lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
      `&timezone=auto&forecast_days=5`
    );
  } catch {
    throw new Error("Error de red al obtener el pronóstico. Intenta nuevamente.");
  }

  if (!respuesta.ok) {
    throw new Error("No se pudo obtener el pronóstico en este momento.");
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error("La respuesta del pronóstico no es válida.");
  }

  if (!datos.daily) {
    throw new Error("El servicio de pronóstico no devolvió información válida.");
  }

  const { time, weather_code, temperature_2m_max, temperature_2m_min, precipitation_sum } = datos.daily;

  const dias = time.map((fecha, i) => ({
    fecha,
    tempMax: temperature_2m_max[i],
    tempMin: temperature_2m_min[i],
    descripcion: traducirWeatherCode(weather_code[i]),
    precipitacion: precipitation_sum[i],
  }));

  const resultado = { ciudad: nombreCiudad, dias };
  guardarEnCache(clave, resultado);
  return resultado;
}

/**
 * Obtiene el clima actual de varias ciudades en paralelo, para comparación.
 * Si una ciudad falla (no existe, error de red), no rompe las demás:
 * se reporta como un objeto con `error` en lugar de detener todo el lote.
 *
 * @param {string[]} ciudades
 * @returns {Promise<Array<{ciudad:string, temperatura:number, descripcion:string,
 *                    humedad:number, viento:number, precipitacion:number} |
 *                    {ciudad:string, error:string}>>}
 */
export async function obtenerClimaMultiplesCiudades(ciudades) {
  const resultados = await Promise.allSettled(ciudades.map((c) => obtenerClima(c)));

  return resultados.map((resultado, i) => {
    if (resultado.status === "fulfilled") {
      return resultado.value;
    }
    return { ciudad: ciudades[i], error: resultado.reason.message };
  });
}