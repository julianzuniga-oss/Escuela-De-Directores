/**
 * auth.js — Registro e ingreso con correo y contraseña (Supabase Auth).
 * Si Supabase no está configurado, funciona en "modo local" solo para pruebas.
 */
const Auth = (() => {
  const keyName = () => APP_CONFIG.STORAGE_CURRENT_PARTICIPANT;
  const cleanName = (n) => String(n || "").trim().replace(/\s+/g, " ");
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  function mode() {
    const u = APP_CONFIG.SUPABASE_URL, k = APP_CONFIG.SUPABASE_ANON_KEY;
    const set = u && u !== "TU_SUPABASE_URL_AQUI" && k && k !== "TU_SUPABASE_ANON_KEY_AQUI";
    if (!set) return "local";
    return typeof window.supabase === "undefined" ? "broken" : "supabase";
  }
  function client() { return mode() === "supabase" ? DB.getClient() : null; }

  function allowedDomains() { return typeof ALLOWED_EMAIL_DOMAINS !== "undefined" ? ALLOWED_EMAIL_DOMAINS : []; }
  function domainOk(email) {
    const list = allowedDomains();
    if (!list.length) return true;
    const dom = email.split("@")[1].toLowerCase();
    return list.some((d) => { d = d.toLowerCase().replace(/^@/, ""); return dom === d || dom.endsWith("." + d); });
  }

  function getCurrentParticipant() {
    try { const raw = localStorage.getItem(keyName()); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function setCurrentParticipant(p) {
    const c = Object.assign({}, p); delete c.pw;
    localStorage.setItem(keyName(), JSON.stringify(c));
  }

  function translate(err) {
    const m = (err && err.message) || String(err);
    if (/Invalid login credentials/i.test(m)) return new Error("Correo o contraseña incorrectos.");
    if (/already registered|already been registered/i.test(m)) return new Error("Este correo ya está registrado. Ingresa con tu contraseña o recupérala.");
    if (/Email not confirmed/i.test(m)) return new Error("Debes confirmar tu correo. Revisa tu bandeja de entrada (y spam).");
    if (/rate limit|too many/i.test(m)) return new Error("Demasiados intentos o correos enviados. Espera unos minutos e inténtalo de nuevo.");
    if (/Password should be/i.test(m)) return new Error("La contraseña es demasiado corta o débil.");
    if (/Failed to fetch|NetworkError/i.test(m)) return new Error("No hay conexión con el servidor. Revisa tu internet.");
    if (/Signups not allowed|signup is disabled/i.test(m)) return new Error("El registro está deshabilitado en Supabase (Authentication → Sign In / Providers).");
    return new Error(m);
  }

  /** Busca el perfil de participante del usuario; si no existe lo crea (solo si se registró desde la app). */
  async function ensureParticipant(user, extra) {
    let rows = await DB.selectWhere("participants", { user_id: user.id });
    if (rows.length) return rows[0];
    const meta = user.user_metadata || {};
    const name = (extra && extra.name) || meta.name;
    if (!name) throw new Error("Esta cuenta no tiene perfil de participante. Usa «Crear cuenta» para registrarte.");
    const chapter = (extra && extra.chapter) || meta.chapter || null;
    await DB.insert("participants", { user_id: user.id, name, chapter, last_activity: new Date().toISOString() });
    rows = await DB.selectWhere("participants", { user_id: user.id });
    if (!rows.length) throw new Error("No se pudo crear tu perfil. Verifica que el SQL de la base de datos esté ejecutado e inténtalo de nuevo.");
    const p = rows[0];
    await DB.insert("participant_emails", { participant_id: p.id, email: user.email });
    for (const s of ESCUELA_SESIONES) {
      await DB.insert("progress", { participant_id: p.id, session_number: s.number, status: "no_iniciado" });
    }
    return p;
  }

  // ---------- modo local (solo pruebas, sin Supabase) ----------
  async function localRegister(f) {
    const rows = await DB.selectWhere("participants", { email: f.email });
    if (rows.length) throw new Error("Este correo ya está registrado. Ingresa con tu contraseña.");
    const p = await DB.insert("participants", { name: f.name, chapter: f.chapter, email: f.email, pw: f.password, last_activity: new Date().toISOString() });
    for (const s of ESCUELA_SESIONES) await DB.insert("progress", { participant_id: p.id, session_number: s.number, status: "no_iniciado" });
    setCurrentParticipant(p);
    return { participant: p };
  }
  async function localLogin(email, password) {
    const rows = await DB.selectWhere("participants", { email });
    if (!rows.length || rows[0].pw !== password) throw new Error("Correo o contraseña incorrectos.");
    setCurrentParticipant(rows[0]);
    return rows[0];
  }

  // ---------- API pública ----------
  async function register(f) {
    const name = cleanName(f.name), email = String(f.email || "").trim().toLowerCase(), password = f.password || "", chapter = f.chapter;
    if (name.length < 5 || name.indexOf(" ") === -1) throw new Error("Escribe tu nombre completo (nombre y apellido).");
    if (typeof CAPITULOS !== "undefined" && CAPITULOS.length && CAPITULOS.indexOf(chapter) === -1) throw new Error("Selecciona tu capítulo.");
    if (!validEmail(email)) throw new Error("Escribe un correo válido.");
    if (!domainOk(email)) throw new Error("Usa tu correo ANEIAP para crear tu cuenta.");
    if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
    const c = client();
    if (!c) return localRegister({ name, email, password, chapter });
    const { data, error } = await c.auth.signUp({
      email, password,
      options: { data: { name, chapter }, emailRedirectTo: new URL("index.html", location.href).href }
    });
    if (error) throw translate(error);
    if (!data.session) return { needsConfirm: true };
    const p = await ensureParticipant(data.user, { name, chapter });
    setCurrentParticipant(p);
    return { participant: p };
  }

  async function login(emailRaw, password) {
    const email = String(emailRaw || "").trim().toLowerCase();
    if (!validEmail(email) || !password) throw new Error("Escribe tu correo y tu contraseña.");
    const c = client();
    if (!c) return localLogin(email, password);
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw translate(error);
    let p;
    try { p = await ensureParticipant(data.user); }
    catch (e) { await c.auth.signOut(); throw e; }
    DB.update("participants", p.id, { last_activity: new Date().toISOString() });
    setCurrentParticipant(p);
    return p;
  }

  /** Si hay una sesión de Supabase activa, recupera (o crea) el perfil de participante. */
  async function restoreFromSession() {
    const c = client();
    if (!c) return getCurrentParticipant();
    const { data } = await c.auth.getSession();
    if (!data.session) return null;
    const cur = getCurrentParticipant();
    if (cur && cur.user_id === data.session.user.id) return cur;
    try {
      const p = await ensureParticipant(data.session.user);
      setCurrentParticipant(p);
      return p;
    } catch (e) { return null; }
  }

  async function hasSession() {
    const c = client();
    if (!c) return true;
    const { data } = await c.auth.getSession();
    return !!data.session;
  }

  async function logout() {
    const c = client();
    try { if (c) await c.auth.signOut(); } catch (e) {}
    localStorage.removeItem(keyName());
    window.location.href = "index.html";
  }

  async function resetPassword(emailRaw) {
    const email = String(emailRaw || "").trim().toLowerCase();
    if (!validEmail(email)) throw new Error("Escribe un correo válido.");
    const c = client();
    if (!c) throw new Error("La recuperación de contraseña solo está disponible con Supabase configurado.");
    const { error } = await c.auth.resetPasswordForEmail(email, { redirectTo: new URL("restablecer.html", location.href).href });
    if (error) throw translate(error);
  }
  async function updatePassword(newPass) {
    const c = client();
    if (!c) throw new Error("Supabase no está configurado.");
    const { error } = await c.auth.updateUser({ password: newPass });
    if (error) throw translate(error);
  }

  /** Protege una página: sin sesión activa vuelve al inicio. */
  function requireLogin() {
    const p = getCurrentParticipant();
    if (!p) { window.location.href = "index.html"; return null; }
    const c = client();
    if (c) {
      c.auth.getSession().then(({ data }) => {
        if (!data.session) { localStorage.removeItem(keyName()); window.location.href = "index.html"; }
      });
    }
    return p;
  }

  return { mode, getCurrentParticipant, setCurrentParticipant, register, login, logout, restoreFromSession, hasSession, resetPassword, updatePassword, requireLogin };
})();
