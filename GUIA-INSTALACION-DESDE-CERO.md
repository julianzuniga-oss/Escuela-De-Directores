# Guía: instalar la Escuela de Directores desde cero (v2)

Sigue los pasos en orden. Tiempo aproximado: 20 minutos.

---
## PARTE A — Supabase (borrar lo anterior y crear lo nuevo)

### A1. Crear el usuario administrador
1. Supabase → **Authentication → Users → Add user → Create new user**.
2. Escribe un **correo** y una **contraseña** que recuerdes.
3. Marca **Auto Confirm User** y crea el usuario.
   (Si ya tenías un usuario administrador y quieres usar el mismo, sáltate este paso.)

### A2. Reset de la base de datos
1. Abre el archivo **`supabase-reset-completo.sql`** en un editor de texto.
2. Busca `TU_CORREO_ADMIN@ejemplo.com` (aparece **2 veces**, al final) y reemplázalo por el correo del paso A1, **exactamente igual**.
3. Supabase → **SQL Editor → New query**, pega TODO el contenido y pulsa **Run**.
4. Debe decir **Success**. Esto borra todas las tablas y datos anteriores y crea las nuevas.
5. Verifica en **Table Editor** que existan 9 tablas: `participants`, `progress`, `canvas_maps`, `scores`, `session_settings`, `evaluations`, `strategic_plans`, `leadership_profiles`, `final_projects`. La tabla `session_settings` debe tener 8 filas (sesiones 1 a 7 y la 99), todas en `false`.

### A3. Copiar tus credenciales
**Project Settings → API**: copia el **Project URL** y la clave **anon public**.

---
## PARTE B — GitHub (borrar lo anterior y subir lo nuevo)

### B1. Borrar los archivos antiguos del repositorio
Opción 1 (más simple): crea un **repositorio nuevo** vacío y úsalo (recuerda activar Pages ahí).
Opción 2: en el repositorio actual, entra a cada archivo y carpeta antigua → **⋯ → Delete** → Commit. Borra todo (incluida la carpeta `js`, `css`, `data`, `assets` y los `sesion-*.html`).

### B2. Subir la versión nueva
1. Descomprime `escuela-directores-aneiap-icesi-v2.zip`.
2. Abre **`js/config.js`** y escribe tus credenciales:
   ```js
   SUPABASE_URL: "https://xxxxxxxx.supabase.co",
   SUPABASE_ANON_KEY: "tu-clave-anon-public",
   ```
3. En el repositorio: **Add file → Upload files**. Arrastra **el contenido** de la carpeta `escuela-directores` (no la carpeta misma: `index.html` debe quedar en la raíz) y haz Commit.
4. **Settings → Pages**: Source = rama `main`, carpeta `/ (root)` → Save.
5. Espera 1–2 minutos. La Escuela quedará en `https://TU_USUARIO.github.io/TU_REPO/`.

---
## PARTE C — Verificación (haz esto antes del primer día)

1. Abre `https://TU_USUARIO.github.io/TU_REPO/admin.html` → inicia sesión con el correo y contraseña de A1.
2. En **Habilitar sesiones**, activa la Sesión 1.
3. En otra pestaña (o desde el celular) entra a la Escuela con un nombre de prueba: debes ver la Sesión 1 abierta y las demás en gris.
4. Prueba el lienzo, finaliza la Sesión 1 y mira que aparezca el puntaje en **Ranking**.
5. Borra los datos de prueba (ver Parte D).

---
## PARTE D — Limpiar datos de prueba sin borrar la estructura
Supabase → SQL Editor:
```sql
truncate table participants cascade;   -- borra participantes, progreso, puntos, mapas y resultados
update session_settings set unlocked = false, unlocked_at = null;   -- vuelve a bloquear todas las sesiones
```

---
## PARTE E — Día a día
- Cada día de capacitación: `admin.html` → activa la sesión que corresponde.
- Durante la sesión presencial: **Ranking → Modo proyección** (o `ranking.html?proyeccion=1`).
- Al final de las 7 sesiones: `admin.html` → **Cerrar la Escuela y declarar ganador**.
- Descargar resultados: `admin.html` → **Exportar ranking (CSV)**.

---
## Problemas frecuentes
| Síntoma | Causa y solución |
|---|---|
| No puedo entrar a `admin.html` | El usuario se crea en Authentication → Users (no es tu cuenta de Supabase). El correo debe ser idéntico al del SQL. |
| "Email not confirmed" | Abre el usuario en Authentication → Users y confírmalo, o créalo con Auto Confirm User. |
| Todas las sesiones aparecen bloqueadas | Es lo normal al inicio: habilítalas desde `admin.html`. |
| Al habilitar sesión sale error de permisos | El correo del SQL no coincide con el del usuario admin. Corrige el correo y vuelve a ejecutar solo la política: `drop policy "solo admin escribe" on session_settings;` y créala otra vez con el correo correcto. |
| Pantalla en blanco o "No fue posible guardar" | Revisa `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `js/config.js`. |
| Un asociado de prueba aparece con errores tras el reset | Debe pulsar **Salir** y volver a ingresar (su navegador guardaba un registro antiguo). |
| Los logos no se ven | Sube los archivos a `assets/logos/` y escribe el nombre en `data/logos.json` (campo `archivo`). |
