# Escuela de Directores — ANEIAP ICESI (v2)

Plataforma web para las 7 capacitaciones de la Escuela de Directores. HTML/CSS/JS sin frameworks + Supabase, publicable en GitHub Pages.

## Sesiones
| # | Fase | Capacitación | Actividad (puntos máx. 1000) |
|---|------|--------------|------------------------------|
| 1 | 1 | Apertura y bienvenida | Mapa de expectativas en **lienzo libre** |
| 2 | 2 | Conoce los cargos #1 | Mapa de estructura inicial (300) + reto Kahoot de cargos (700) |
| 3 | 2 | Conoce los cargos #2 | Reto Kahoot (600) + mapa de estructura final y comparación (400) |
| 4 | 2 | Foro de liderazgo y habilidades blandas | Reto Kahoot de habilidades (700) + reflexión del foro (300) |
| 5 | 2 | Normativa | Reto Kahoot de ética y membresía (1000) |
| 6 | 2 | CMI, PLANEIAP, PG | Plan de gestión con perspectivas CMI y matriz de priorización (PDF) |
| 7 | 3 | Cierre | Juego de roles (600) + Mi visión de dirección (400, PDF) |

Cada sesión otorga hasta 1000 puntos (máximo 7000). El **ranking general** suma todo; desde el panel admin puedes "cerrar la Escuela" para declarar al ganador. Los retos solo se juegan una vez.

## Instalación y Supabase
1. Sube el proyecto a GitHub y activa **Settings → Pages** (rama main, carpeta raíz).
2. En `js/config.js` escribe `SUPABASE_URL` y `SUPABASE_ANON_KEY` (**Project Settings → API**).
3. En Supabase → **SQL Editor** ejecuta, en orden: `supabase-schema.sql` y luego `supabase-migracion-v2.sql`.
   - Antes del segundo, reemplaza `TU_CORREO_ADMIN@ejemplo.com` (2 veces) por el correo de tu usuario administrador.
4. Pruebas locales: `python3 -m http.server 8000` y abre `http://localhost:8000`.

> Si actualizas desde la v1: **conserva tu `js/config.js`** (con tus credenciales). Los demás archivos se reemplazan.

## Panel de administrador (`admin.html`)
No está en el menú; la dirección es `https://TU_USUARIO.github.io/TU_REPO/admin.html`.
1. Supabase → **Authentication → Users → Add user → Create new user**: correo + contraseña, marcando **Auto Confirm User**. (No es tu cuenta de Supabase.)
2. Ese correo debe ser el mismo que pusiste en `supabase-migracion-v2.sql`.
3. Entra a `admin.html` con ese correo y contraseña.
4. **Habilitar sesiones**: cada interruptor abre o bloquea una sesión. Todas inician bloqueadas: habilita la Sesión 1 para empezar.
Si falla, la pantalla muestra el motivo exacto del error.

## Contenido editable
- `data/preguntas.json`: retos de las sesiones 2 a 5 y 7 (cada pregunta con 4 opciones; `correct` o `skills`).
- `data/logos.json`: logos de la paleta (siglas y colores). Para usar un logo real, súbelo a `assets/logos/` y escribe el nombre en `archivo`.
- `data/estructura_referencia.json`: elementos que cuentan como "identificados" en el mapa de estructura.
- `js/sessions-meta.js`: nombres, temas y fases de las sesiones.

## Pendiente de validar con documentos oficiales de ANEIAP
Los casos de `preguntas.json` (funciones de cada cargo, ética, membresía), los logos y las referencias de estructura son **ejemplos/placeholders**. Valídalos antes de usar la Escuela.

## Seguridad (limitaciones)
El ingreso es solo por nombre y se usa la clave `anon`, por lo que las políticas permiten escritura pública en tablas de participantes: alguien con conocimientos técnicos podría alterar puntajes. Solo el administrador puede cambiar qué sesiones están habilitadas. Para un evento con premio, revisa los puntajes en el panel admin.
