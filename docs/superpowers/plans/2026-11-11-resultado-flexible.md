# Plan de implementacion: resultado flexible

> Ejecucion: `superpowers:executing-plans`, en esta sesion, autorizada por el usuario.

**Objetivo:** permitir que admin guarde el resultado y complete goleadores sin exigir minutos.
**Arquitectura:** reutilizar goles de `match_events`, con una RPC transaccional exclusiva de admin que guarde tambien `match_results`. Un formulario mantiene un borrador hasta guardar.
**Stack:** Next.js 16, React 19, TypeScript, Supabase, componentes Base UI existentes; sin dependencias nuevas.
**Diseno:** `docs/superpowers/specs/2026-11-11-resultado-flexible-design.md` (aprobado).

## Restricciones

- Trabajar en `dev`, preservar `.claude/` y los datos reales.
- Espanol neutro; probar 375x812 y 320x568 sin scroll horizontal.
- Migracion manual despues del deploy; nunca promover a main sin confirmacion del usuario.

## Riesgos que comprobar

1. Reducir un marcador con goles identificados no debe elegir goleadores para borrar automaticamente.
2. Asignar un goleador no debe duplicar un gol ni perder su minuto o nota.
3. Edicion concurrente debe rechazar el borrador desactualizado sin escrituras parciales.
4. DT, asistente y jugador no pueden ejecutar la operacion administrativa.
5. Goles sin minuto no deben presentarse como si ocurrieran en el primer tiempo.

## Tarea 1: borrador y persistencia atomica

Archivos: `src/utils/match-result-draft.ts`, su prueba `.test.ts`, `src/services/supabase-match-service.ts`, `supabase/migrations/0014_flexible_match_results.sql`.

Interfaz: `GoalDraft { id: string | null; side: EventSide; player: EventParticipant | null }`; `resizeGoals(goals, side, score)` conserva goles identificados y devuelve cuantos faltan por quitar expresamente. `saveFlexibleMatchResult(matchId, goals, expectedEvents, expectedResultUpdatedAt, notes)` guarda y devuelve `MatchResult`.

- [x] Escribir y observar fallar pruebas del borrador: aumentar 0 a 3, reducir sin asignar primero, conservar IDs/goleadores y exigir seleccion con tres goleadores al bajar a dos; rechazar negativos y decimales.
- [x] Implementar el helper minimo y ejecutar seis pruebas con el runner de Node 24 (borrado nativo de tipos, sin compilacion ni dependencias nuevas).
- [x] Crear RPC: validar admin/equipo/jugadores, comparar snapshot de goles y version de resultado, preservar datos conocidos, guardar en transaccion. Servicio transforma el snapshot y presenta errores comprensibles, incluida migracion pendiente.
- [x] Probar SQL en PostgreSQL temporal PGlite: ocho casos pasan; nunca se aplico migracion remota.

## Tarea 2: formulario y lectores

Archivos: `src/features/matches/match-result-editor.tsx`, `src/app/matches/[id]/result/page.tsx`, `src/hooks/use-match-events.ts`, `src/features/matches/live-match-panel.tsx`.

Interfaz: formulario recibe eventos, resultado, notas, plantilla, partido y callback de guardado; captura snapshot al abrir. El guardado refresca eventos, resultado local y resultado del store de partidos.

- [x] Integrar controles admin en Resultado, sin cambiar el flujo del DT. Mostrar goles propios y rivales, conteo, seleccion de goleador propio, confirmacion de goles a quitar y cancelar sin escrituras.
- [x] Manejar errores/carga de eventos para impedir editar desde una bitacora que no se pudo leer. Incluir UPDATE en Realtime y conservar borrador durante cambios remotos.
- [x] Mostrar "Sin asignar" y separar eventos sin minuto de la cronologia por tiempos.
- [x] Ejecutar pruebas del borrador, tipos y lint de archivos cambiados (el hook conserva un error previo).

## Tarea 3: verificacion, documentacion y Preview

- [x] Probar navegador en ambos tamanos: permisos por rol, 3-2, 0-0, reducciones, asignacion repetida, cancelacion y error de migracion pendiente; sin escribir en Supabase real.
- [x] Ejecutar build, tipos y lint completo: sin errores nuevos; permanecen 10 errores y una advertencia previos.
- [x] Actualizar `DOCUMENTACION.md`, diseno y este registro con evidencia real.
- [x] Solicitar una revision independiente del cambio completo, resolver sus tres hallazgos P2 y comprobarlos.
- [ ] Commit en espanol ASCII, push a `dev` y verificar Preview Ready con Vercel. Entregar SQL y pedir validacion del Preview; no tocar main.

## Registro de ejecucion

- Inicio: `dev`, sin cambios versionados; solo `.claude/` y el diseno nuevo sin seguimiento. Se trabaja en el checkout actual por instruccion del repositorio; no se crea otra rama ni worktree.
- El usuario ya aprobo el diseno y autorizo continuar con el desarrollo; no se solicita una aprobacion intermedia adicional del plan.
- Decision: usar `EventParticipant` en el borrador para proteger tambien goles del rival identificados por dorsal/nombre. El servicio envia solo la asignacion editable; SQL conserva el resto.
- Decision: marcador entre 0 y 99 por equipo en UI/helper/SQL para evitar asignaciones masivas accidentales. Riesgo: un resultado real mayor no se puede cargar con este editor.
- Verificacion SQL: dependencia PGlite instalada solo en una carpeta temporal, fuera del proyecto. No se agregaron dependencias a package.json.
- Entorno: Turbopack dev fallo al lanzar el proceso CSS; QA local usa `next dev --webpack` sin cambiar configuracion. `npm run build` con Turbopack paso.
- Revision independiente: tres hallazgos P2, resueltos en una pasada. Prueba de goleador eliminado observada fallar y pasar; prueba UI de minutos observada fallar antes de mostrar minuto/nota; SQL de concurrencia comprueba recuperacion con snapshot fresco y mensaje de recarga. Sin cambios en reclamo de perfiles, sincronizacion preexistente del flujo DT ni bloqueo global documentado.
- No hay hallazgos menores diferidos de la revision. Realtime real y RPC contra Supabase quedan pendientes de migracion manual y validacion del usuario.
- Verificacion final: seis pruebas puras y ocho SQL pasan; QA con la compilacion de produccion (`next start`, service workers bloqueados, Supabase simulado) pasa en ambos tamanos, incluido 0-0 y recuperacion de conflicto tras recargar. Capturas revisadas en `.next/qa/`. Tipos/build pasan y lint sigue en los 11 problemas previos. El seguimiento del push/Preview y el SQL entregado al usuario se registran en el chat.
