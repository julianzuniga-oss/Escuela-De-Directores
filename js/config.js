/**
 * config.js
 * Configuración global de la Escuela de Directores — ANEIAP ICESI
 *
 * IMPORTANTE: reemplaza los valores de SUPABASE_URL y SUPABASE_ANON_KEY
 * con las credenciales de tu propio proyecto de Supabase.
 * Ver README.md, sección "Configuración de Supabase".
 */

const APP_CONFIG = {
  SUPABASE_URL: "https://bofztbwqdezwedabhwqc.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_po5ff3inTXJc_60XbLv_ew_h2dKr7Gs",

  APP_NAME: "Escuela de Directores",
  ORG_NAME: "ANEIAP ICESI",

  // Clave usada en localStorage para guardar el participante actual
  STORAGE_CURRENT_PARTICIPANT: "edad_current_participant",
  // Prefijo para las colas de sincronización offline
  STORAGE_SYNC_PREFIX: "edad_sync_",
  // Prefijo para el respaldo local de cada tabla
  STORAGE_TABLE_PREFIX: "edad_table_",

  TOTAL_SESSIONS: 7
};
