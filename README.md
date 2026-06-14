# Swinburne Equipment Portal

Web portal for managing classroom equipment borrowing and returns — Sprint 1 demo.

## Tech Stack

- **Frontend: Vue.js** (Vue 3 + Vite) — single-page app, runs in the browser
- **Backend: Node.js** — not included in this build; production is frontend-only, with data in the browser's `localStorage`
- Build tool: Node.js (Vite/npm) — build/dev time only
- Deploy: Vercel (static SPA)

## How It Works

This is a client-only SPA. All data (users, equipment, borrow requests) lives in
`client/src/store.js` and is persisted to the browser's `localStorage`
(keys `swin-demo-users`, `swin-demo-equipment`, `swin-demo-borrowRequests`).

There is no server and no real authentication — it is a demo. `client/src/api.js`
delegates every call to the in-browser store, so the UI behaves as if it were
talking to a backend.

The store seeds default data on first load. Bumping `SEED_VERSION` in
`client/src/store.js` clears stale `localStorage` on the next visit, so the demo
always starts from the latest seed (and the relative seed dates stay fresh).

Basic flow:

1. Open the app, pick a demo account in the Google-style chooser.
2. The dashboard loads summary, equipment, active requests, sprint plan and history.
3. Borrow / approve / deny / check out / return / extend / update status — all handled
   in-browser, then the dashboard reloads from the store.

## Run

```bash
npm install
npm run dev
```

- Dev server: `http://127.0.0.1:5173`
- Production build: `npm run build` (output: `client/dist`)
- Preview the build: `npm run preview`

## Demo Login

Click an account in the Google-style chooser — there is no password form. Only
`@fpt.edu.vn` accounts can sign in.

| Email | Role |
|-------|------|
| `buidangminh23@fpt.edu.vn` | LECTURER |
| `taolaminhanh1@fpt.edu.vn` | SUPPORT |
| `buidangminh.lh@fpt.edu.vn` | STUDENT |
| `hiheho911@fpt.edu.vn` | EVENT_STAFF |
| `dindungwork@fpt.edu.vn` | ADMIN |

## Features by Role

### Shared
- Login/logout, Swinburne-style dashboard, topbar notifications, profile dropdown, sidebar navigation.
- Sprint roadmap (4 sprints).

### Lecturer / Support / Admin
- View all requests and pending approvals.
- Approve, deny, check out, extend and edit borrow requests.
- Confirm returns with condition checklist (sets Maintenance on damage).
- Update equipment status: Available, Borrowed, Maintenance, Retired.
- Admin also manages equipment inventory and user roles.

### Student
- Borrow equipment and view personal Borrow History.

## Sprint Plan

- Sprint 1: Classroom use, login/logout, view equipment, borrow, confirm returns, update status.
- Sprint 2: Student requests, support handover, borrowing extensions, notifications.
- Sprint 3: Inventory CRUD, user management, reporting, audit trail.
- Sprint 4: Admin governance, role permissions, analytics, production hardening.

## Quick Test

```bash
npm run build
```

Manual smoke test (`npm run dev`):

1. Log in as `buidangminh23@fpt.edu.vn` (LECTURER).
2. Borrow an available item; approve a pending request.
3. Confirm return of a borrowed item; update an item to Maintenance.
4. Log in as `buidangminh.lh@fpt.edu.vn` (STUDENT) and check the Borrow History.
5. Log in as `dindungwork@fpt.edu.vn` (ADMIN) to check equipment and user management.
