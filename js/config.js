/**
 * config.js
 * Configuración global de la Escuela de Directores — ANEIAP ICESI
 *
 * IMPORTANTE: reemplaza los valores de SUPABASE_URL y SUPABASE_ANON_KEY
 * con las credenciales de tu propio proyecto de Supabase.
 * Ver README.md, sección "Configuración de Supabase".
 */

const APP_CONFIG = {
  SUPABASE_URL: "TU_SUPABASE_URL_AQUI",
  SUPABASE_ANON_KEY: "TU_SUPABASE_ANON_KEY_AQUI",

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
