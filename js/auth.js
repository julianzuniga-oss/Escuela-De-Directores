/**
 * auth.js
 * Ingreso únicamente por nombre completo. Crea o recupera el registro
 * del participante y lo guarda como "sesión actual" en localStorage.
 */

const Auth = (() => {
  function normalizeName(name) {
    return name.trim().replace(/\s+/g, " ");
  }

  function isValidName(name) {
    const clean = normalizeName(name);
    return clean.length >= 3;
  }

  function getCurrentParticipant() {
    try {
      const raw = localStorage.getItem(APP_CONFIG.STORAGE_CURRENT_PARTICIPANT);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentParticipant(participant) {
    localStorage.setItem(APP_CONFIG.STORAGE_CURRENT_PARTICIPANT, JSON.stringify(participant));
  }

  function logout() {
    localStorage.removeItem(APP_CONFIG.STORAGE_CURRENT_PARTICIPANT);
    window.location.href = "index.html";
  }

  /** Crea el participante si no existe (por nombre, sin distinguir mayúsculas) o recupera el existente. */
  async function loginWithName(rawName) {
    const name = normalizeName(rawName);
    if (!isValidName(name)) {
      throw new Error("El nombre debe tener al menos 3 caracteres.");
    }

    const nameKey = name.toLowerCase();
    const existing = await DB.selectWhere("participants", { name_key: nameKey });

    let participant;
    if (existing && existing.length > 0) {
      participant = existing[0];
      await DB.update("participants", participant.id, { last_activity: new Date().toISOString() });
    } else {
      participant = await DB.insert("participants", {
        name,
        name_key: nameKey,
        last_activity: new Date().toISOString()
      });
      // Inicializar progreso de las 8 sesiones en "No iniciado"
      for (const s of SESSIONS_META) {
        await DB.insert("progress", {
          participant_id: participant.id,
          session_number: s.number,
          status: "no_iniciado"
        });
      }
    }

    setCurrentParticipant(participant);
    return participant;
  }

  /** Protege una página: si no hay sesión activa, redirige al inicio. */
  function requireLogin() {
    const p = getCurrentParticipant();
    if (!p) {
      window.location.href = "index.html";
      return null;
    }
    return p;
  }

  return { normalizeName, isValidName, getCurrentParticipant, setCurrentParticipant, logout, loginWithName, requireLogin };
})();
