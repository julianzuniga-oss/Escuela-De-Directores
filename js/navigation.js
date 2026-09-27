/**
 * navigation.js
 * Construye el encabezado/menú en todas las páginas internas (todo menos index.html)
 * y ofrece un sistema de notificaciones ("toasts") institucional.
 */

function renderHeader(activeFile) {
  const mount = document.getElementById("app-header");
  if (!mount) return;

  const participant = Auth.getCurrentParticipant();
  const name = participant ? participant.name : "";

  const links = [
    { file: "dashboard.html", label: "Inicio" },
    { file: "dashboard.html", label: "Sesiones" },
    { file: "resultados.html", label: "Mi progreso" },
    { file: "sesion-5.html", label: "Ranking" }
  ];

  mount.innerHTML = `
    <div class="header-inner">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">ED</span>
        <div class="brand-text">
          <span class="brand-title">Escuela de Directores</span>
          <span class="brand-subtitle">ANEIAP ICESI</span>
        </div>
      </div>

      <nav class="main-nav" id="main-nav">
        ${links
          .map(
            (l) =>
              `<a href="${l.file}" class="${activeFile === l.file ? "active" : ""}">${l.label}</a>`
          )
          .join("")}
      </nav>

      <div class="header-right">
        <span class="participant-name" title="Sesión activa">${name}</span>
        <button class="btn-text" id="logout-btn" type="button">Salir</button>
        <button class="hamburger" id="hamburger-btn" aria-label="Abrir menú" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;

  const hamburger = document.getElementById("hamburger-btn");
  const nav = document.getElementById("main-nav");
  hamburger.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    hamburger.setAttribute("aria-expanded", String(open));
  });

  document.getElementById("logout-btn").addEventListener("click", Auth.logout);
}

/** Muestra una notificación institucional discreta (sin usar alert()). */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

function statusLabel(status) {
  return { no_iniciado: "No iniciado", en_progreso: "En progreso", completado: "Completado" }[status] || "No iniciado";
}
