# Escuela de Directores — ANEIAP ICESI

Plataforma web institucional para que los asociados de ANEIAP ICESI participen en los 8 espacios de formación de la Escuela de Directores: liderazgo, estructura organizacional, planeación estratégica y dirección.

## 1. Qué es el proyecto

Aplicación web responsive (escritorio, tablet y móvil) donde cada asociado ingresa únicamente con su nombre y avanza por 8 sesiones interactivas: mapas de expectativas y de estructura, evaluaciones tipo ABCD, un reto de planeación estratégica, un juego de emparejados con ranking, un perfil de habilidades, una simulación de gestión ("Director por un día") y una propuesta final de visión de dirección descargable en PDF.

## 2. Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript ES6+ modular (sin frameworks).
- **Backend:** [Supabase](https://supabase.com) (Postgres + API autogenerada) para participantes, progreso, mapas, evaluaciones, ranking y propuestas.
- **Respaldo offline:** si Supabase no responde, la app guarda automáticamente en `localStorage` y sincroniza al recuperar conexión.
- **Despliegue:** GitHub Pages (sitio 100% estático, sin backend propio).

## 3. Estructura del proyecto

```
/
├── index.html            (ingreso solo con nombre)
├── dashboard.html        (las 8 sesiones + progreso)
├── sesion-1.html … sesion-8.html
├── resultados.html       (panel del participante)
├── admin.html            (panel administrativo, no está en el menú)
├── supabase-schema.sql   (tablas + Row Level Security)
├── css/  (styles.css, components.css, responsive.css)
├── js/   (config.js, database.js, auth.js, navigation.js,
│          mapa-builder.js, quiz-engine.js, progress-helper.js,
│          dashboard.js, sesion1.js … sesion8.js, resultados.js, admin.js)
├── data/ (sesiones.json, preguntas.json, direcciones.json, configuracion.json)
└── assets/ (logos/, icons/, images/ — placeholders, ver sección 12)
```

## 4. Instalación

1. Clona o descarga este repositorio.
2. No requiere `npm install`: todo el JavaScript es vanilla y las librerías externas (Supabase JS) se cargan por CDN.
3. Para probar localmente, sirve la carpeta con un servidor simple (los `fetch()` a `/data/*.json` no funcionan abriendo el HTML directamente con `file://`):
   ```bash
   npx serve .
   # o
   python3 -m http.server 8080
   ```

## 5. Configuración de Supabase

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com).
2. En **Project Settings → API**, copia:
   - `Project URL`
   - `anon public key`
3. Ábrelos en `js/config.js` y reemplaza:
   ```js
   SUPABASE_URL: "TU_SUPABASE_URL_AQUI",
   SUPABASE_ANON_KEY: "TU_SUPABASE_ANON_KEY_AQUI",
   ```
   Estas credenciales son públicas por diseño (clave `anon`), igual que en cualquier app frontend de Supabase; el control de acceso real vive en las políticas de Row Level Security (paso siguiente).

## 6. Creación de tablas

En el **SQL Editor** de Supabase, ejecuta el contenido completo de `supabase-schema.sql`. Esto crea las 9 tablas (`participants`, `progress`, `expectation_maps`, `structure_maps`, `evaluations`, `rankings`, `strategic_plans`, `leadership_profiles`, `final_projects`).

## 7. Configuración de Row Level Security (RLS)

El mismo archivo `supabase-schema.sql` activa RLS y crea las políticas necesarias:
- Lectura pública en todas las tablas (necesaria para los paneles colectivos, el ranking y el panel general).
- Escritura pública controlada desde el frontend con la clave `anon` (la interfaz nunca permite editar el registro de otro participante).

Si tu capítulo maneja información especialmente sensible, considera mover las escrituras a una **Edge Function de Supabase** que valide el `participant_id` contra una cookie de sesión antes de escribir.

## 8. Configuración de GitHub Pages

1. Sube el proyecto a un repositorio de GitHub.
2. Ve a **Settings → Pages**.
3. En "Source" selecciona la rama principal (`main`) y la carpeta raíz (`/`).
4. GitHub publicará la app en `https://tuusuario.github.io/tu-repositorio/`.
5. Verifica que `index.html` sea la página de entrada (ya lo es por defecto en Pages).

## 9. Cómo agregar o modificar preguntas

Edita `data/preguntas.json`. Contiene tres bloques: `sesion3` (evaluación de Junta Capitular, modo puntuado), `sesion6` (Decisiones de liderazgo, modo perfil de habilidades) y `sesion7` (Director por un día, modo combinado). Cada pregunta tiene `prompt`, `context` opcional y `options` con `correct` (sesión 3 y 7) y/o `skills` (sesión 6 y 7). El motor (`js/quiz-engine.js`) es genérico: agregar o quitar preguntas no requiere tocar el HTML.

## 10. Cómo modificar actividades

- **Puntuaciones del juego de emparejados (Sesión 5):** ajusta `data/configuracion.json` → `puntuacion.sesion5_acierto` / `sesion5_error`, y refleja el mismo valor en `js/sesion5.js` (`SCORING`).
- **Categorías de los mapas (Sesiones 1 y 2):** son arreglos `CATEGORIES` al inicio de `js/sesion1.js` y `js/sesion2.js`.
- **Textos de portada:** `data/configuracion.json` → `textos_portada`.

## 11. Cómo agregar direcciones

Edita `data/direcciones.json`: cada entrada tiene `nombre`, `descripcion` y `lema`, usados en el reto de emparejados (Sesión 5).

> **Importante:** las descripciones y lemas incluidos en este repositorio son **placeholders** y están marcados como tal en el propio archivo. Debes reemplazarlos con la información oficial vigente de tu capítulo antes de publicar la aplicación.

## 12. Cómo cambiar logos

Coloca los archivos reales en `assets/logos/` (por ejemplo `presidencia.png`, `academica.png`, etc.) y referencia esas rutas desde donde se necesiten. Mientras no existan, la interfaz debe usar el elemento `.logo-placeholder` (círculo con iniciales) definido en `css/components.css` como marcador visual claramente identificado. No se ha inventado ningún logo oficial de ANEIAP en este proyecto.

## 13. Cómo administrar el contenido

El panel `admin.html` (no aparece en el menú de navegación) permite:
- Ver participantes, progreso y ranking.
- Exportar participantes a CSV.
- Consultar el resumen general de la cohorte.

Requiere un usuario de **Supabase Auth** (correo/contraseña) creado desde el Dashboard de Supabase (**Authentication → Users → Add user**) — la contraseña nunca se guarda en el código del frontend. Para modificar preguntas, direcciones, lemas o puntuaciones, edita directamente los archivos en `/data/` (ver secciones 9 a 11); estos no requieren tocar la estructura de la aplicación.

## 14. Seguridad

- El ingreso es únicamente por nombre completo: no se solicitan correos, contraseñas ni documentos de identidad.
- Los datos guardados en `localStorage` son solo un respaldo temporal y se sincronizan con Supabase al recuperar la conexión.
- El panel administrativo está separado de la navegación normal y protegido con Supabase Auth.

## 15. Validación pendiente con documentos oficiales de ANEIAP

Los siguientes contenidos son placeholders y deben validarse contra los documentos oficiales vigentes antes de publicar la Escuela:
- Nombres, descripciones y lemas de las direcciones (`data/direcciones.json`).
- Preguntas y casos de simulación (`data/preguntas.json`) — están redactados como ejemplos plausibles, no como contenido institucional certificado.
- Logotipos (`assets/logos/`).
