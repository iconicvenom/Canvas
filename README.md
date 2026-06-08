# Canvas

A full-stack, real-time collaborative whiteboard. Multiple people can edit the same board at once, see live pointer positions, leave threaded comments, and walk through presentation frames — all in the browser.

Built with **React**, **Konva.js**, **Express**, **Socket.IO**, and **PostgreSQL**.

**Author:** [Vignesh Goud](https://github.com/iconicvenom) ([@iconicvenom](https://github.com/iconicvenom))

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [How to use the app](#how-to-use-the-app)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Database schema](#database-schema)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Development guide](#development-guide)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

| Category | Capabilities |
|----------|--------------|
| **Canvas** | Infinite pan & zoom, dot grid background, multi-select, align & distribute |
| **Elements** | Sticky notes, rectangles, circles, lines, arrows, freehand pen, text, images, frames |
| **Collaboration** | Real-time element sync, live named cursors, online presence indicators |
| **Comments** | Pin comments to canvas coordinates, threaded replies, resolve threads |
| **Presentation** | Frame-based slide navigation for walkthroughs |
| **Templates** | Blank, Brainstorm, Kanban, Mind Map, Roadmap starter layouts |
| **Auth** | Email/password registration, JWT access tokens, HTTP-only refresh cookies |
| **Permissions** | Owner, editor, and viewer roles per board |
| **History** | Local undo/redo (per browser session) |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, Tailwind CSS, react-konva (Konva.js) |
| Backend | Express 4, Socket.IO 4, Multer |
| Database | PostgreSQL 14+ with Prisma ORM |
| Monorepo | pnpm workspaces |
| Shared types | `@canvas/shared` internal package |
| Deployment | Vercel (optional — API, WebSockets, and static frontend on one domain) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Pages     │  │  CanvasStage │  │  useBoardSocket (WS)   │ │
│  │  Dashboard  │  │  (Konva.js)  │  │  live cursors, sync    │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬────────────┘ │
│         └────────────────┼───────────────────────┘               │
│                          │  REST (Axios) + WebSocket (Socket.IO) │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                 Express + Socket.IO (port 4000)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐ │
│  │ /api/auth   │  │ /api/boards │  │  Real-time board rooms   │ │
│  │ JWT + cookie│  │ CRUD + RBAC │  │  cursors, element events   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬─────────────┘ │
│         └────────────────┼──────────────────────┘                 │
│                          │ Prisma ORM                             │
└──────────────────────────┼───────────────────────────────────────┘
                           ▼
                    ┌─────────────┐
                    │ PostgreSQL  │
                    └─────────────┘
```

The app uses **two communication channels**:

1. **REST API** (`/api/*`) — authentication, loading boards, persisting the local user's edits
2. **WebSocket** (Socket.IO) — broadcasting edits and pointer positions to everyone else on the board

---

## Getting started

### Prerequisites

- **Node.js 20+**
- **pnpm** — install with `npm install -g pnpm`
- **PostgreSQL 14+** — running locally or on a hosted provider (Neon, Supabase, etc.)

### 1. Clone and install

```bash
git clone https://github.com/iconicvenom/Canvas.git
cd Canvas
pnpm install
```

### 2. Configure environment

**Backend** — copy the example file and fill in your values:

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/canvas
JWT_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=another_long_random_secret
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend** (optional for local dev — defaults work out of the box):

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_WS_URL=http://localhost:4000
```

### 3. Set up the database

Create a PostgreSQL database (e.g. named `canvas`), then run migrations:

```bash
pnpm db:migrate
```

**Optional** — seed a demo account and sample board:

```bash
pnpm db:seed
```

| Field | Value |
|-------|-------|
| Email | `demo@canvas.app` |
| Password | `password123` |

### 4. Run locally

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Health check | http://localhost:4000/api/health |

### 5. Production build (self-hosted)

```bash
pnpm build
pnpm --filter server start   # serves API on PORT (default 4000)
pnpm --filter web preview    # preview built frontend
```

Set `NODE_ENV=production` on the server so refresh-token cookies use the `secure` flag.

---

## How to use the app

### Account & navigation

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/register` | Create a new account |
| `/login` | Sign in |
| `/dashboard` | View and create boards (requires login) |
| `/board/:id` | Open a whiteboard (requires membership) |

Protected routes redirect unauthenticated users to `/login`.

### Dashboard

1. Sign in or register.
2. Click **New board** to create a board.
3. Choose a **template** (Blank, Brainstorm, Kanban, Mind Map, or Roadmap) or start empty.
4. Click a board card to open it.
5. Use **Invite** (owners only) to add collaborators by email.

### Whiteboard tools

| Shortcut | Tool | Action |
|----------|------|--------|
| `V` | Select | Click to select; drag to move; resize/rotate with handles |
| `H` | Pan | Drag to move the viewport (or hold **Space** temporarily) |
| `S` | Sticky | Click to place a sticky note; double-click to edit text |
| `P` | Pen | Freehand drawing |
| `R` | Rectangle | Click-drag to draw a rectangle |
| `C` | Circle | Click-drag to draw a circle |
| `L` | Line | Click-drag to draw a line |
| `A` | Arrow | Click-drag to draw an arrow |
| `T` | Text | Click to place editable text |
| `E` | Eraser | Remove elements |
| `F` | Frame | Draw a presentation frame region |
| `M` | Comment | Click to pin a comment thread |

**Viewport controls:**

- **Scroll wheel** — zoom toward pointer
- **Space + drag** — pan the canvas
- **Delete / Backspace** — remove selected elements

**Top bar:**

- Rename the board inline
- See who is online
- Undo / redo (local to your browser)
- Enter **presentation mode** when frames exist

### Collaboration

1. Invite another registered user as **editor** or **viewer**.
2. Both users open the same board URL.
3. Edits sync in real time; each user sees colored pointer labels for others.
4. Viewers can see the board but cannot edit.

### Comments

1. Select the comment tool (`M`) and click on the canvas.
2. Type your message in the right panel.
3. Reply to threads; mark threads as **resolved** when done.

### Presentation mode

1. Create frames with the frame tool (`F`).
2. Click **Present** in the top bar.
3. Navigate between frames in order for a slide-style walkthrough.

---

## How it works

### User session flow

```
Register/Login → JWT access token (memory) + refresh cookie (HTTP-only)
      ↓
Dashboard loads boards via GET /api/boards
      ↓
Open board → GET /api/boards/:id (elements, comments, frames, members)
      ↓
Socket.IO connects with access token → join-board room
      ↓
Edits: REST persist first → socket broadcast to peers
```

### Authentication

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 minutes | In-memory (`apps/web/src/lib/api.ts`) | `Authorization: Bearer` header + Socket.IO auth |
| Refresh token | 7 days | HTTP-only cookie | Silent renewal via `POST /api/auth/refresh` |

On a 401 response, the Axios interceptor automatically refreshes the access token and retries the failed request.

### Board permissions

| Role | View | Edit | Invite members | Delete board |
|------|------|------|----------------|--------------|
| `viewer` | Yes | No | No | No |
| `editor` | Yes | Yes | No | No |
| `owner` | Yes | Yes | Yes | Yes |

Enforced in REST routes (`checkAccess` in `boards.ts`) and Socket.IO handlers (viewers cannot emit edit events).

### Real-time sync

When **User A** makes a change:

```
User A                         Server                      User B
  │                              │                            │
  │ POST/PUT/DELETE /api/...     │                            │
  │ ────────────────────────────► │ Save to PostgreSQL         │
  │                              │                            │
  │ emit element-add/update/...  │                            │
  │ ────────────────────────────► │ broadcast to board room    │
  │                              │ ──────────────────────────► │ Update React state
```

The editing user persists via REST, then emits a socket event. Other clients apply socket payloads directly without re-fetching the full board.

**Socket events:**

| Client emits | Server broadcasts | Purpose |
|--------------|-------------------|---------|
| `join-board` | `online-users`, `user-joined` | Enter board room |
| `leave-board` | `user-left` | Leave room |
| `cursor-move` | `cursor-update` | Live pointer position |
| `element-add` | `element-added` | New element from a peer |
| `element-update` | `element-updated` | Move, resize, or edit |
| `element-delete` | `element-deleted` | Removed element |
| `comment-add` | `comment-added` | New comment or reply |

### Canvas rendering

`CanvasStage.tsx` renders the board with **react-konva**. Each database row becomes a Konva node. Element geometry lives in columns (`x`, `y`, `width`, `height`, `rotation`); styling and content live in a JSON `data` field.

| `Element.type` | Description | Typical `data` fields |
|----------------|-------------|------------------------|
| `sticky` | Sticky note | `text`, `color`, `fontSize` |
| `shape` | Rectangle, circle, line | `shape`, `fill`, `stroke` |
| `drawing` | Pen stroke | `points`, `stroke`, `strokeWidth` |
| `text` | Standalone label | `text`, `fontSize`, `fill` |
| `arrow` | Connector | `points` |
| `image` | Uploaded image | `src` (URL) |

Remote pointers render as HTML overlays (`RemoteCursors.tsx`) outside the Konva stage so pointer movement does not force a full canvas redraw.

### Undo / redo

`useHistory.ts` keeps a per-browser undo stack. Undo/redo is **local** — it does not sync to other users. Undo callbacks may trigger additional API calls to revert server state.

### Board templates

When a board is created with a template ID, `apps/server/src/lib/templates.ts` inserts pre-positioned starter elements:

| Template ID | Layout |
|-------------|--------|
| `blank` | Empty board |
| `brainstorm` | Central topic with surrounding stickies |
| `kanban` | To Do / Doing / Done columns |
| `mindmap` | Radial node layout |
| `roadmap` | Timeline-style frames and labels |

### Image uploads

- **Local dev:** `POST /api/upload` saves files to `apps/server/uploads/` and serves them at `/uploads/:filename`.
- **Vercel:** images are stored as base64 in element data (no persistent disk on serverless).

---

## Project structure

```
Canvas/
├── api/
│   └── index.ts                 # Vercel serverless entry (wraps Express + Socket.IO)
├── apps/
│   ├── web/                     # React + Vite frontend
│   │   ├── public/
│   │   │   └── canvas-landing.html
│   │   └── src/
│   │       ├── main.tsx         # React entry
│   │       ├── App.tsx          # Routes
│   │       ├── pages/           # Landing, Login, Register, Dashboard, Board
│   │       ├── board/           # CanvasStage, Toolbar, TopBar, panels, cursors
│   │       ├── components/      # AuthGuard, NewBoardModal
│   │       ├── context/         # AuthContext
│   │       ├── hooks/           # useBoardSocket, useHistory
│   │       └── lib/             # Axios API client
│   └── server/                  # Express + Socket.IO backend
│       └── src/
│           ├── index.ts         # Local dev server entry
│           ├── createApp.ts     # Shared app factory (local + Vercel)
│           ├── socket.ts        # Real-time events
│           ├── routes/          # auth.ts, boards.ts
│           ├── middleware/      # JWT auth middleware
│           └── lib/             # auth, prisma, templates, params
├── packages/
│   └── shared/                  # Shared TypeScript types (@canvas/shared)
├── prisma/
│   ├── schema.prisma            # Database models
│   ├── migrations/              # Migration history
│   └── seed.ts                  # Demo data
├── vercel.json                  # Vercel routing & build config
├── DEPLOY.md                    # Detailed deployment guide
├── INSTRUCTIONS.md              # Extended developer reference
├── package.json                 # Root workspace scripts
└── pnpm-workspace.yaml
```

**Package dependency:**

```
@canvas/shared  ←── apps/web
                ←── apps/server
```

---

## Environment variables

### Backend (`apps/server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing secret |
| `PORT` | No | Server port (default `4000`) |
| `CLIENT_ORIGIN` | No | Frontend origin for CORS (default `http://localhost:5173`) |

### Frontend (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend base URL (default `http://localhost:4000`) |
| `VITE_WS_URL` | No | WebSocket server URL (default `http://localhost:4000`) |

### Vercel (production)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Pooled PostgreSQL URL (`?sslmode=require` for Neon) |
| `JWT_SECRET` | Yes | Long random string |
| `JWT_REFRESH_SECRET` | Yes | Long random string |
| `CLIENT_ORIGIN` | After deploy | Your live URL, e.g. `https://your-app.vercel.app` |

---

## API reference

All `/api/boards/*` routes require `Authorization: Bearer <accessToken>`.

### Auth — `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Create account `{ email, name, password }` |
| `POST` | `/login` | Sign in `{ email, password }` |
| `POST` | `/logout` | Revoke refresh token |
| `POST` | `/refresh` | Issue new access token (uses cookie) |
| `GET` | `/me` | Current user profile |

### Boards — `/api/boards`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List boards for current user |
| `POST` | `/` | Create board `{ name, description?, templateId? }` |
| `GET` | `/:id` | Full board (elements, comments, frames, members) |
| `PUT` | `/:id` | Update name/description |
| `DELETE` | `/:id` | Delete board (owner only) |
| `POST` | `/:id/invite` | Add member `{ email, role? }` |

### Elements — `/api/boards/:id/elements`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List elements |
| `POST` | `/` | Create element |
| `PUT` | `/:eid` | Update element |
| `DELETE` | `/:eid` | Delete element |

### Comments — `/api/boards/:id/comments`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List top-level comments with replies |
| `POST` | `/` | Create comment `{ x, y, text, parentId? }` |
| `PUT` | `/:cid` | Update text or `resolved` flag |
| `DELETE` | `/:cid` | Delete comment |

### Frames — `/api/boards/:id/frames`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List frames |
| `POST` | `/` | Create frame |
| `PUT` | `/:fid` | Update frame |
| `DELETE` | `/:fid` | Delete frame |

### Other

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | `{ ok: true }` |
| `POST` | `/api/upload` | Upload image (multipart `file` field) |

---

## Database schema

Defined in `prisma/schema.prisma`:

| Model | Purpose |
|-------|---------|
| `User` | Account (email, bcrypt password hash, avatar color) |
| `Session` | Refresh token sessions |
| `Board` | Whiteboard metadata and template ID |
| `BoardMember` | User ↔ board link with role |
| `Element` | Canvas objects (type, position, JSON data, z-index) |
| `Comment` | Threaded comments at canvas coordinates |
| `Frame` | Presentation slide regions |

Browse data visually with `pnpm db:studio`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start frontend (Vite) and backend (tsx watch) concurrently |
| `pnpm build` | Build server and web for production |
| `pnpm vercel-build` | Prisma generate + migrate deploy + build (used by Vercel) |
| `pnpm db:migrate` | Run Prisma migrations (development) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Insert demo user and sample board |

---

## Deployment

Canvas can be deployed to **Vercel** with the frontend, REST API, and WebSockets on a single domain. See **[DEPLOY.md](./DEPLOY.md)** for the full walkthrough.

**Quick summary:**

1. Create a PostgreSQL database (Neon recommended — use the **pooled** connection string).
2. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`.
3. Deploy via Vercel CLI or by importing the GitHub repo at [vercel.com/new](https://vercel.com/new).
4. After the first deploy, set `CLIENT_ORIGIN` to your live URL and redeploy.

**Verify after deploy:**

- `https://your-app.vercel.app/` — landing page
- `https://your-app.vercel.app/register` — sign up
- `https://your-app.vercel.app/api/health` — `{"ok":true}`

---

## Development guide

### Where to change things

| Goal | Files to edit |
|------|---------------|
| Add a canvas tool | `apps/web/src/board/types.ts`, `Toolbar.tsx`, `CanvasStage.tsx` |
| Change real-time behavior | `apps/server/src/socket.ts`, `useBoardSocket.ts` |
| Add a REST endpoint | `apps/server/src/routes/boards.ts` or `auth.ts` |
| Update shared types | `packages/shared/src/index.ts` |
| Add a database field | `prisma/schema.prisma` → `pnpm db:migrate` |
| New board template | `apps/server/src/lib/templates.ts` |

### Path alias

The frontend uses `@/` → `apps/web/src/` (configured in `vite.config.ts`).

### Test real-time collaboration locally

1. Run `pnpm dev`.
2. Open http://localhost:5173 in two browser windows (or one normal + one incognito).
3. Sign in as two different users on the same board.
4. Draw in one window — changes appear in the other.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `JWT secrets not configured` | Set `JWT_SECRET` and `JWT_REFRESH_SECRET` in `apps/server/.env` |
| Database connection failed | Confirm PostgreSQL is running; check `DATABASE_URL` |
| CORS errors | Set `CLIENT_ORIGIN` to match your frontend URL exactly |
| WebSocket won't connect | Verify `VITE_WS_URL`; ensure you are logged in (valid access token) |
| Prisma client outdated | Run `pnpm db:migrate` after schema changes |
| Port in use | Change `PORT` in server `.env` or Vite port in `vite.config.ts` |
| Vercel: socket issues | Confirm `CLIENT_ORIGIN` matches your deployed URL |

---

## Author

**Vignesh Goud** — [@iconicvenom](https://github.com/iconicvenom)

## License

MIT
