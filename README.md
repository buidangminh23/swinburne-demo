# Swinburne Equipment Portal

Web portal for borrowing, returning, and scheduling classroom and lab equipment.
Frontend-only production build.

## Tech Stack

- **Frontend:** Vue 3 + Vite single-page app (runs in the browser).
- **Data:** in-browser `localStorage` store (no backend in this build).
- **Deploy:** Vercel (static SPA).

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # output: client/dist
```

## Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `VITE_APP_MODE` | `production` | `production` = catalog only, typed `@fpt.edu.vn` login. `demo` = full seed data + click-to-login chooser. |
| `VITE_GOOGLE_CLIENT_ID` | — | Enables real Google sign-in (optional). |

## Login

Sign in with an `@fpt.edu.vn` account. Production uses typed-email login; the
demo build shows a click-to-login chooser (no password).

| Email | Role |
|-------|------|
| `buidangminh23@fpt.edu.vn` | LECTURER |
| `taolaminhanh1@fpt.edu.vn` | SUPPORT |
| `dindungwork@fpt.edu.vn` | ADMIN |
| `buidangminh.lh@fpt.edu.vn` | STUDENT |
| `hiheho911@fpt.edu.vn` | EVENT_STAFF |
| `operations@fpt.edu.vn` | OPERATIONS |

## Roles & Permissions

| Role | Capabilities |
|------|--------------|
| **Student** | Submit borrow requests (need approval). Full edit before approval, extend-only after. View own history. |
| **Lecturer** | Borrow instantly. Approve / deny / check-out / return. Edit requests for students in units they teach. |
| **Support / Operations** | Borrow instantly. Manage approvals, returns, and equipment status. |
| **Event Staff** | Borrow instantly **for events only**. May take over an item a lecturer is currently borrowing (auto-returns the lecturer's loan). |
| **Admin** | All of the above, plus equipment inventory and user-role management. |

## Key Behaviors

- **Approval:** student requests start as `REQUESTED` (pending); staff and
  lecturers borrow as `BORROWED` immediately.
- **Unit-based borrowing:** each borrow is tied to a Unit or Research Project;
  classroom borrows auto-fill the schedule and room.
- **Rejected** requests stay listed with a red chip (they are not deleted).
- **Availability** is computed per time window (5 units per item); statuses:
  Available / Borrowed / Maintenance / Retired.
- **Demo data:** bumping `SEED_VERSION` in `client/src/store.js` resets
  `localStorage` on the next load.
