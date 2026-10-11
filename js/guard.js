/** guard.js — impide entrar a una sesión que el administrador aún no habilitó. */
window.guardReady = (async function () {
  const m = location.pathname.match(/sesion-(\d+)\.html/);
  if (!m) return true;
  const n = Number(m[1]);
  document.documentElement.style.visibility = "hidden";
  const ok = await isSessionUnlocked(n);
  if (!ok) {
    sessionStorage.setItem("edad_locked_msg", String(n));
    location.replace("dashboard.html");
    return new Promise(() => {}); // nunca continúa: la página redirige
  }
  document.documentElement.style.visibility = "visible";
  return true;
})();
