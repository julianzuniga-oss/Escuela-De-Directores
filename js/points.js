/**
 * points.js
 * Puntos por sesión (máx. 1000 cada una), desbloqueo de sesiones y ranking general.
 * Cada sesión se divide en "etapas" (mapa, reto, reflexión...). Los puntos de cada etapa
 * se guardan en scores.detail y la suma es scores.points.
 */
const UNLOCK_CACHE_KEY = "edad_unlock_cache";
const SESSION_MAX_POINTS = 1000;

async function getSessionSettings() {
  let map = {};
  try {
    const rows = await DB.selectAll("session_settings");
    if (rows && rows.length) {
      rows.forEach((r) => (map[r.session_number] = !!r.unlocked));
      localStorage.setItem(UNLOCK_CACHE_KEY, JSON.stringify(map));
      return map;
    }
  } catch (e) {}
  try { map = JSON.parse(localStorage.getItem(UNLOCK_CACHE_KEY) || "{}"); } catch (e) {}
  return map;
}

/** Sin Supabase configurado (pruebas locales) todo queda abierto. */
async function isSessionUnlocked(n) {
  if (!DB.isConfigured()) return true;
  const m = await getSessionSettings();
  return !!m[n];
}

function sumDetail(detail) {
  return Object.entries(detail || {})
    .filter(([k, v]) => !k.endsWith("_done") && typeof v === "number")
    .reduce((a, [, v]) => a + v, 0);
}

async function getScoreRow(pid, session) {
  const rows = await DB.selectWhere("scores", { participant_id: pid, session_number: session });
  return (rows && rows[0]) || null;
}

async function stageState(pid, session) {
  const row = await getScoreRow(pid, session);
  return { row, detail: (row && row.detail) || {} };
}

async function writeStage(pid, session, stage, pts, done, completeSession) {
  const row = await getScoreRow(pid, session);
  const detail = Object.assign({}, (row && row.detail) || {});
  if (detail[stage + "_done"]) return { points: row.points, detail, skipped: true };
  detail[stage] = Math.max(0, Math.round(pts));
  if (done) detail[stage + "_done"] = true;
  const points = Math.min(SESSION_MAX_POINTS, sumDetail(detail));
  const completed = !!(row && row.completed) || !!completeSession;
  const now = new Date().toISOString();
  if (row) await DB.update("scores", row.id, { detail, points, completed, updated_at: now });
  else await DB.insert("scores", { participant_id: pid, session_number: session, detail, points, completed });
  return { points, detail };
}
/** Guarda puntos parciales (marcador en vivo) sin cerrar la etapa. */
const saveStageLive = (pid, s, stage, pts) => writeStage(pid, s, stage, pts, false, false);
/** Cierra la etapa: ya no se puede repetir ni sobrescribir. */
const finishStage = (pid, s, stage, pts, completeSession) => writeStage(pid, s, stage, pts, true, !!completeSession);

/** Marcador de una etapa (para el estilo Kahoot). */
async function kahootBoard(session, stage) {
  const [ps, sc] = await Promise.all([DB.selectAll("participants"), DB.selectWhere("scores", { session_number: session })]);
  const rows = sc
    .filter((s) => s.detail && typeof s.detail[stage] === "number")
    .map((s) => {
      const p = ps.find((x) => x.id === s.participant_id);
      return { id: s.participant_id, name: p ? p.name : "Asociado", pts: s.detail[stage] };
    });
  rows.sort((a, b) => b.pts - a.pts);
  return rows;
}

/** Ranking general: suma de puntos de todas las sesiones. */
async function buildRanking() {
  const [participants, scores] = await Promise.all([DB.selectAll("participants"), DB.selectAll("scores")]);
  const rows = participants.map((p) => {
    const mine = scores.filter((s) => s.participant_id === p.id);
    const bySession = {};
    mine.forEach((s) => (bySession[s.session_number] = s.points));
    return {
      id: p.id, name: p.name, bySession,
      total: mine.reduce((a, s) => a + (s.points || 0), 0),
      done: mine.filter((s) => s.completed).length
    };
  });
  rows.sort((a, b) => b.total - a.total || b.done - a.done || a.name.localeCompare(b.name));
  return { rows };
}

/** Guardado de lienzos (sesiones 1, 2 y 3). Encadena los guardados para evitar duplicados. */
function createCanvasSaver(pid, session, version, initialRow, onStatus) {
  let row = initialRow;
  let chain = Promise.resolve();
  return {
    save(data) {
      chain = chain.then(async () => {
        try {
          onStatus && onStatus("Guardando…");
          if (row) {
            const r = await DB.update("canvas_maps", row.id, { data, updated_at: new Date().toISOString() });
            if (r) row = r;
          } else {
            row = await DB.insert("canvas_maps", { participant_id: pid, session, version, data });
          }
          onStatus && onStatus("Guardado");
        } catch (e) {
          onStatus && onStatus("No se pudo guardar. Revisa tu conexión.");
        }
      });
      return chain;
    },
    row: () => row
  };
}
