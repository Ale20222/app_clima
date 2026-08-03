/*
 * Estrategia de almacenamiento: se intenta usar localStorage para que el
 * caché sobreviva a recargas de página. Si no está disponible (modo
 * incógnito restrictivo, vista en iframe con sandbox), se usa
 * automáticamente un Map en memoria como respaldo.
 *
 * IMPORTANTE: la duración de validez NO se fija aquí; cada llamador
 * (api.js) decide cuánto tiempo es "fresco" un dato, porque no todos
 * los datos cambian a la misma velocidad (la precipitación cambia en
 * minutos, el pronóstico de 5 días cambia en horas).
 */

const PREFIJO = "clima_cache_";
const almacenMemoria = new Map();

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
 * Devuelve la entrada completa de caché (datos + timestamp) si existe y
 * sigue siendo válida según `duracionMs`. Devuelve null si no existe,
 * expiró, o está corrupta.
 * @param {string} clave
 * @param {number} duracionMs - cuánto tiempo se considera válido este dato
 * @returns {{datos: any, timestamp: number}|null}
 */
export function obtenerEntradaCache(clave, duracionMs) {
  const ahora = Date.now();

  if (usarLocalStorage) {
    const crudo = window.localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;

    let entrada;
    try {
      entrada = JSON.parse(crudo);
    } catch {
      window.localStorage.removeItem(PREFIJO + clave);
      return null;
    }

    if (ahora - entrada.timestamp > duracionMs) {
      window.localStorage.removeItem(PREFIJO + clave);
      return null;
    }

    return entrada;
  }

  const entrada = almacenMemoria.get(clave);
  if (!entrada) return null;

  if (ahora - entrada.timestamp > duracionMs) {
    almacenMemoria.delete(clave);
    return null;
  }

  return entrada;
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
      return;
    } catch {
      // Cuota excedida u otro fallo: caemos al respaldo en memoria
    }
  }

  almacenMemoria.set(clave, entrada);
}

/**
 * Devuelve la entrada de caché SIN importar si ya expiró.
 *
 * Se usa solo como último recurso cuando la API falla (sin internet, el
 * servidor no responde, etc.): en ese momento es mejor mostrarle al
 * usuario el último dato conocido -aunque esté vencido- que no mostrarle
 * nada. Quien llame a esta función es responsable de avisar al usuario
 * que el dato podría estar desactualizado.
 *
 * @param {string} clave
 * @returns {{datos: any, timestamp: number}|null}
 */
export function obtenerEntradaCacheSinExpirar(clave) {
  if (usarLocalStorage) {
    const crudo = window.localStorage.getItem(PREFIJO + clave);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo);
    } catch {
      return null;
    }
  }

  return almacenMemoria.get(clave) ?? null;
}

/**
 * Borra todas las entradas de caché de esta app (localStorage y memoria).
 * Útil para dar al usuario control sobre sus datos guardados localmente.
 */
export function limpiarCache() {
  if (usarLocalStorage) {
    // Recorremos todas las claves de localStorage y borramos solo las
    // que pertenecen a esta app (con nuestro PREFIJO), sin tocar datos
    // de otras páginas que compartan el mismo origen.
    const clavesABorrar = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const clave = window.localStorage.key(i);
      if (clave && clave.startsWith(PREFIJO)) {
        clavesABorrar.push(clave);
      }
    }
    clavesABorrar.forEach((clave) => window.localStorage.removeItem(clave));
  }

  almacenMemoria.clear();
}

/**
 * Genera una clave de caché consistente combinando el tipo de consulta
 * y la ciudad, normalizada (minúsculas, sin espacios ni tildes) para que
 * "Bogotá", "bogota" y "BOGOTÁ " compartan la misma entrada.
 * @param {string} tipo - ej. "clima" o "pronostico"
 * @param {string} ciudad
 * @returns {string}
 */
export function generarClave(tipo, ciudad) {
  const normalizada = ciudad
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return `${tipo}:${normalizada}`;
}