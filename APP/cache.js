/**
 * cache.js
 * Caché genérico en memoria para resultados de clima/pronóstico.
 *
 * Nota de diseño: se usa un Map en memoria (no localStorage/sessionStorage)
 * para que funcione igual en cualquier entorno JS multiplataforma —
 * navegador de escritorio, móvil, webview embebido, o vistas previas
 * en sandbox donde el almacenamiento del navegador puede no estar
 * disponible o permitido. El costo es que el caché se reinicia si se
 * recarga la página; si tu app corre siempre en un navegador real y
 * quieres que sobreviva a recargas, puedes cambiar `Map` por
 * `localStorage.setItem/getItem` sin tocar el resto del proyecto,
 * ya que solo este archivo conoce el mecanismo de almacenamiento.
 */

const DURACION_CACHE_MS = 60 * 60 * 1000; // 1 hora

// clave -> { datos, timestamp }
const almacenCache = new Map();

/**
 * Devuelve los datos cacheados para una clave si aún son válidos (< 1 hora).
 * @param {string} clave
 * @returns {any|null} los datos, o null si no existen / expiraron
 */
export function obtenerDeCache(clave) {
  const entrada = almacenCache.get(clave);
  if (!entrada) return null;

  const expirado = Date.now() - entrada.timestamp > DURACION_CACHE_MS;
  if (expirado) {
    almacenCache.delete(clave);
    return null;
  }

  return entrada.datos;
}

/**
 * Guarda datos en caché junto con la marca de tiempo actual.
 * @param {string} clave
 * @param {any} datos
 */
export function guardarEnCache(clave, datos) {
  almacenCache.set(clave, { datos, timestamp: Date.now() });
}

/**
 * Genera una clave de caché consistente combinando el tipo de consulta
 * y la ciudad (normalizada a minúsculas y sin espacios extra), para que
 * "Bogotá" y "bogotá " compartan la misma entrada de caché.
 * @param {string} tipo - ej. "clima" o "pronostico"
 * @param {string} ciudad
 * @returns {string}
 */
export function generarClave(tipo, ciudad) {
  return `${tipo}:${ciudad.trim().toLowerCase()}`;
}