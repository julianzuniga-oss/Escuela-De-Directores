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

  TOTAL_SESSIONS: 8
};

const SESSIONS_META = [
  { number: 1, key: "sesion1", title: "¿Qué significa ser director?", short: "Mapa de expectativas frente al liderazgo.", file: "sesion-1.html" },
  { number: 2, key: "sesion2", title: "Conociendo ANEIAP desde adentro", short: "Estructura del capítulo: antes y después.", file: "sesion-2.html" },
  { number: 3, key: "sesion3", title: "Cómo funciona una Junta Capitular", short: "Simulación de decisiones tipo ABCD.", file: "sesion-3.html" },
  { number: 4, key: "sesion4", title: "Planeación estratégica", short: "De un problema a un mini plan de gestión.", file: "sesion-4.html" },
  { number: 5, key: "sesion5", title: "Direcciones ANEIAP", short: "Reto de emparejados con ranking.", file: "sesion-5.html" },
  { number: 6, key: "sesion6", title: "Habilidades de un director", short: "Perfil de habilidades transversales.", file: "sesion-6.html" },
  { number: 7, key: "sesion7", title: "Director por un día", short: "Simulación de gestión bajo presión.", file: "sesion-7.html" },
  { number: 8, key: "sesion8", title: "Mi visión como futuro director", short: "Propuesta personal de dirección.", file: "sesion-8.html" }
];
