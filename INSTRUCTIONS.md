# Canvas — Developer Instructions

This guide explains the **code structure**, **how to run the project**, and **how the app works** end to end. For a short overview, see [README.md](./README.md).

---

## What this project is

**Canvas** is a real-time collaborative whiteboard. Multiple users can open the same board, draw and edit elements together, see each other's cursors, leave threaded comments, and present slides using frames.

**Tech stack:**

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, Konva.js (canvas rendering) |
| Backend | Express, Socket.IO (real-time), Multer (image uploads) |
| Database | PostgreSQL via Prisma ORM |
| Monorepo | pnpm workspaces |
| Shared types | `@canvas/shared` package |

---

## Prerequisites

Before running the app, install:

1. **Node.js 20+**
2. **pnpm** — `npm install -g pnpm`
3. **PostgreSQL 14+** — running locally or remotely

---

## How to run the project

### 1. Install dependencies

From the project root:

```bash
pnpm install
```

This installs packages for the root workspace, `apps/web`, `apps/server`, and `packages/shared`.

### 2. Configure environment variables

**Backend** — copy the example env file and edit it:

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/canvas
JWT_SECRET=your_random_secret_here
JWT_REFRESH_SECRET=another_random_secret_here
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend** — create `apps/web/.env` (optional; defaults work for local dev):

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```

### 3. Set up the database

Create a PostgreSQL database named `canvas` (or match your `DATABASE_URL`), then run migrations:

```bash
pnpm db:migrate
```

Optional — seed demo data:

```bash
pnpm db:seed
```

This creates a demo user:

- Email: `demo@canvas.app`
- Password: `password123`

### 4. Start development servers

```bash
pnpm dev
```

This runs **both** apps concurrently:

| Service | URL |
|---------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Express + Socket.IO) | http://localhost:4000 |

### 5. Other useful commands

| Command | What it does |
|---------|--------------|
| `pnpm build` | Build server and web for production |
| `pnpm --filter server start` | Run built server (`node dist/index.js`) |
| `pnpm --filter web preview` | Preview built frontend |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm db:seed` | Re-run seed script |

---

## Project structure

This is a **pnpm monorepo**. All apps share TypeScript types from one package.

```
Canvas/
├── apps/
│   ├── web/                    # React frontend
│   │   ├── src/
│   │   │   ├── main.tsx        # App entry point
│   │   │   ├── App.tsx         # Route definitions
│   │   │   ├── pages/          # Screen-level components
│   │   │   │   ├── LandingPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── DashboardPage.tsx   # Board list & creation
│   │   │   │   └── BoardPage.tsx       # Main whiteboard UI
│   │   │   ├── board/          # Canvas-specific UI
│   │   │   │   ├── CanvasStage.tsx     # Konva canvas (draw, pan, zoom)
│   │   │   │   ├── Toolbar.tsx         # Tool picker (sticky, shape, pen…)
│   │   │   │   ├── TopBar.tsx          # Board name, users, actions
│   │   │   │   ├── RightPanel.tsx      # Comments & properties
│   │   │   │   ├── RemoteCursors.tsx   # Other users' cursors
│   │   │   │   ├── PresentationMode.tsx
│   │   │   │   └── types.ts            # Tool & viewport types
│   │   │   ├── components/     # Reusable UI (AuthGuard, modals)
│   │   │   ├── context/
│   │   │   │   └── AuthContext.tsx     # Login state
│   │   │   ├── hooks/
│   │   │   │   ├── useBoardSocket.ts   # Socket.IO client
│   │   │   │   └── useHistory.ts       # Undo/redo stack
│   │   │   └── lib/
│   │   │       └── api.ts              # Axios client + auth
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── server/                 # Express + Socket.IO backend
│       ├── src/
│       │   ├── index.ts        # HTTP server, routes, uploads
│       │   ├── socket.ts       # Real-time events
│       │   ├── routes/
│       │   │   ├── auth.ts     # Register, login, refresh, logout
│       │   │   └── boards.ts   # Boards, elements, comments, frames
│       │   ├── middleware/
│       │   │   └── auth.ts     # JWT verification for REST
│       │   └── lib/
│       │       ├── auth.ts     # Password hashing, JWT helpers
│       │       ├── prisma.ts   # Prisma client singleton
│       │       ├── params.ts   # Route param helpers
│       │       └── templates.ts # Board template element layouts
│       ├── uploads/            # Uploaded images (created at runtime)
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared TypeScript types & constants
│       └── src/index.ts        # User, Board, Element, Comment, Frame…
│
├── prisma/
│   ├── schema.prisma           # Database models
│   ├── migrations/             # SQL migration history
│   └── seed.ts                 # Demo data script
│
├── package.json                # Root scripts (dev, build, db:*)
├── pnpm-workspace.yaml
├── README.md
└── INSTRUCTIONS.md             # This file
```

### Package relationships

```
@canvas/shared  ←── imported by ──→  apps/web
                 ←── imported by ──→  apps/server
```

Both apps import types like `Element`, `Comment`, and `Board` from `@canvas/shared` so the frontend and backend stay in sync.

---

## How the app works

### High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Pages     │  │  CanvasStage │  │  useBoardSocket (WS)   │ │
│  │  Dashboard  │  │  (Konva.js)  │  │  live cursors, sync    │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         │                │                       │               │
│         └────────────────┼───────────────────────┘               │
│                          │ axios (REST) + Socket.IO               │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Express + Socket.IO (port 4000)              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ /api/auth   │  │ /api/boards │  │  socket.ts (real-time) │  │
│  │ JWT + cookie│  │ CRUD + RBAC │  │  element/cursor events │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬─────────────┘  │
│         └────────────────┼──────────────────────┘                 │
│                          │ Prisma ORM                             │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

The app uses **two channels** to talk to the server:

1. **REST API** (`/api/*`) — auth, loading boards, persisting changes from the local user
2. **WebSocket** (Socket.IO) — broadcasting changes and cursors to other users in real time

---

### User flow

1. **Landing** (`/`) — marketing page
2. **Register / Login** (`/register`, `/login`) — creates session
3. **Dashboard** (`/dashboard`) — lists boards the user belongs to; create new boards from templates
4. **Board** (`/board/:id`) — the main whiteboard experience

Protected routes (`/dashboard`, `/board/:id`) are wrapped in `AuthGuard`, which redirects unauthenticated users to `/login`.

---

### Authentication

Canvas uses **JWT access tokens** plus **HTTP-only refresh cookies**.

| Token | Lifetime | Storage | Used for |
|-------|----------|---------|----------|
| Access token | 15 minutes | In-memory (`api.ts`) | REST `Authorization: Bearer` header and Socket.IO `auth.token` |
| Refresh token | 7 days | HTTP-only cookie | Silent token refresh via `POST /api/auth/refresh` |

**Login / register flow:**

1. User submits credentials → `POST /api/auth/login` or `/register`
2. Server returns `{ accessToken, user }` and sets `refreshToken` cookie
3. Frontend stores access token in memory via `setAccessToken()`
4. `AuthContext` holds the current `user` for the UI

**Auto-refresh:** If a REST call returns 401, `api.ts` intercepts it, calls `/auth/refresh`, retries the original request.

**Socket auth:** When joining a board, `useBoardSocket` connects with `auth: { token: getAccessToken() }`. The server verifies the JWT before allowing the connection.

---

### Boards and permissions

Each board has **members** with roles:

| Role | Can view | Can edit elements | Can invite / delete board |
|------|----------|-------------------|---------------------------|
| `viewer` | Yes | No | No |
| `editor` | Yes | Yes | No |
| `owner` | Yes | Yes | Yes |

Access checks live in `apps/server/src/routes/boards.ts` (`checkAccess`) and in `socket.ts` (viewers cannot emit edit events).

**Creating a board:**

1. User picks a name and optional template on the dashboard
2. `POST /api/boards` creates the board and adds the creator as `owner`
3. If a template is chosen (brainstorm, kanban, mind map, roadmap), `templates.ts` generates starter elements

---

### The whiteboard (BoardPage)

`BoardPage.tsx` is the orchestrator. It:

1. **Loads** the full board via `GET /api/boards/:id` (elements, comments, frames, members)
2. **Manages local state** for elements, comments, frames, selected tool, viewport, etc.
3. **Connects** to Socket.IO via `useBoardSocket`
4. **Renders** child components:
   - `CanvasStage` — infinite canvas
   - `Toolbar` — tools and colors
   - `TopBar` — board title, online users, undo/redo
   - `RightPanel` — comments
   - `RemoteCursors` — other users' pointer positions
   - `PresentationMode` — frame-by-frame presentation

---

### Canvas rendering (Konva.js)

`CanvasStage.tsx` uses **react-konva** to draw on an HTML canvas.

**Viewport:** The canvas supports pan and zoom. A `viewport` object tracks `{ x, y, scale }`. Mouse wheel zooms toward the cursor; spacebar + drag pans.

**Element types** (stored in DB `Element.type` + `Element.data` JSON):

| Type | Description | Key `data` fields |
|------|-------------|-------------------|
| `sticky` | Sticky note | `text`, `color`, `fontSize` |
| `shape` | Rectangle, circle, etc. | `shape`, `fill`, `stroke` |
| `drawing` | Freehand pen stroke | `points`, `stroke`, `strokeWidth` |
| `text` | Standalone text | `text`, `fontSize`, `fill` |
| `arrow` | Connector arrow | `points` |
| `image` | Uploaded image | `src` (URL path) |

**Tools** (`board/types.ts`): `select`, `pan`, `sticky`, `shape`, `pen`, `text`, `arrow`, `frame`, `comment`

**Interactions:**

- Select tool — click to select, drag to move, transformer handles resize/rotate
- Drawing tools — mouse down/move/up create new elements
- Changes call `onAddElement`, `onUpdateElement`, or `onDeleteElements` passed from `BoardPage`

---

### Real-time collaboration

When User A edits something, this is the typical flow:

```
User A (browser)                Server                    User B (browser)
     │                            │                            │
     │  REST: POST/PATCH element  │                            │
     │ ─────────────────────────► │  saves to PostgreSQL       │
     │                            │                            │
     │  WS: element-add/update    │                            │
     │ ─────────────────────────► │  broadcast to room         │
     │                            │ ─────────────────────────► │  updates local state
     │                            │                            │
     │  WS: cursor-move           │                            │
     │ ─────────────────────────► │  cursor-update             │
     │                            │ ─────────────────────────► │  RemoteCursors renders
```

**Socket events** (defined in `socket.ts` / `useBoardSocket.ts`):

| Client emits | Server broadcasts | Purpose |
|--------------|-------------------|---------|
| `join-board` | `online-users`, `user-joined` | Enter a board room |
| `leave-board` | `user-left` | Leave room |
| `cursor-move` | `cursor-update` | Live cursor position |
| `element-add` | `element-added` | New element from peer |
| `element-update` | `element-updated` | Element moved/resized |
| `element-delete` | `element-deleted` | Element removed |
| `comment-add` | `comment-added` | New comment thread/reply |

**Important:** The user who makes a change persists it via REST first, then emits the socket event so others receive it. Remote users apply incoming socket events to their React state without re-fetching the whole board.

---

### Undo / redo

`useHistory.ts` maintains a local undo stack on the client. Each action (add, update, delete) pushes `{ undo, redo }` callbacks. This is **per-browser** — undo does not sync to other users and does not revert server state unless the undo callback triggers another API call.

---

### Comments

Comments are anchored to canvas coordinates `(x, y)`. Top-level comments can have **replies** (`parentId` in the DB). They can be **resolved** via `PUT /api/boards/:id/comments/:cid`.

---

### Presentation mode

**Frames** are rectangular regions on the board (like slides). `PresentationMode` lets you step through frames in order (`Frame.order`) for walkthroughs.

---

### Image uploads

`POST /api/upload` accepts image files (PNG, JPEG, WebP, max 10 MB). Files are stored in `apps/server/uploads/` and served at `/uploads/:filename`. Image elements reference this URL in `data.src`.

---

## Database schema (summary)

Defined in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| `User` | Account (email, password hash, avatar color) |
| `Session` | Refresh token sessions |
| `Board` | Whiteboard metadata |
| `BoardMember` | User ↔ board membership + role |
| `Element` | Canvas objects (type, position, JSON data) |
| `Comment` | Threaded comments at x/y coordinates |
| `Frame` | Presentation slide regions |

Run `pnpm db:studio` to explore tables visually.

---

## REST API reference (quick)

All board routes require `Authorization: Bearer <accessToken>`.

**Auth** (`/api/auth`):

- `POST /register` — create account
- `POST /login` — sign in
- `POST /logout` — revoke refresh token
- `POST /refresh` — new access token (uses cookie)
- `GET /me` — current user

**Boards** (`/api/boards`):

- `GET /` — list my boards
- `POST /` — create board
- `GET /:id` — full board with elements, comments, frames
- `PUT /:id` — rename / update description
- `DELETE /:id` — delete (owner only)
- `POST /:id/invite` — add member by email
- `GET|POST|PUT|DELETE /:id/elements[...]` — element CRUD
- `GET|POST|PUT|DELETE /:id/comments[...]` — comment CRUD
- `GET|POST|PUT|DELETE /:id/frames[...]` — frame CRUD

**Health:** `GET /api/health` → `{ ok: true }`

---

## Development tips

### Where to start for common changes

| Goal | Start here |
|------|------------|
| Add a new canvas tool | `board/types.ts`, `Toolbar.tsx`, `CanvasStage.tsx` |
| Change real-time behavior | `apps/server/src/socket.ts`, `useBoardSocket.ts` |
| Add REST endpoint | `apps/server/src/routes/boards.ts` or `auth.ts` |
| Change shared types | `packages/shared/src/index.ts` |
| Add DB field | `prisma/schema.prisma` → `pnpm db:migrate` |
| New board template | `apps/server/src/lib/templates.ts` |
| Styling / layout | Tailwind classes in page and board components |

### Path aliases

The frontend uses `@/` as an alias for `apps/web/src/` (configured in `vite.config.ts`).

### Production build

```bash
pnpm build
```

- Server output: `apps/server/dist/`
- Web output: `apps/web/dist/`

Set `NODE_ENV=production` on the server so refresh cookies use `secure: true`.

---

## Troubleshooting

| Problem | Likely fix |
|---------|------------|
| `JWT secrets not configured` | Fill in `JWT_SECRET` and `JWT_REFRESH_SECRET` in `apps/server/.env` |
| Database connection error | Check PostgreSQL is running and `DATABASE_URL` is correct |
| CORS errors | Ensure `CLIENT_ORIGIN` matches the Vite URL (`http://localhost:5173`) |
| WebSocket won't connect | Check `VITE_WS_URL` points to the backend; verify access token is set |
| Prisma client out of date | Run `pnpm db:migrate` after schema changes |
| Port already in use | Change `PORT` in server `.env` or Vite port in `vite.config.ts` |

---

## Summary

1. **Monorepo** with a React/Konva frontend, Express/Socket.IO backend, and shared types package.
2. **Run** with `pnpm install` → configure `.env` → `pnpm db:migrate` → `pnpm dev`.
3. **REST** handles auth and persistence; **Socket.IO** broadcasts live edits and cursors.
4. **BoardPage + CanvasStage** drive the whiteboard; **Prisma + PostgreSQL** store all data.

Open http://localhost:5173 after starting dev servers, register or use the seed account, create a board, and open it in two browser windows to see real-time collaboration in action.
