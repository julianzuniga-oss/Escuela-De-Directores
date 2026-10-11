/**
 * sessions-meta.js
 * Definición de las 7 capacitaciones de la Escuela de Directores.
 * Para cambiar nombres, temas o fases edita este archivo.
 */
const ESCUELA_SESIONES = [
  { number: 1, fase: "Fase 1", title: "Apertura y bienvenida",
    topics: ["Historia ANEIAP e historia seccional", "Capacitación de bienvenida", "Presentación de herramientas"],
    activity: "Mapa de expectativas en lienzo libre", file: "sesion-1.html" },
  { number: 2, fase: "Fase 2", title: "Conoce los cargos #1",
    topics: ["Académico", "Comunicaciones", "Desarrollo", "Finanzas"],
    activity: "Mapa de estructura inicial + reto de cargos", file: "sesion-2.html" },
  { number: 3, fase: "Fase 2", title: "Conoce los cargos #2",
    topics: ["Mercadeo", "Presidencia", "Interventoría", "Proyectos"],
    activity: "Reto de cargos + mapa de estructura final", file: "sesion-3.html" },
  { number: 4, fase: "Fase 2", title: "Foro de liderazgo y habilidades blandas",
    topics: ["Foro de liderazgo"],
    activity: "Reto de habilidades + reflexión del foro", file: "sesion-4.html" },
  { number: 5, fase: "Fase 2", title: "Normativa",
    topics: ["Código de ética", "Membresía"],
    activity: "Reto de normativa", file: "sesion-5.html" },
  { number: 6, fase: "Fase 2", title: "CMI, PLANEIAP, PG",
    topics: [],
    activity: "Construye tu plan de gestión", file: "sesion-6.html" },
  { number: 7, fase: "Fase 3", title: "Cierre",
    topics: ["Integración", "Juego de roles"],
    activity: "Juego de roles + mi visión de dirección", file: "sesion-7.html" }
];
const ESCUELA_TOTAL = ESCUELA_SESIONES.length;
// Fila especial de session_settings (session_number = 99): "Escuela cerrada / ganador declarado"
const ESCUELA_CIERRE_KEY = 99;
