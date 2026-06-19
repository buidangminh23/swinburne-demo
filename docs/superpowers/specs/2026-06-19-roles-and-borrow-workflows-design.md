# Roles + Borrow Workflows — Design Spec (2026-06-19)

Sub-project 1 of the UI/UX feedback redesign. **Demo app only** (`demo/`); production mirror is a later sub-project. Identifiers in English; no inline comments (project rule).

## 0. Scope

In scope (this spec):
1. Rename roles `SUPPORT → EQUIPMENT_MANAGER`, `OPERATIONS → SERVER_MANAGER` across the demo app.
2. Permission lockdown: students can no longer borrow equipment.
3. Borrow workflows: Classroom (lecturer, no approval), Research (lecturer picks an Equipment Manager who approves; no students), Event (event staff picks an Equipment Manager who approves, with current-holder + availability notifications).
4. Classroom auto-fill lock (selecting a unit fills + freezes schedule fields).
5. Data model: `assignedManagerId` on `BorrowRequest`.

Out of scope (later sub-projects): Server borrowing (#4), Schedules redesign (#5), CSV semester import (#6), production mirror.

## 1. Role rename

`UserRole` enum (demo Prisma + all mocks): `STUDENT | LECTURER | EQUIPMENT_MANAGER | ADMIN | SERVER_MANAGER | EVENT_STAFF`.

Touch points (~13 files):
- `demo/prisma/schema.prisma` — enum values.
- `demo/server/src/seed.js` — seed users: existing SUPPORT users → `EQUIPMENT_MANAGER`; OPERATIONS user → `SERVER_MANAGER`.
- `demo/server/src/repository.js`, `demo/server/src/index.js` — role checks, permission maps. `EQUIPMENT_MANAGER` retains the permission set SUPPORT had (incl. `MANAGE_REQUEST`, `VIEW_ANY_HISTORY`) so `security.test.js` stays green.
- `demo/client/src/store.js` — `login()` email-keyword derivation: `support` → `EQUIPMENT_MANAGER`; `operations`/`ops` → `SERVER_MANAGER`. Seed users + permission arrays.
- `demo/client/src/components/AppShell.vue` — `displayRole` labels: "Equipment Manager" / "Server Manager"; role computeds; equipment-approver arrays `["LECTURER","SUPPORT","OPERATIONS","ADMIN"]` → `["EQUIPMENT_MANAGER","ADMIN"]` (lecturers no longer approve equipment; see §2).
- `RequestListView.vue` `APPROVER_ROLES`/`MANAGE_ROLES`, `HistoryLog.vue`, `ProfileView.vue`, `AdminUsersView.vue` role dropdown.
- `translate.js` — label strings if present.

Do NOT touch: `demo/server/test/security.test.js` (protected; verified it has no `SUPPORT`/`OPERATIONS` string refs). `demoOperations.js`/`demoOperations.test.js` "operations" = demo actions, not the role — leave unrelated strings.

## 2. Permission matrix (equipment only; servers are sub-project #4)

| Role | Classroom | Research | Event | Approves equipment |
|---|---|---|---|---|
| Lecturer | borrow instantly | request (picks EM) | — | no |
| Student | — | — | — | no |
| Event Staff | — | — | request (picks EM) | no |
| Equipment Manager | — (manage only) | — | — | yes + handover/returns |
| Server Manager | — | — | — | no |
| Admin | — | — | — | yes (oversight) |

- Equipment approver roles = `EQUIPMENT_MANAGER`, `ADMIN`.
- Borrow tab visibility: Lecturer (Classroom + Research) and Event Staff (Event) only. Students and managers do not see equipment borrow.

## 3. Workflows + status transitions

### Classroom (Lecturer)
Select equipment → select unit (auto-fill + lock, §5) → submit → `BORROWED` immediately (no approval, current behavior for non-students). `purpose = "CLASSROOM"`.

### Research (Lecturer)
Select Research Project + equipment → **select Equipment Manager** (dropdown of `EQUIPMENT_MANAGER` users) → submit → `REQUESTED` with `assignedManagerId = chosenEM`, `purpose = "RESEARCH"` → EM approves → `RESERVED` (future start) / `BORROWED` (immediate); reject → `REJECTED`. Students cannot create research borrows.

### Event (Event Staff)
Enter free-text Event name + select equipment + **select Equipment Manager** → submit → `REQUESTED`, `assignedManagerId = chosenEM`, `purpose = "EVENT"`, event name stored in `unitOrProject` → EM approves.
- On approval, if the item has another active `BORROWED` holder: notify that holder (`type: "EARLY_RETURN_REQUEST"`) to return early.
- Handover recorded via existing custody log on checkout.
- On return: if a waiting event request exists for that item, notify the event requester (`type: "EQUIPMENT_AVAILABLE"`).

### Approver routing (chosen EM, assigned)
- Client: an Equipment Manager's "Pending Approvals" queue filters to `req.status === "REQUESTED" && req.assignedManagerId === session.user.id`; Admin sees all `REQUESTED`.
- Server (`PATCH`/approve route): allow approve when actor `id === assignedManagerId` OR actor has `MANAGE_REQUEST` (back-compat keeps `security.test.js` green). Keep separation-of-duties (cannot approve own request).

## 4. Data model

`BorrowRequest` gains `assignedManagerId Int?` (Prisma `+ @@index`, relation to `User` optional; mocks add the field, default `null`). `approvedById`/`deniedById` unchanged. Borrow payload from BorrowPanel includes `assignedManagerId` for Research/Event (null for Classroom).

## 5. Classroom auto-fill lock

When `purpose === "CLASSROOM"` and a unit is selected: set `classroom`, `startDate`, `dueAt` from the unit timetable (existing `nextOccurrence` helper) and render those inputs `readonly`/`disabled`. Editing requires changing the unit.

## 6. Notifications (demo)

Add notification types: `EARLY_RETURN_REQUEST` (to current holder when an event request is approved for a borrowed item), `EQUIPMENT_AVAILABLE` (to the event requester when the item is returned). Reuse the existing notification channel in `apiMock`/server.

## 7. Verification

- `cd demo && npm --workspace server run build` (node --check) → `npm --workspace server test` MUST pass (22/22). `npm --workspace client run build` (vite) → `npm --workspace client test` MUST pass.
- Manual: lecturer classroom borrow is instant; lecturer research routes to the chosen EM only; that EM sees it, approves; event request notifies a current holder; student has no equipment borrow tab.

## 8. Hard constraints

- Do NOT edit `demo/server/test/security.test.js`.
- `EQUIPMENT_MANAGER` must keep SUPPORT's permission set so security tests pass.
- Keep identifiers English; no inline comments.
- Coordinate file ownership with the concurrent session (it has uncommitted edits in BorrowPanel/AppShell/RequestListView); resolve before implementation to avoid clobbering.
