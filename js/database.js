/**
 * database.js
 * Capa de acceso a datos. Intenta usar Supabase; si falla (sin conexión,
 * credenciales no configuradas, etc.) cae automáticamente a localStorage
 * y sincroniza en cuanto la conexión vuelve.
 */

const DB = (() => {
  let client = null;
  let ready = false;

  function isConfigured() {
    return (
      APP_CONFIG.SUPABASE_URL &&
      APP_CONFIG.SUPABASE_URL !== "TU_SUPABASE_URL_AQUI" &&
      APP_CONFIG.SUPABASE_ANON_KEY &&
      APP_CONFIG.SUPABASE_ANON_KEY !== "TU_SUPABASE_ANON_KEY_AQUI" &&
      typeof window.supabase !== "undefined"
    );
  }

  function init() {
    if (isConfigured() && !client) {
      try {
        client = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
        ready = true;
      } catch (e) {
        console.error("No se pudo inicializar Supabase:", e);
        ready = false;
      }
    }
    return ready;
  }

  // ---------- Respaldo local ----------
  function localKey(table) {
    return APP_CONFIG.STORAGE_TABLE_PREFIX + table;
  }

  function readLocal(table) {
    try {
      const raw = localStorage.getItem(localKey(table));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function writeLocal(table, rows) {
    try {
      localStorage.setItem(localKey(table), JSON.stringify(rows));
    } catch (e) {
      console.error("No se pudo escribir en localStorage:", e);
    }
  }

  function queueSync(table, row) {
    const key = APP_CONFIG.STORAGE_SYNC_PREFIX + table;
    const queue = JSON.parse(localStorage.getItem(key) || "[]");
    queue.push(row);
    localStorage.setItem(key, JSON.stringify(queue));
  }

  function uuid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  // ---------- API genérica ----------

  /** Inserta un registro. Devuelve el registro insertado (con id). */
  async function insert(table, data) {
    const row = Object.assign({ id: uuid(), created_at: new Date().toISOString() }, data);
    if (init()) {
      try {
        const { data: result, error } = await client.from(table).insert(data).select().single();
        if (error) throw error;
        return result;
      } catch (e) {
        console.warn(`Supabase falló al insertar en ${table}, usando respaldo local.`, e);
        notifySaveFallback();
      }
    }
    const rows = readLocal(table);
    rows.push(row);
    writeLocal(table, rows);
    queueSync(table, row);
    return row;
  }

  /** Actualiza un registro por id. */
  async function update(table, id, data) {
    if (init()) {
      try {
        const { data: result, error } = await client.from(table).update(data).eq("id", id).select().single();
        if (error) throw error;
        return result;
      } catch (e) {
        console.warn(`Supabase falló al actualizar ${table}, usando respaldo local.`, e);
        notifySaveFallback();
      }
    }
    const rows = readLocal(table);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx >= 0) {
      rows[idx] = Object.assign({}, rows[idx], data);
      writeLocal(table, rows);
      return rows[idx];
    }
    return null;
  }

  /** upsert simple: si existe un registro que cumpla `match`, actualiza; si no, inserta. */
  async function upsertMatch(table, match, data) {
    const existing = await selectWhere(table, match);
    if (existing && existing.length > 0) {
      return update(table, existing[0].id, data);
    }
    return insert(table, Object.assign({}, match, data));
  }

  /** Selecciona todos los registros de una tabla. */
  async function selectAll(table) {
    if (init()) {
      try {
        const { data, error } = await client.from(table).select("*");
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn(`Supabase falló al leer ${table}, usando respaldo local.`, e);
      }
    }
    return readLocal(table);
  }

  /** Selecciona registros que cumplan todas las condiciones de `match` (igualdad exacta). */
  async function selectWhere(table, match) {
    if (init()) {
      try {
        let q = client.from(table).select("*");
        Object.entries(match).forEach(([k, v]) => (q = q.eq(k, v)));
        const { data, error } = await q;
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.warn(`Supabase falló al leer ${table}, usando respaldo local.`, e);
      }
    }
    const rows = readLocal(table);
    return rows.filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
  }

  /** Elimina un registro por id. */
  async function remove(table, id) {
    if (init()) {
      try {
        const { error } = await client.from(table).delete().eq("id", id);
        if (error) throw error;
        return true;
      } catch (e) {
        console.warn(`Supabase falló al eliminar en ${table}, usando respaldo local.`, e);
      }
    }
    const rows = readLocal(table).filter((r) => r.id !== id);
    writeLocal(table, rows);
    return true;
  }

  function notifySaveFallback() {
    if (typeof showToast === "function") {
      showToast("No fue posible guardar tu actividad en el servidor. Se guardó localmente e intentará sincronizarse.", "warn");
    }
  }

  /** Intenta reenviar todo lo que quedó pendiente en las colas locales. */
  async function trySyncAll() {
    if (!init()) return;
    const prefix = APP_CONFIG.STORAGE_SYNC_PREFIX;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach(async (key) => {
        const table = key.slice(prefix.length);
        const queue = JSON.parse(localStorage.getItem(key) || "[]");
        if (queue.length === 0) return;
        const remaining = [];
        for (const row of queue) {
          try {
            const { error } = await client.from(table).upsert(row);
            if (error) throw error;
          } catch (e) {
            remaining.push(row);
          }
        }
        localStorage.setItem(key, JSON.stringify(remaining));
      });
  }

  window.addEventListener("online", trySyncAll);
  window.addEventListener("load", () => setTimeout(trySyncAll, 1500));

  return { init, isConfigured, insert, update, upsertMatch, selectAll, selectWhere, remove, trySyncAll };
})();
