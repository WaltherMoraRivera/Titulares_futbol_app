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
│  │  ├─ players/page.tsx        # gestión de jugadores
│  │  ├─ attendance/page.tsx     # asistencia al partido
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
│  ├─ hooks/                      # stores Zustand (use-players, use-attendance, use-board, use-history)
│  ├─ data/
│  │  └─ default-players.ts      # plantilla de jugadores por defecto (siembra inicial)
│  ├─ services/                   # lógica de negocio + acceso a storage
│  ├─ storage/                    # capa de abstracción de persistencia
│  ├─ types/                      # tipos de dominio (Player, FormationTemplate, MatchLineup...)
│  └─ utils/                      # helpers puros (colores, presets, validación, CSV, export de imagen)
```

### Capa de persistencia (clave para migrar a backend)

```ts
// storage/adapter.ts
interface IStorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
```

Hoy la única implementación es `LocalStorageAdapter`. El día que se quiera pasar a Supabase/Firebase, solo hay que:
1. Crear `SupabaseAdapter implements IStorageAdapter`.
2. Cambiar la instancia exportada en `storage/index.ts`.

Ningún componente ni servicio necesita reescribirse.

**Claves usadas en Local Storage** (`storage/keys.ts`):
- `formacion-ya:players`
- `formacion-ya:lineups` (historial)
- `formacion-ya:current-attendance`
- `formacion-ya:current-lineup`

### Plantilla de jugadores por defecto

`src/data/default-players.ts` contiene la plantilla real del equipo (16 jugadores, con posición principal/secundaria, pie dominante y número), tomada de `Listado_Jugadores/jugadores-2026-07-31.json`.

`hooks/use-players.ts` la usa como **siembra inicial**: la primera vez que `load()` corre en un navegador sin jugadores guardados (`formacion-ya:players` vacío), crea automáticamente esta plantilla y la persiste. Es el comportamiento por defecto actual **de forma temporal**, mientras se define la carga real de jugadores (pensado para pruebas). A partir de ahí el usuario puede editar, eliminar o importar otra plantilla libremente desde `/players` — la siembra no vuelve a ocurrir a menos que la lista quede completamente vacía de nuevo.

---

## 4. Modelo de datos

```ts
type Position = "POR" | "DFC" | "LAT" | "MCD" | "MC" | "VOL" | "EXT" | "MP" | "DEL";

interface Player {
  id: string;
  name: string;
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
  assignments: { slotId: string; playerId: string; x: number; y: number }[];
  bench: string[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Funcionalidades implementadas

### 5.1 Gestión de jugadores (`/players`)
- Plantilla de 16 jugadores cargada automáticamente por defecto en cualquier navegador nuevo (ver "Plantilla de jugadores por defecto" más abajo).
- Alta, edición y eliminación.
- Búsqueda y orden (nombre, número, posición).
- Importación masiva por **CSV** o **JSON**, con validación fila por fila (número duplicado, posición inválida) y vista previa de errores antes de confirmar.
- Exportación del listado visible (respeta el filtro de búsqueda activo) a un archivo **JSON** descargable, en el mismo formato que espera la importación.

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

### 5.5 Compartir formación
- Genera una imagen PNG (cancha + banca + fecha/rival/hora) usando `html-to-image`.
- Usa **Web Share API** si está disponible (mobile), o descarga el archivo directamente (desktop).
- Al compartir, la formación queda archivada en el historial.

### 5.6 Historial (`/history`)
- Lista cronológica de formaciones pasadas (fecha, rival, esquema, resultado).
- Detalle por formación con la cancha en modo solo lectura y campos editables de resultado/comentarios.

### 5.7 PWA
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

### Producción (Vercel)

La app está desplegada en Vercel:

🔗 **https://formacion-ya.vercel.app**

- Cuenta: `walthermorarivera`, proyecto `z-labs2/formacion-ya`.
- Conectado al repositorio GitHub (`WaltherMoraRivera/Titulares_futbol_app`, rama `main`): **cada `git push` a `main` dispara un deploy automático a producción**. Ya no hace falta correr `vercel --prod` a mano.
- Al estar en HTTPS, ahí sí funciona la Web Share API completa (compartir la formación directo a WhatsApp desde el celular).

### Repositorio y paquete Android

- Código fuente: **https://github.com/WaltherMoraRivera/Titulares_futbol_app**
- `.apk` instalable (generado con PWABuilder, envoltorio TWA sobre `https://formacion-ya.vercel.app`): [`apk/Titulares_Android.apk`](apk/Titulares_Android.apk) dentro del repo. Se instala habilitando "orígenes desconocidos" en Android, sin pasar por Google Play.

---

## 9. Estado del proyecto y pendientes

**Completado:** gestión de jugadores (con plantilla por defecto precargada), asistencia, constructor de formación con drag & drop (con `DragOverlay` para que la tarjeta arrastrada no se recorte ni desaparezca), compartir por imagen con Web Share API, historial, animaciones, responsive, PWA instalable con ícono de marca, tema visual oscuro con paleta del escudo de Las Condes FC, despliegue en producción con HTTPS + auto-deploy desde GitHub, paquete `.apk` para instalación directa en Android.

**Mejoras futuras sugeridas** (no implementadas, compatibles con la arquitectura actual sin necesidad de reestructurar):
- Sustituciones en tiempo real durante el partido.
- Exportación a PDF.
- Sincronización en la nube (Supabase/Firebase) vía un nuevo `IStorageAdapter`.
- Múltiples plantillas/equipos.
- Estadísticas por jugador (goles, asistencias, tarjetas, lesiones).
- Inicio de sesión.
- Publicar el `.apk` también en Google Play (requiere cuenta de desarrollador de pago) o generar el paquete equivalente para iOS.
