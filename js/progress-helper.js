/**
 * progress-helper.js
 * Actualiza el estado de avance (no_iniciado / en_progreso / completado)
 * de una sesión para el participante actual.
 */
async function setSessionStatus(participantId, sessionNumber, status) {
  const rows = await DB.selectWhere("progress", { participant_id: participantId, session_number: sessionNumber });
  const data = { status };
  if (status === "completado") data.completed_at = new Date().toISOString();

  if (rows && rows.length > 0) {
    await DB.update("progress", rows[0].id, data);
  } else {
    await DB.insert("progress", Object.assign({ participant_id: participantId, session_number: sessionNumber }, data));
  }
}

async function markInProgressOnce(participantId, sessionNumber) {
  const rows = await DB.selectWhere("progress", { participant_id: participantId, session_number: sessionNumber });
  if (!rows || rows.length === 0 || rows[0].status === "no_iniciado") {
    await setSessionStatus(participantId, sessionNumber, "en_progreso");
  }
}
