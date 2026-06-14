# Smart Operations Demo Design

## Scope

Implement the approved option 1: a client-only demo phase for the Swinburne Equipment Portal. The feature set lives in the Vue client, `apiMock`, and the localStorage-backed demo store. Backend, Prisma, and production API parity are out of scope for this pass.

## Features

- Smart duplicate detection checks same requester, same equipment, and overlapping time windows before borrow submission.
- Conflict warning khi dat lich blocks requests when the selected time window does not have enough free units.
- Replacement suggestion recommends available same-category equipment when a requested item is unavailable, in maintenance, retired, or conflicted.
- Equipment detail timeline is staff-only and includes lecturer/requester name, email, role, group/class, staff actor, request details, condition events, receipts, and audit events.
- Return flow supports accessory checklist, condition before/after notes, demo photo URL fields, digital receipt data, and partial return tracking.
- Smart dashboard alerts highlight overdue, near due, maintenance, low availability, conflicts, and partial returns.
- Notification center supports type/status filters, read/unread display, preferences, and demo auto-reminder rules.
- User groups/classes appear in admin user management and in staff timeline context.
- System audit log records important demo actions across borrow, approve, deny, checkout, return, status, equipment, and user updates.

## Data Model

The demo store persists new data in localStorage keys for audit log, notification preferences, and reminder rules. Equipment may include `accessories`; users may include `groupName` and `className`; requests may include `partialReturns`, `remainingQuantity`, condition/photo fields, accessory results, and `latestReceipt`.

## Access Rules

Staff-only means `ADMIN`, `SUPPORT`, `OPERATIONS`, `LECTURER`, and `EVENT_STAFF`. Students do not see equipment timeline or system audit log. Timeline events related to requests always show lecturer/requester details.

## Verification

Use Node's built-in test runner for pure client demo operations and run the project build with the direct Windows npm binary if the PowerShell npm shim fails.
