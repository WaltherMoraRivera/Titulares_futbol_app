# TITULARES

App web **mobile-first** para gestionar un equipo de fútbol amateur: plantilla, partidos, asistencia, formación, bitácora del partido en vivo y estadísticas de temporada. Está en uso real por el equipo Decom FC.

**Objetivo:** que el capitán arme la alineación de un partido en menos de un minuto desde el celular.

🔗 **Producción:** https://formacion-ya.vercel.app

## Qué hace

| Módulo | Descripción |
|---|---|
| **Plantilla** | Alta, edición y baja de jugadores, con alias, posiciones y pie hábil. Importación y exportación por CSV o JSON, con validación fila por fila. |
| **Partidos y asistencia** | El DT agenda partidos y cada jugador confirma su asistencia desde su teléfono. Notificaciones push a quien tiene la asistencia pendiente. |
| **Formación** | 7 esquemas tácticos (4-4-2, 4-3-3, 3-5-2, entre otros). Autoasigna a los asistentes según su posición y permite reordenar con drag & drop. |
| **Pizarra táctica** | Instrucciones por jugador, mapa táctico individual con flechas y zonas dibujadas a mano alzada, y zonas de influencia sobre la cancha. |
| **Compartir** | Exporta la formación como imagen PNG y la envía por la Web Share API, por ejemplo a WhatsApp. |
| **Bitácora en vivo** | Goles, tarjetas, cambios y comentarios cargados durante el partido. Se ven en tiempo real en todos los dispositivos con Supabase Realtime. |
| **Resultados y estadísticas** | El marcador se calcula desde la bitácora. Récord del equipo y tabla por jugador con convocatorias, minutos jugados, goles y tarjetas. |
| **PWA** | Instalable desde el navegador, con guía para iPhone. También hay un `.apk` para Android. |

## Roles y permisos

Sin contraseñas individuales: cada dispositivo inicia sesión de forma anónima y se une al equipo con un código compartido. Hay cuatro roles: **jugador**, **DT/capitán**, **asistente** (apoya la carga en vivo) y **admin** (pruebas).

Los permisos se aplican con **Row Level Security** de Postgres, así que se hacen cumplir en el servidor y no solo en la interfaz.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Estilos y UI | Tailwind CSS v4, shadcn/ui sobre Base UI, Framer Motion |
| Estado | Zustand |
| Backend | Supabase: Postgres con RLS, Auth anónima y Realtime |
| Interacción | dnd-kit (drag & drop), html-to-image (exportar imagen), web-push (notificaciones) |
| Despliegue | Vercel, con deploy automático desde `main` |

## Decisiones técnicas

- **`DragOverlay` de dnd-kit** para que la tarjeta arrastrada no se recorte al salir de contenedores con `overflow`.
- **Service worker solo en producción**, para no interferir con el hot-reload de Turbopack.
- **Web Share API con alternativa de descarga** cuando el navegador no la soporta (por ejemplo, sin HTTPS).
- **Flujo `dev` → preview → `main`**: los cambios se prueban primero en la rama `dev`, que Vercel despliega en una URL de preview, y solo se mezclan a `main` tras confirmarlos, porque la app está en uso real.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000. Necesita un archivo `.env.local` (no versionado) con:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
```

Las migraciones SQL están en [`supabase/migrations/`](supabase/migrations/).

## Documentación

El detalle completo (arquitectura, modelo de datos, funcionalidades por fase y roadmap) está en [DOCUMENTACION.md](DOCUMENTACION.md).
