# Smart Operations Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved client-only smart operations demo features to the Swinburne Equipment Portal.

**Architecture:** Add a focused pure logic module for borrow analysis, alerts, notification filtering, and timelines. Wire that module into the localStorage-backed demo store, `apiMock`, and Vue views while keeping backend parity out of scope.

**Tech Stack:** Vue 3, Vite, Node.js built-in test runner, localStorage demo persistence.

---

## File Structure

- Create `client/src/demoOperations.js` for pure functions used by tests, store, and UI.
- Create `client/test/demoOperations.test.js` for Node test coverage of conflict, duplicate, partial return, alerts, notification filters, and timeline lecturer data.
- Modify `client/package.json` to add a `test` script.
- Modify `client/src/store.js` to persist audit/preference/rule data and expose new demo methods.
- Modify `client/src/apiMock.js` to expose the new store methods and notification preference helpers.
- Modify `client/src/App.vue` to load alerts, audit log, preferences, reminder rules, and equipment timelines.
- Modify `client/src/components/AppShell.vue` to add staff-only navigation for timeline, notifications, and audit log, fix staff role gates, and show smart alerts.
- Modify `client/src/components/BorrowPanel.vue` to show duplicate/conflict/replacement preflight warnings.
- Modify `client/src/components/ReturnPanel.vue` to capture accessory, condition, photo, and partial-return details.
- Modify `client/src/components/AdminUsersView.vue` to show and filter user groups/classes.
- Create `client/src/components/EquipmentTimelineView.vue`, `NotificationCenterView.vue`, and `AuditLogView.vue`.

## Tasks

- [x] Write failing tests in `client/test/demoOperations.test.js` for borrow preflight conflict/duplicate/replacement behavior.
- [x] Run `C:\nvm4w\nodejs\npm.cmd --workspace client test` and confirm the test fails because `demoOperations.js` does not exist.
- [x] Implement `client/src/demoOperations.js` with `analyzeBorrowRequest`, `buildSmartAlerts`, `filterNotifications`, `buildEquipmentTimelines`, and `applyPartialReturnSnapshot`.
- [x] Run the client tests and confirm they pass.
- [x] Extend `store.js` with audit, notification preferences, reminder rules, timeline, alerts, return receipt, partial return, and preflight methods.
- [x] Update `apiMock.js` with corresponding client-demo API methods.
- [x] Update Vue components and create the staff-only views.
- [x] Run client tests, server tests, and the full build.
- [x] Inspect `git diff` and confirm `.claude` state is not part of intended product edits.
