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

// Duración de caché según el tipo de dato (se extrae del prefijo de la clave,
// ej. "clima:bogota" -> "clima"). La temperatura y sobre todo la precipitación
// cambian en minutos, así que el clima actual necesita un TTL mucho más corto
// que el pronóstico de 5 días, que varía más lento.
const DURACIONES_MS = {
  clima: 10 * 60 * 1000,        // 10 minutos
  pronostico: 60 * 60 * 1000,   // 1 hora
};
const DURACION_POR_DEFECTO_MS = 60 * 60 * 1000; // por si aparece un tipo nuevo
const PREFIJO = "clima_cache_";

function duracionParaClave(clave) {
  const tipo = clave.split(":")[0];
  return DURACIONES_MS[tipo] ?? DURACION_POR_DEFECTO_MS;
}

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
 * Devuelve los datos cacheados para una clave si aún son válidos.
 * La duración de validez depende del tipo (ver DURACIONES_MS): el clima
 * actual expira en 10 minutos, el pronóstico en 1 hora.
 *
 * @param {string} clave
 * @returns {{datos: any, edadMs: number}|null} null si no hay caché vigente;
 *   si lo hay, además de los datos se devuelve `edadMs` (hace cuánto se guardó),
 *   útil para mostrarle al usuario "datos de hace X minutos".
 */
export function obtenerDeCache(clave) {
  const ahora = Date.now();
  const duracion = duracionParaClave(clave);

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

    const edadMs = ahora - entrada.timestamp;
    if (edadMs > duracion) {
      window.localStorage.removeItem(PREFIJO + clave);
      return null;
    }

    console.log(`[cache] HIT para "${clave}" (edad: ${Math.round(edadMs / 1000)}s)`);
    return { datos: entrada.datos, edadMs };
  }

  // --- Respaldo en memoria ---
  const entrada = almacenMemoria.get(clave);
  if (!entrada) return null;

  const edadMs = ahora - entrada.timestamp;
  if (edadMs > duracion) {
    almacenMemoria.delete(clave);
    return null;
  }

  console.log(`[cache] HIT (memoria) para "${clave}" (edad: ${Math.round(edadMs / 1000)}s)`);
  return { datos: entrada.datos, edadMs };
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