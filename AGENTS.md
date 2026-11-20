# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

# TITULARES (repo `formacion-ya`) — guía para agentes

PWA de gestión de equipo de fútbol amateur ("Decom FC", antes "Las Condes FC"): plantilla, agenda de partidos, asistencia, pizarra de formación, bitácora en vivo, estadísticas y notificaciones push. Mobile-first.

- Producción: https://formacion-ya.vercel.app (rama `main`)
- Preview: rama `dev` → `formacion-ya-git-dev-z-labs2.vercel.app` (protegido por Vercel SSO; solo el dueño entra)
- Repo: https://github.com/WaltherMoraRivera/Titulares_futbol_app
- Vercel: proyecto `z-labs2/formacion-ya`
- Stack: Next.js 16 (Turbopack, App Router, `params` asíncrono), React 19, TypeScript, Tailwind v4, shadcn/ui sobre Base UI, Zustand, Supabase (Postgres + RLS + Anonymous Auth + Realtime), `web-push`, `dnd-kit`, Framer Motion.

## Primero lee `DOCUMENTACION.md`

Es la fuente de verdad: arquitectura, modelo de datos, RLS, permisos por rol, cada feature (secciones `5.x`), migraciones, variables de entorno y roadmap. Este archivo solo cubre cómo trabajar aquí. Ante una duda de comportamiento, la documentación y el código mandan; si difieren, avisa al usuario.

## Comandos

```bash
npm run dev          # servidor local en http://localhost:3000
npm run build
npx tsc --noEmit     # chequeo de tipos (debe salir limpio)
npm run lint         # ver nota abajo
```

`npm run lint` ya tenía **11 problemas previos** que no son de cambios recientes: `src/features/players/player-form.tsx` y `src/hooks/use-match-events.ts` (regla `set-state-in-effect`) y `supabase/seed-players.js` (`require()`). No los empeores; si tocas esos archivos, no hace falta arreglarlos salvo que te lo pidan.

## Flujo de trabajo obligatorio (dev → preview → confirmación → main)

1. Trabaja y prueba **siempre en la rama `dev`**. Un push a `dev` genera un Preview en Vercel.
2. Verifica que el Preview termine en **Ready**: `npx vercel ls` (la primera línea con `Preview`). Si sigue en `Building`, espera.
3. Avisa al usuario y **espera su confirmación explícita** ("validado", "aprobado", "pasemos a producción", etc.).
4. Solo entonces: `git checkout main && git pull origin main && git merge dev --no-ff`, `git push origin main`, vuelve a `dev`.
5. Confirma que el deploy de `Production` llegue a **Ready** con `npx vercel ls` antes de reportar éxito.

Reglas: nunca hagas push a `main` sin ese visto bueno (tampoco para cambios solo de documentación: pregunta). Nunca `--force` ni `--no-verify`. Prefiere commits nuevos a `--amend`. Agrega archivos por nombre, no `git add -A` (la carpeta `.claude/` es de otra herramienta y está sin trackear a propósito; no la commitees).

Mensajes de commit: en español, ASCII sin tildes (como el historial), primera línea corta y un cuerpo que explique el porqué. No incluyas ninguna línea `Co-Authored-By` de Claude.

**Problema conocido con `git push`:** en esta máquina puede quedarse colgado esperando un login interactivo del credential manager de GitHub que solo el usuario puede completar en su pantalla. Si un push no responde, no reintentes en bucle: avisa al usuario para que complete el login y luego reintenta.

## Supabase: migraciones manuales

No hay service-role key ni CLI de Supabase con sesión en este entorno. **No puedes aplicar cambios de esquema/RLS tú mismo.**

- Crea la migración como archivo en `supabase/migrations/` con el siguiente número (la última es `0014_flexible_match_results.sql`, así que la próxima es `0015_...`), con un comentario inicial que explique el porqué.
- Entrégale al usuario el SQL en el chat para que lo pegue en el SQL Editor de Supabase, y **recuérdaselo antes de que pruebe** cualquier cosa que dependa de él. Las migraciones se corren después del deploy, nunca antes: la UI debe degradar con gracia si la tabla/columna aún no existe.
- No guardes secretos en el repo. `.env.local` (ignorado por git) ya tiene las claves públicas de Supabase y las llaves VAPID; nunca las imprimas ni las commitees.

## Idioma y estilo

- **Todo en español neutro** (UI, mensajes, documentación, respuestas al usuario). **Nunca uses voseo argentino** (vos/sos/tenés/podés/elegí/armá/dale…): usa "tú/usted" ("puedes", "tienes", "elige", "arma"). El usuario lo ha corregido varias veces; revisa tu texto antes de enviarlo.
- Código: sin comentarios salvo que expliquen un porqué no obvio (restricción oculta, workaround). Sin abstracciones ni manejo de errores para casos que no pueden ocurrir.
- Mobile-first: las vistas usan `mx-auto w-full max-w-md p-4`. **Nunca debe haber scroll horizontal** (el vertical sí está bien). Títulos dinámicos van con `min-w-0 flex-1 truncate`; `html, body` tienen `overflow-x: hidden` como red de seguridad.

## Documentación

Tras cada feature o cambio de comportamiento, actualiza `DOCUMENTACION.md` en su estilo: subsección `### 5.x` numerada con modelo de datos, RLS/permisos y una línea "Probado..." con la evidencia real; y añade la migración a la lista de la sección 8. Mantén el árbol de carpetas (sección 3) y el roadmap al día.

## Arquitectura clave (resumen; detalle en `DOCUMENTACION.md`)

- **Auth sin usuario/contraseña**: el usuario ingresa un código de equipo (`claim_team` RPC) sobre una sesión anónima de Supabase. Los códigos están en `teams` (`player_code`, `dt_code`, `admin_code`, `assistant_code`); los valores vigentes figuran en `DOCUMENTACION.md` (sección 8).
- **Roles**: `TeamRole = "player" | "dt" | "admin" | "assistant"` en `src/hooks/use-auth.ts`. `admin` puede previsualizar como `player` o `dt` con el switcher. El rol **efectivo** del asistente se resuelve siempre como `"player"` (hereda todos los chequeos `role === "dt"` sin tocarlos) y la única capacidad extra es el booleano `canLogLiveEvents`, que solo lee la pestaña "En vivo". RLS usa funciones `security definer` (`current_team_id()`, `current_role()`, `is_dt_or_admin()`, `can_log_match_events()`).
- **Estado**: un store Zustand por dominio (`useAuthStore`, `usePlayersStore`, `useMatchesStore`, `usePushNotificationsStore`, `useInstallPromptStore`…) y servicios en `src/services/supabase-*-service.ts`.
- **Bitácora en vivo**: `match_events` (event sourcing: goles, tarjetas, cambios, comentarios y los marcadores `half_time`/`full_time`). El marcador siempre se calcula con `computeScoreFromEvents`; admin puede ingresar el resultado mediante una RPC transaccional que ajusta esos mismos eventos, con goleador y minuto opcionales (5.21). Minutos jugados con `computeMinutesPlayed` (30' por tiempo; partidos sin ningún cambio cargado quedan fuera de la estadística, decisión del usuario). Realtime por Postgres Changes en `use-match-events.ts`.
- **Push**: ruta `src/app/api/notify-match/route.ts` con `web-push` y llaves VAPID; solo DT/admin pueden dispararla (autorización vía RLS con el token de quien llama, no con service role).

## Cómo probar en el navegador

Para cambios de UI, levanta `npm run dev` y pruébalo de verdad (golden path y bordes), idealmente en 375×812 y 320×568. Inicia sesión con el código de **admin** (figura en `DOCUMENTACION.md`, sección 5.14): entra como DT y permite alternar a vista Jugador. Ojo: cualquier acción de escritura que hagas con esa cuenta **queda escrita en la base real de producción**, igual que si la hiciera el DT; evita ensuciar datos y borra lo que crees para probar.

Para verificar que no hay desbordamiento horizontal, compara `document.documentElement.scrollWidth` con `clientWidth` en cada ruta. Los selects de Base UI se abren de forma poco fiable con clicks por coordenadas: haz una captura justo antes de clicar o usa referencias frescas del árbol de accesibilidad.

Entorno: Windows 11 con Git Bash/PowerShell; git avisa de conversión LF→CRLF, es inofensivo.

## Pendientes abiertos (no actuar sin que el usuario lo pida)

1. **`claim_player` permite "robar" un perfil ya reclamado** por otra sesión (la UI solo muestra la etiqueta "Ya reclamado"). Falta validar en la RPC; ver `DOCUMENTACION.md` 5.19.
2. **Notificación del día del partido**: el usuario aún no decide entre un cron automático (~7am; requeriría añadir la service-role key de Supabase como secreto y manejar huso horario/límites del plan de Vercel) o mantener el botón manual del DT/admin. **No implementes ninguna de las dos sin preguntar.**
