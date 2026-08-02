# TITULARES — Documentación del proyecto

Aplicación web para armar la formación de un equipo de fútbol amateur en menos de un minuto. Mobile-first, con persistencia local y arquitectura preparada para migrar a un backend (Supabase/Firebase) sin reescribir la app.

---

## 1. Resumen general

| | |
|---|---|
| **Nombre** | TITULARES |
| **Equipo / marca** | Las Condes FC (Decom) |
| **Objetivo** | Que el capitán arme la alineación del partido en menos de 1 minuto desde el celular |
| **Flujo principal** | Asistencia → Elegir formación → Arrastrar jugadores → Compartir |
| **Persistencia** | Local Storage (vía capa de abstracción, migrable a backend) |
| **Ubicación (código)** | `formacion-ya/` |
| **URL de producción** | https://formacion-ya.vercel.app |

---

## 2. Stack tecnológico

| Tecnología | Uso |
|---|---|
| **Next.js 16** (App Router, Turbopack) | Framework base, routing, SSR/CSR |
| **TypeScript** | Tipado en todo el proyecto |
| **TailwindCSS v4** | Estilos |
| **shadcn/ui** (sobre **Base UI**, no Radix) | Componentes de UI (Dialog, Sheet, Select, etc.) |
| **Framer Motion** | Animaciones (listas, entrada/salida de tarjetas, drag) |
| **dnd-kit** (`@dnd-kit/core`) | Drag & drop de jugadores en la cancha |
| **Zustand** | Estado global por dominio (jugadores, asistencia, cancha, historial) |
| **html-to-image** | Exportar la formación como imagen PNG |
| **uuid** | Generación de IDs |
| **React 19** | Incluye el hook `use()` para resolver `params` asíncronos |

> **Ojo con Next.js 16:** esta versión trae cambios respecto a lo que uno conoce de versiones anteriores (por ejemplo, `params` en rutas dinámicas es una `Promise` que hay que resolver con `await` o el hook `use()`). Antes de tocar rutas o convenciones de archivos, conviene revisar `node_modules/next/dist/docs/`.

---

## 3. Arquitectura y estructura de carpetas

```
formacion-ya/
├─ public/
│  ├─ logo.png           # escudo de Las Condes FC (fondo transparente, usado en el Home)
│  ├─ icon.png           # miniatura cuadrada del escudo (ícono de PWA, favicon, apple-touch-icon)
│  └─ sw.js               # service worker (cache-first, solo producción)
├─ src/
│  ├─ app/                       # rutas (Next.js App Router)
│  │  ├─ layout.tsx              # layout raíz, metadata, tema, backdrop decorativo
│  │  ├─ manifest.ts             # manifest de la PWA
│  │  ├─ page.tsx                # Home
│  │  ├─ login/page.tsx          # ingreso por código de equipo (Fase 0)
│  │  ├─ players/page.tsx        # gestión de jugadores (Supabase)
│  │  ├─ matches/                # partidos agendados (Fase 2) + formación por partido (Fase 3)
│  │  │  ├─ page.tsx             # listado (próximos / pasados)
│  │  │  └─ [id]/
│  │  │     ├─ page.tsx          # detalle + asistencia anticipada
│  │  │     └─ board/page.tsx    # formación + instrucciones tácticas de ese partido (Supabase)
│  │  ├─ attendance/page.tsx     # asistencia "del día" para armar formación (todavía Local Storage)
│  │  ├─ formation/page.tsx      # selector de esquema táctico
│  │  ├─ board/page.tsx          # constructor (cancha + banca + compartir)
│  │  └─ history/
│  │     ├─ page.tsx             # listado de formaciones pasadas
│  │     └─ [id]/page.tsx        # detalle de una formación
│  ├─ components/ui/             # componentes shadcn/ui (base-ui)
│  ├─ features/                  # componentes con lógica específica de dominio
│  │  ├─ players/                # formulario, fila, importación
│  │  ├─ attendance/              # fila de asistencia
│  │  ├─ board/                   # cancha, banca, tarjeta de jugador, export, compartir
│  │  ├─ history/                 # tarjeta de historial
│  │  └─ pwa/                     # registro del service worker
│  ├─ hooks/                      # stores Zustand (use-players, use-attendance, use-board, use-history, use-auth)
│  ├─ lib/supabase/               # cliente de Supabase para el navegador
│  ├─ services/                   # lógica de negocio + acceso a storage/Supabase
│  ├─ storage/                    # capa de abstracción de persistencia (Local Storage)
│  ├─ types/                      # tipos de dominio (Player, FormationTemplate, MatchLineup...)
│  └─ utils/                      # helpers puros (colores, presets, validación, CSV, export de imagen)
```

### Persistencia: estado de la migración a Supabase

El proyecto está a mitad de camino entre Local Storage (diseño original) y Supabase (Fase 0 en curso). Estado actual por dominio:

| Dominio | Dónde vive hoy | Alcance |
|---|---|---|
| **Jugadores** (`players`) | ✅ Supabase | Compartido entre todos los dispositivos del equipo, con permisos por rol (ver sección "Backend (Supabase)"). |
| **Partidos y asistencia anticipada** (`matches`, `match_attendance`) | ✅ Supabase | Fase 2, ver sección "Backend (Supabase)". |
| **Formación por partido agendado** (`match_lineups`) | ✅ Supabase | Fase 3, ver más abajo. |
| Asistencia "del día", formación en curso (`/attendance` → `/formation` → `/board`), historial | Local Storage (`IStorageAdapter` / `LocalStorageAdapter`) | Todavía por dispositivo — es el flujo original, previo a que existieran partidos agendados; sigue vivo como atajo rápido del DT para armar una formación suelta sin necesidad de agendar un partido. |

`hooks/use-players.ts` mantiene exactamente la misma interfaz pública de siempre (`players`, `loaded`, `load`, `addPlayer`, `addPlayers`, `updatePlayer`, `removePlayer`) — por eso `/attendance`, `/formation`, `/board` y `/history` no necesitaron ningún cambio: solo consumen la lista de jugadores del store, sin saber de dónde sale. `hooks/use-match-lineup.ts` (Fase 3) sigue el mismo patrón: misma forma de API que `use-board.ts` (`loadForMatch`/`startFormation`/`moveToField`/`moveToBench`/`setInstructions`), pero persistida contra Supabase en vez de Local Storage — y reutiliza sin cambios los componentes visuales `Field`, `BenchStrip`, `PlayerInfoSheet` y `ExportView` que ya existían para `/board`.

**Claves usadas en Local Storage** (`storage/keys.ts`, ya sin `players`):
- `formacion-ya:lineups` (historial)
- `formacion-ya:current-attendance`
- `formacion-ya:current-lineup`

### Permisos por rol en `/players`

- **DT/Capitán**: alta, edición y eliminación de cualquier jugador; importar/exportar plantilla.
- **Jugador**: sin esos botones. Solo puede editar su propio perfil ya reclamado (botón "Editar" visible únicamente en su propia fila), y el formulario oculta los campos de administración de plantilla (número de camiseta, activo/inactivo) — edita nombre, alias, "mostrar por alias", pie hábil y posiciones (`PlayerForm` con `restrictedMode`).
- Sin sesión de equipo, `/players` (y por transitividad cualquier pantalla que dependa de la plantilla) muestra un llamado a iniciar sesión con el código, en vez de una lista vacía silenciosa.

La restricción de UI es una comodidad, no la barrera real: la seguridad de verdad está en las políticas de Row Level Security de Supabase (`players_update_own_or_dt`, `players_delete_dt`), así que aunque alguien manipule el cliente no puede editar ni borrar jugadores fuera de lo que su rol permite.

---

## 4. Modelo de datos

```ts
type Position = "POR" | "DFC" | "LAT" | "MCD" | "MC" | "VOL" | "EXT" | "MP" | "DEL";

interface Player {
  id: string;
  name: string;
  alias?: string;           // apodo opcional (útil con nombres repetidos, ej. varios "Matías")
  showAlias?: boolean;      // si true, la UI muestra el alias en vez del nombre
  number: number;
  primaryPosition: Position;
  secondaryPosition?: Position;
  photoUrl?: string;
  dominantFoot?: "izquierdo" | "derecho" | "ambidiestro";
  active: boolean;
  color?: string;           // override manual, si no se usa el color por posición
  createdAt: string;
  updatedAt: string;
}

interface FormationSlot {
  id: string;
  x: number;                 // 0-100 (%), posición horizontal
  y: number;                 // 0-100 (%), 0 = arco rival, 100 = arco propio
  suggestedPosition: Position;
}

interface FormationTemplate {
  id: string;                // "4-4-2", "4-3-3", etc.
  label: string;
  slots: FormationSlot[];
}

interface MatchLineup {
  id: string;
  date: string;
  opponent?: string;
  kickoffTime?: string;
  result?: string;
  comments?: string;
  formationTemplateId: string;
  attendeeIds: string[];
  assignments: {
    slotId: string;
    playerId: string;
    x: number;
    y: number;
    instructions?: string;   // instrucción táctica para ese jugador en ese partido
  }[];
  bench: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Funcionalidades implementadas

### 5.1 Gestión de jugadores (`/players`)
- Plantilla compartida en Supabase, la misma para todos los dispositivos del equipo (ver "Persistencia: estado de la migración a Supabase" más abajo).
- Alta, edición y eliminación — restringido por rol: DT/capitán opera sobre cualquier jugador, un jugador solo sobre su propio perfil reclamado (ver "Permisos por rol en `/players`").
- Búsqueda y orden (nombre, número, posición).
- Importación masiva por **CSV** o **JSON** (solo DT/capitán), con validación fila por fila (número duplicado, posición inválida) y vista previa de errores antes de confirmar.
- Exportación del listado visible a un archivo **JSON** descargable (solo DT/capitán), en el mismo formato que espera la importación.
- **Alias por jugador**: campo opcional + casilla "Mostrar en la app por su alias, no por su nombre". Útil cuando hay varios jugadores con el mismo nombre de pila (ej. varios "Matías"). El nombre a mostrar se resuelve con `utils/player-display.ts` (`getDisplayName`) y se usa en todos lados: tarjetas de cancha/banca, listados, asistencia, panel de info y la imagen exportada. Cuando el alias está activo, el nombre real se sigue mostrando entre paréntesis o como dato secundario para no perder trazabilidad.

### 5.2 Asistencia (`/attendance`)
- Marca de asistentes al partido (solo jugadores activos).
- Contador en vivo, botón "Todos/Ninguno".
- Persiste automáticamente.

### 5.3 Selector de formación (`/formation`)
- 7 esquemas tácticos: **4-4-2, 4-3-3, 4-2-3-1, 3-5-2, 5-3-2, 4-1-4-1, 3-4-3**.
- Al elegir uno, se auto-asignan los asistentes a los slots priorizando: posición principal → posición secundaria → lo que quede. El resto pasa a banca.
- Si ya había una formación armada, se archiva automáticamente en el historial antes de generar la nueva.

### 5.4 Constructor de cancha (`/board`)
- Cancha dibujada en SVG (arcos, área, círculo central).
- **Drag & drop** con `dnd-kit`, usando `DragOverlay` para que la tarjeta arrastrada nunca quede recortada por los contenedores con `overflow` (banca y cancha) — se ve siempre completa mientras se mueve entre ambas zonas.
- Reposicionamiento libre de jugadores ya ubicados en la cancha.
- Tocar un jugador abre un panel (`Sheet`) con su info rápida (nombre, número, posiciones, pie dominante) y la opción de sacarlo a la banca.
- Colores por posición para identificar roles de un vistazo.
- **Banca con desplazamiento lateral**: cuando hay más jugadores de los que entran en el ancho visible (equipos con alta asistencia), aparecen flechas de navegación a los costados para deslizar y acceder a todos — antes, con 5+ jugadores en banca, los últimos quedaban inaccesibles en móvil porque el gesto de swipe competía con el `touch-action: none` que necesitan las tarjetas para el drag & drop.
- **Instrucciones tácticas por jugador (Fase 1 del "apartado táctico")**: dentro del panel de cada jugador en cancha hay un cuadro de texto para dejarle una instrucción puntual (ej. "Marca personal al 10 rival"). Se guarda por jugador y por partido (`assignments[].instructions`, no en el perfil del jugador). Un jugador con instrucciones cargadas muestra un pequeño ícono 📋 en su ficha, tanto en la cancha interactiva como en la imagen exportada — que además agrega una sección "Instrucciones tácticas" con el detalle de texto completo, para que se pueda compartir por WhatsApp junto con la formación.

### 5.5 Compartir formación
- Genera una imagen PNG (cancha + banca + fecha/rival/hora) usando `html-to-image`.
- Usa **Web Share API** si está disponible (mobile), o descarga el archivo directamente (desktop).
- Al compartir, la formación queda archivada en el historial.

### 5.6 Historial (`/history`)
- Lista cronológica de formaciones pasadas (fecha, rival, esquema, resultado).
- Detalle por formación con la cancha en modo solo lectura y campos editables de resultado/comentarios.

### 5.7 Login por código de equipo (`/login`) — Fase 0

- Sin usuario/contraseña: se ingresa un código de equipo (uno para jugadores, otro para DT/capitán) y el dispositivo queda identificado. Ver detalle técnico en "Backend (Supabase)" en la sección 8.
- El jugador elige su número de camiseta de la plantilla real para "reclamarlo"; desde ese momento su edición de perfil queda asociada a él.
- La sesión persiste sola entre visitas (no hay que reingresar el código cada vez).

### 5.8 Partidos agendados (`/matches`) — Fase 2

- **DT/Capitán** agenda partidos (fecha, hora, rival, lugar), y puede editarlos o eliminarlos.
- Todos los miembros del equipo ven el listado, separado en "Próximos" y "Pasados".
- En el detalle de cada partido (`/matches/[id]`), la plantilla completa aparece con su estado de asistencia (pendiente / confirmado / no va):
  - **Jugador**: solo puede marcar su propia fila (botones de confirmar/rechazar); las de los demás se muestran como insignia de solo lectura.
  - **DT/Capitán**: puede marcar la asistencia de cualquier jugador (por ejemplo, si alguien avisa por WhatsApp en vez de por la app).
- Contador en vivo de "X confirmados de Y" en la parte superior.
- Igual que en jugadores, la restricción de UI es una comodidad — las policies de RLS (`attendance_upsert_own_or_dt`, `matches_write_dt`) son las que realmente bloquean del lado del servidor.
- Usa las tablas `matches` y `match_attendance` ya creadas en la Fase 0 (`0001_init.sql`); no hizo falta ninguna migración nueva.

Todavía no conectado con el constructor de formación (`/board`): agendar un partido y armar su alineación son, por ahora, dos flujos separados. Esa conexión es la Fase 3 ("vista del jugador").

### 5.9 Formación por partido (`/matches/[id]/board`) — Fase 3

- Conecta cada partido agendado con una alineación propia (tabla `match_lineups`), en vez de la formación suelta de `/board` (que sigue existiendo como atajo local aparte).
- Desde el detalle del partido, un botón "Armar formación" (DT) o "Ver formación" (jugador) lleva a esta pantalla.
- **Si el partido todavía no tiene formación:**
  - **DT/Capitán**: ve el selector de esquemas (mismos `FORMATION_PRESETS` de `/formation`) y arma la alineación automáticamente a partir de los jugadores con asistencia **confirmada** para ese partido (no de la asistencia "del día" de `/attendance`).
  - **Jugador**: ve un mensaje de espera ("El DT todavía no armó la formación para este partido").
- **Si ya existe formación:** ambos ven la misma cancha + banca (`Field`, `BenchStrip`, reutilizados de `/board`), pero con comportamiento distinto según el rol:
  - **DT/Capitán**: puede arrastrar jugadores entre cancha y banca, y editar las instrucciones tácticas de cada uno (mismo `PlayerInfoSheet` de `/board`, con el textarea editable).
  - **Jugador**: el arrastre está deshabilitado (`DndContext` sin `sensors`); puede tocar a cualquier jugador para ver su info y, si tiene, sus instrucciones tácticas en texto de solo lectura — sin botón para sacarlo de la cancha.
- El botón "Compartir" genera la imagen (mismo `ExportView`/`captureElementAsBlob` de `/board`) usando directamente la fecha/rival/hora ya guardados en el partido, sin volver a pedirlos como en `/board` (ahí sí hace falta el diálogo, porque esos datos no existen todavía).
- Probado de punta a punta contra Supabase real: DT arma un 4-3-3 con asistentes confirmados, agrega instrucciones a un jugador, manda a otro a la banca, comparte/descarga la imagen; un jugador logueado ve la misma formación en modo solo lectura, sin poder arrastrar ni editar.

### 5.10 PWA
- Instalable (`manifest.ts`, ícono = miniatura cuadrada del escudo de Las Condes FC (`public/icon.png`, 1254×1254), soporte iOS).
- Service worker con estrategia cache-first para uso básico offline (activo solo en producción, para no interferir con el hot-reload en desarrollo).

---

## 6. Diseño visual

### 6.1 Concepto

Estética de **app deportiva premium** (inspirada en SofaScore, OneFootball, FotMob, Lineup11, sin copiar su diseño), con identidad de marca tomada del escudo de **Las Condes FC**: tema oscuro tipo carbón/negro, dorado-bronce metálico como color primario y un acento turquesa (tomado de las gemas de la corona del escudo). Tarjetas semitransparentes con blur, tipografía clara, animaciones suaves.

El nombre de la app es **TITULARES**. En la pantalla de inicio (`app/page.tsx`), el escudo del equipo (`public/logo.png`, versión con fondo transparente) se muestra centrado sobre el título, con un ancho de 224–256px (`w-56 sm:w-64`) — proporcionalmente grande respecto al bloque de subtítulo y botones que va debajo. Para el ícono de la PWA, favicon y apple-touch-icon se usa en cambio `public/icon.png`, una miniatura cuadrada del escudo (con fondo), más adecuada para esos usos que la versión transparente.

### 6.2 Fondo de la app (`app-backdrop`)

Capa fija (`position: fixed`, `z-index: -10`) detrás de todo el contenido, definida en `src/app/globals.css` y montada una sola vez en `layout.tsx`:

- **Degradado vertical** (negro carbón, coherente con el fondo del escudo):
  - `0%–20%`: `oklch(0.19 0.015 60)`
  - `46%`: `oklch(0.1 0.008 60)`
  - `100%`: `oklch(0.07 0.006 60)`
- **Línea de brillo dorado-bronce** (`::after`), ubicada al 19% de la altura, con degradado horizontal transparente → dorado → transparente y `box-shadow` doble para el efecto de resplandor:
  - Color central: `oklch(0.78 0.14 72)`
  - Glow: `oklch(0.74 0.13 70 / 50%)` y `oklch(0.7 0.13 70 / 22%)`

### 6.3 Paleta de colores (tokens de tema, `oklch`)

Definida en `:root` de `globals.css` (usada por todos los componentes shadcn/ui vía variables CSS). Colores extraídos del escudo de Las Condes FC: negro carbón (fondo del escudo), dorado-bronce metálico (corona, bordes, letras) y turquesa (gemas de la corona).

| Token | Valor `oklch` | Uso |
|---|---|---|
| `--background` | `0.15 0.008 60` | Fondo base (negro carbón) |
| `--foreground` | `0.96 0.004 75` | Texto principal (blanco cálido) |
| `--card` | `0.21 0.012 60 / 70%` | Tarjetas (semitransparentes, dejan ver el backdrop) |
| `--popover` | `0.19 0.012 60` | Popovers, dropdowns |
| `--primary` | `0.74 0.13 70` | Dorado-bronce (≈ `#d9a24b`) — botones principales, acentos, línea de brillo |
| `--primary-foreground` | `0.16 0.02 60` | Texto oscuro sobre `--primary` (contraste ≈ 9:1) |
| `--secondary` | `0.26 0.012 60` | Botones secundarios |
| `--muted` | `0.25 0.012 60` | Fondos apagados |
| `--muted-foreground` | `0.68 0.015 70` | Texto secundario |
| `--accent` | `0.72 0.1 195` | Turquesa (gemas de la corona) — estados hover/activo |
| `--destructive` | `0.65 0.22 25` | Acciones destructivas (eliminar) |
| `--border` | `blanco 12% opacidad` | Bordes sutiles |
| `--ring` | `0.74 0.13 70` | Anillo de foco (igual a `--primary`) |

`--radius` base: `0.625rem` (con variantes `sm/md/lg/xl/2xl/3xl/4xl` calculadas como múltiplos).

> Nota técnica: se usa el espacio de color **OKLCH** (no hex/RGB) porque es el que trae shadcn/ui v4 por defecto — permite ajustar luminosidad/croma/matiz de forma más predecible entre temas. El contraste de `--primary-foreground` sobre `--primary` se calculó manualmente (≈9:1) para cumplir holgadamente el mínimo de 4.5:1 exigido por WCAG en texto normal.

### 6.4 Colores por posición (roles en la cancha)

Definidos en `src/utils/position-colors.ts`, en **hex** (estos sí son fijos, no dependen del tema):

| Posición | Color | Hex |
|---|---|---|
| Portero (POR) | 🟠 Ámbar | `#f59e0b` |
| Defensa Central (DFC) | 🔵 Azul | `#2563eb` |
| Lateral (LAT) | 🩵 Celeste | `#0ea5e9` |
| Mediocampista Defensivo (MCD) | 🟣 Violeta | `#8b5cf6` |
| Mediocampista Central (MC) | 🟣 Índigo | `#4f46e5` |
| Volante (VOL) | 🟢 Verde | `#22c55e` |
| Extremo (EXT) | 🟢 Teal | `#14b8a6` |
| Mediapunta (MP) | 🩷 Rosa | `#ec4899` |
| Delantero (DEL) | 🔴 Rojo | `#ef4444` |

Estos colores se usan en el círculo con el número de camiseta, tanto en las tarjetas de jugador (cancha, banca, listados) como en la imagen exportada para compartir.

### 6.5 Cancha (`pitch-background.tsx`)

SVG con `viewBox="0 0 100 150"` (proporción vertical 2:3), degradado verde (`#1e8a4c` → `#166a3a`), franjas de corte de césped sutiles (opacidad 3%), líneas blancas de cancha (borde, mitad, círculo central, áreas grande/chica, arcos con semicírculo) a 85% de opacidad.

### 6.6 Tarjetas de jugador

Dos variantes (`variant="field" | "bench"`):
- **Cancha**: fondo `bg-black/45` con `backdrop-blur-sm`, borde blanco semitransparente, texto blanco con sombra — para destacar sobre el verde de la cancha (opacidad reforzada respecto a la versión inicial, para asegurar contraste suficiente).
- **Banca**: fondo `bg-card` (tarjeta estándar del tema), texto en color de foreground normal.

Ambas muestran: círculo con el número (coloreado por posición, 48px en cancha / 44px en banca) + nombre (primer nombre, truncado). La tarjeta completa tiene un área mínima de 64×64px para cumplir la recomendación de accesibilidad de 44–48px de zona táctil en móvil. El mismo tamaño se usa en la tarjeta "fantasma" (`DragOverlay`) que sigue al dedo/cursor durante el arrastre.

### 6.7 Tipografía

- **Geist Sans** (`--font-geist-sans`) para texto general.
- **Geist Mono** (`--font-geist-mono`) disponible como variable, uso puntual.

### 6.8 Animaciones (Framer Motion)

- Entrada/salida de jugadores en cancha y banca (`AnimatePresence`, fade + scale).
- Transición de posición al mover un jugador en la cancha (CSS transition en `left/top`, curva `cubic-bezier(0.34, 1.2, 0.64, 1)` — efecto de "rebote" suave).
- Entrada escalonada (`stagger`) en listados (jugadores, asistencia) y en los botones del selector de formación.
- **Importante:** el prop `layout` de Framer Motion **no se usa** en los contenedores que envuelven tarjetas arrastrables (banca), porque genera conflictos con el sistema de `transform` de `dnd-kit` (bug ya corregido — ver sección de incidentes).

---

## 7. Decisiones técnicas relevantes

- **`DragOverlay` de dnd-kit** para el drag & drop: sin esto, las tarjetas arrastradas se recortaban al salir de contenedores con `overflow` (banca con scroll horizontal, cancha con bordes redondeados). El overlay renderiza la copia visual fuera de esos contenedores.
- **PWA con service worker solo en producción**: si se activara en desarrollo, interferiría con el hot-reload de Turbopack.
- **`use()` de React 19** para resolver `params` en `/history/[id]`, siguiendo la convención de Next.js 16 (rutas dinámicas devuelven `Promise<{ id: string }>`).
- **Base UI en vez de Radix**: esta instalación de shadcn/ui usa `@base-ui/react` como primitiva subyacente (cambio reciente de shadcn). La API es mayormente compatible (`value`/`onValueChange`, `checked`/`onCheckedChange`), pero los popups (Select) se posicionan vía Floating UI internamente. **Importante:** `<Select.Value>` de Base UI, sin un prop `items` en `<Select>`, muestra el valor crudo seleccionado (ej. `"__none__"`) en vez de la etiqueta del `<SelectItem>` correspondiente. Por eso todos los `Select` del proyecto (`player-form.tsx`, `players/page.tsx`) pasan un `items={Record<string, string>}` con el mapeo valor → etiqueta legible.
- **Compartir con Web Share API**: `utils/export-image.ts` verifica `navigator.canShare({ files })` antes de llamar `navigator.share({ files, title })`. No se envían parámetros `text`/`url` junto con `files` (evita la limitación conocida de Safari/iOS). Si la API no está disponible, se descarga el archivo directamente como alternativa. La imagen se genera a 2x de resolución sobre un lienzo de 720px de ancho (≈1440px finales), por encima del mínimo recomendado de 800px para que no pierda nitidez al enviarse por WhatsApp.
  > **Limitación de entorno:** la Web Share API solo funciona en un *contexto seguro* (HTTPS, o `localhost`). Al probar la app desde el celular usando la IP de red por HTTP plano (ej. `http://192.168.1.7:3000`), `navigator.share` no existe en el navegador y el código cae automáticamente a la descarga del archivo — esto es una restricción del navegador, no un error de la app. Para probar el flujo de compartir por WhatsApp en el celular hace falta HTTPS: desplegar la app (ej. Vercel, que da HTTPS gratis) o usar un túnel HTTPS temporal hacia el servidor local (ej. ngrok, Cloudflare Tunnel).

---

## 8. Cómo correr el proyecto

### Local (desarrollo)

```bash
cd formacion-ya
npm install
npm run dev
```

Abrir `http://localhost:3000`. Para probar desde el celular en la misma red, agregar la IP local (Wi-Fi, no la de un adaptador virtual tipo VirtualBox) a `allowedDevOrigins` en `next.config.ts` — Next.js lo indica en la consola si detecta un origen no permitido. **Importante:** por HTTP plano (sin HTTPS), la Web Share API no está disponible, así que "Compartir" siempre descarga el archivo en vez de abrir el menú nativo — eso es una restricción del navegador, no un bug (ver sección 7).

Variables de entorno necesarias en `.env.local` (no versionado, ver sección "Backend (Supabase)" más abajo):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Producción (Vercel)

La app está desplegada en Vercel:

🔗 **https://formacion-ya.vercel.app**

- Cuenta: `walthermorarivera`, proyecto `z-labs2/formacion-ya`.
- Conectado al repositorio GitHub (`WaltherMoraRivera/Titulares_futbol_app`, rama `main`): **cada `git push` a `main` dispara un deploy automático a producción**. Ya no hace falta correr `vercel --prod` a mano.
- Al estar en HTTPS, ahí sí funciona la Web Share API completa (compartir la formación directo a WhatsApp desde el celular).

### Backend (Supabase) — Fase 0

Proyecto Supabase: `mbnixqfgiebaxzfoxeea` (región Sudamérica). Se usa el cliente estándar de `@supabase/supabase-js` (`src/lib/supabase/client.ts`) — no `@supabase/ssr`, porque toda la app es "use client" y no depende de sesión en el servidor.

**Autenticación:** sin contraseñas individuales. Cada dispositivo inicia sesión de forma anónima (Supabase Anonymous Auth) y luego "reclama" un equipo con un código compartido:
- Código de **jugador** → rol `player`.
- Código de **DT/Capitán** → rol `dt`, con permisos para editar cualquier jugador, crear/editar partidos y dejar instrucciones tácticas.

El jugador, una vez dentro, reclama su número de camiseta de la plantilla (o crea uno nuevo si no existe) y desde ahí puede editar su propio perfil (nombre, alias, pie hábil, posiciones) sin depender del DT.

**Trade-off de seguridad asumido conscientemente** (decisión del usuario, no un descuido): al ser códigos compartidos y no cuentas personales, cualquiera con el código de jugador puede "reclamar" el número de otro. Aceptable para uso interno de un equipo amateur; los códigos se pueden regenerar en cualquier momento con un `UPDATE` a `teams`. Si la app se vuelve un producto de cara a otros equipos, este es el primer punto a endurecer (por ejemplo, códigos de un solo uso o verificación por WhatsApp/SMS).

**Esquema** (`supabase/migrations/`):
- `0001_init.sql` — tablas (`teams`, `players`, `profiles`, `matches`, `match_attendance`), funciones de apoyo (`current_team_id`, `current_role`, `current_player_id`, todas `security definer` para evitar recursión de RLS sobre `profiles`), las funciones `claim_team(code)` y `claim_player(player_id)`, y las políticas de Row Level Security de cada tabla.
- `0002_seed_team.sql` — crea el equipo inicial ("Las Condes FC") con sus dos códigos.
- `0003_get_my_team.sql` — función `get_my_team()`, para que un dispositivo ya logueado recupere su equipo/rol/jugador reclamado sin volver a pedir el código (rehidrata la sesión al recargar la app).
- `0004_match_lineups.sql` — tabla `match_lineups` (Fase 3): una fila por `match_id` con `formation_template_id`, `assignments` (jsonb) y `bench` (jsonb). Select para todo el equipo, insert/update/delete restringidos a `dt` vía RLS.

`teams` **no tiene policy de select** a propósito: la única forma de leer/usar los códigos es a través de las funciones `claim_team`/`get_my_team`, así un código incorrecto no revela nada de la tabla.

Como el login automático del CLI de Supabase no funciona en este entorno de desarrollo (necesita una terminal interactiva), las migraciones se pegan y corren manualmente en el **SQL Editor** del panel de Supabase, en vez de `supabase db push`. También hace falta tener habilitado **Authentication → Sign In / Providers → Anonymous Sign-ins** (con el botón "Save" de esa sección) para que el login sin contraseña funcione — quedó verificado con un script de prueba end-to-end.

**Siembra de datos:** `supabase/seed-players.js <código>` — script reutilizable que carga una plantilla de jugadores a la tabla `players` de un equipo. Ya se usó una vez para migrar los 16 jugadores reales al proyecto de Supabase (la fuente original era `Listado_Jugadores/jugadores-2026-07-31.json`; el archivo intermedio `src/data/default-players.ts`, usado antes para sembrar Local Storage, ya no existe — quedó obsoleto en cuanto `players` pasó a vivir en Supabase).

**Pantalla de login** (`/login`, `src/hooks/use-auth.ts`): ingresás el código → si es de jugador, elegís tu número de camiseta de la plantilla (`claim_player`); si es de DT/capitán, entrás directo con permisos de administración. La sesión anónima de Supabase persiste sola en `localStorage` (`sb-<project-ref>-auth-token`), así que no hay que volver a ingresar el código en cada visita — al cargar, `use-auth.ts` llama a `get_my_team()` para recuperar el estado. Se agregó también un indicador de sesión y un botón "Salir" en el Home.

Probado de punta a punta: login con código de jugador, listado de plantilla, reclamo de un número, y confirmación de que `players.claimed_by` quedó escrito en la base real.

**Estado:** login, reclamo de jugador, gestión de la plantilla (`/players`), partidos agendados con asistencia anticipada (`/matches`, Fase 2) **y formación + instrucciones tácticas por partido** (`/matches/[id]/board`, Fase 3) funcionando en producción real contra Supabase, con permisos por rol probados de punta a punta (edición propia para jugador, control total para DT/capitán, verificado también que las políticas de RLS bloquean del lado del servidor, no solo en la interfaz). El flujo local original (`/attendance` → `/formation` → `/board` → `/history`) sigue vivo aparte, sin migrar a Supabase, como atajo rápido del DT para armar una formación suelta sin agendar un partido.

### Repositorio y paquete Android

- Código fuente: **https://github.com/WaltherMoraRivera/Titulares_futbol_app**
- `.apk` instalable (generado con PWABuilder, envoltorio TWA sobre `https://formacion-ya.vercel.app`): [`apk/Titulares_Android.apk`](apk/Titulares_Android.apk) dentro del repo. Se instala habilitando "orígenes desconocidos" en Android, sin pasar por Google Play.

---

## 9. Estado del proyecto y pendientes

**Completado:** login por código de equipo con roles (Fase 0), gestión de jugadores sobre Supabase con alias y permisos por rol, partidos agendados con asistencia anticipada (Fase 2), formación + instrucciones tácticas atadas a cada partido agendado con vista editable para el DT y de solo lectura para el jugador (Fase 3, sobre Supabase), constructor de formación local con drag & drop (con `DragOverlay` para que la tarjeta arrastrada no se recorte ni desaparezca, banca con desplazamiento lateral), compartir por imagen con Web Share API (incluye instrucciones tácticas), historial, animaciones, responsive, PWA instalable con ícono de marca, tema visual oscuro con paleta del escudo de Las Condes FC, despliegue en producción con HTTPS + auto-deploy desde GitHub, paquete `.apk` para instalación directa en Android.

### Roadmap: de "ver la formación" a plataforma del equipo

Visión a futuro: que la app reemplace a WhatsApp como canal central del equipo — partidos agendados, asistencia confirmada por cada jugador desde su propio teléfono, formación e instrucciones tácticas visibles para todos el día del partido, y registro histórico de resultados/goleadores/tarjetas. Fases propuestas:

- **Fase 0 — Backend y cuentas** ✅ completado — login por código, reclamo de jugador y gestión de plantilla (`/players`) funcionando sobre Supabase real, con permisos por rol.
- **Fase 1 — Panel táctico (MVP)** ✅ completado — instrucciones por jugador, ver arriba.
- **Fase 2 — Partidos agendados** ✅ completado — DT/capitán agenda partidos, todo el equipo marca/ve asistencia anticipada, ver arriba.
- **Fase 3 — Vista del jugador** ✅ completado — el DT arma la formación e instrucciones tácticas de un partido agendado a partir de los asistentes confirmados, y cada jugador la ve (junto a sus propias instrucciones) en modo solo lectura el día del partido, ver sección 5.9.
- **Fase 4 — Registro post-partido**: resultado, goleadores, tarjetas, notas del DT; depende de Fase 2.
- **Fase 5 — Estadísticas**: agregación de goles/tarjetas/convocatorias por jugador a lo largo de la temporada; depende de Fase 4.
- **Fase 6 — Zonas de influencia y redes de pase**: mapas de calor y líneas de asociación entre jugadores sobre la cancha; mejora visual, no bloquea nada de lo anterior.

**Otras mejoras futuras sugeridas** (no implementadas, compatibles con la arquitectura actual):
- Sustituciones en tiempo real durante el partido.
- Exportación a PDF.
- Múltiples plantillas/equipos.
- Publicar el `.apk` también en Google Play (requiere cuenta de desarrollador de pago) o generar el paquete equivalente para iOS.
