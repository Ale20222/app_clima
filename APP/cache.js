/**
 * cache.js
 * Caché de resultados de clima/pronóstico con expiración de 1 hora.
 *
 * Estrategia: se intenta usar localStorage para que el caché
 * SOBREVIVA a recargas de página (F5, live-reload de VS Code, etc.),
 * que es el escenario real en el que un usuario prueba "¿esto cachea?".
 * Si localStorage no está disponible (modo incógnito con restricciones,
 * vista previa en un iframe con sandbox, o cualquier entorno que
 * bloquee el almacenamiento del navegador), se usa automáticamente un
 * Map en memoria como respaldo, para que la app nunca se rompa por esto.
 */

const DURACION_CACHE_MS = 60 * 60 * 1000; // 1 hora
const PREFIJO = "clima_cache_";

// Respaldo en memoria (se usa solo si localStorage falla)
const almacenMemoria = new Map();

/**
 * Detecta, una sola vez, si localStorage puede usarse en este entorno.
 */
function localStorageDisponible() {
  try {
    const clavePrueba = "__test_clima__";
    window.localStorage.setItem(clavePrueba, "1");
    window.localStorage.removeItem(clavePrueba);
    return true;
  } catch {
    return false;
  }
}

const usarLocalStorage = typeof window !== "undefined" && localStorageDisponible();

/**
 * Devuelve los datos cacheados para una clave si aún son válidos (< 1 hora).
 * @param {string} clave
 * @returns {any|null}
 */
export function obtenerDeCache(clave) {
  const ahora = Date.now();

  if (usarLocalStorage) {
    const crudo = window.localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;

    let entrada;
    try {
      entrada = JSON.parse(crudo);
    } catch {
      // Dato corrupto: lo eliminamos y actuamos como si no existiera
      window.localStorage.removeItem(PREFIJO + clave);
      return null;
    }

    if (ahora - entrada.timestamp > DURACION_CACHE_MS) {
      window.localStorage.removeItem(PREFIJO + clave);
      return null;
    }

    console.log(`[cache] HIT para "${clave}"`);
    return entrada.datos;
  }

  // --- Respaldo en memoria ---
  const entrada = almacenMemoria.get(clave);
  if (!entrada) return null;

  if (ahora - entrada.timestamp > DURACION_CACHE_MS) {
    almacenMemoria.delete(clave);
    return null;
  }

  console.log(`[cache] HIT (memoria) para "${clave}"`);
  return entrada.datos;
}

/**
 * Guarda datos en caché junto con la marca de tiempo actual.
 * @param {string} clave
 * @param {any} datos
 */
export function guardarEnCache(clave, datos) {
  const entrada = { datos, timestamp: Date.now() };

  if (usarLocalStorage) {
    try {
      window.localStorage.setItem(PREFIJO + clave, JSON.stringify(entrada));
      console.log(`[cache] Guardado "${clave}"`);
      return;
    } catch {
      // Si falla (ej. cuota excedida), caemos al respaldo en memoria
    }
  }

  almacenMemoria.set(clave, entrada);
  console.log(`[cache] Guardado en memoria "${clave}"`);
}

/**
 * Genera una clave de caché consistente combinando el tipo de consulta
 * y la ciudad, normalizada (minúsculas, sin espacios ni tildes extra)
 * para que "Bogotá", "bogotá" y "BOGOTÁ " compartan la misma entrada.
 * @param {string} tipo - ej. "clima" o "pronostico"
 * @param {string} ciudad
 * @returns {string}
 */
export function generarClave(tipo, ciudad) {
  const normalizada = ciudad
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes/diacríticos

  return `${tipo}:${normalizada}`;
}