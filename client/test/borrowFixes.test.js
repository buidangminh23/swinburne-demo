import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

function installLocalStorage(seed = {}) {
  const state = new Map(Object.entries(seed));
  globalThis.localStorage = {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    }
  };
}

function seedVersion() {
  const storeSource = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
  return storeSource.match(/const SEED_VERSION = "([^"]+)"/)?.[1] ?? "";
}

const PAST_START = "2026-06-10T08:00:00.000Z";
const FUTURE_DUE = "2026-09-01T10:00:00.000Z";

// ---------- #5 multi-day extension ----------

function seedMultiDayBorrow() {
  installLocalStorage({
    "swin-demo-seed-version": seedVersion(),
    "swin-demo-users": JSON.stringify([
      { id: 1, name: "Lecturer A", email: "lecturerA@fpt.edu.vn", role: "LECTURER" }
    ]),
    "swin-demo-equipment": JSON.stringify([
      { id: 99, assetCode: "MULTI-99", name: "Research Kit", category: "Lab", location: "Hanoi", status: "BORROWED", totalQuantity: 5 }
    ]),
    "swin-demo-borrowRequests": JSON.stringify([
      {
        id: 60,
        equipmentId: 99,
        lecturerId: 1,
        status: "BORROWED",
        purpose: "RESEARCH",
        unitOrProject: "AI Lab",
        startDate: PAST_START,
        dueAt: FUTURE_DUE,
        createdAt: PAST_START,
        updatedAt: PAST_START,
        quantity: 1
      }
    ])
  });
}

test("a multi-day loan can be extended to a later due date", async () => {
  seedMultiDayBorrow();
  const { store } = await import(`../src/store.js?extendFwd=${Date.now()}`);
  const updated = await store.editRequest(60, {
    dueAt: "2026-09-15T10:00:00.000Z",
    isExtendMode: true,
    actorId: 1
  });
  assert.equal(updated.status, "BORROWED");
  assert.equal(new Date(updated.dueAt).toISOString(), "2026-09-15T10:00:00.000Z");
});

test("an extension cannot move the due date earlier than the current due date", async () => {
  seedMultiDayBorrow();
  const { store } = await import(`../src/store.js?extendBack=${Date.now()}`);
  await assert.rejects(
    () => store.editRequest(60, { dueAt: "2026-08-01T10:00:00.000Z", isExtendMode: true, actorId: 1 }),
    { status: 400 }
  );
});

// ---------- #3 takeover gating ----------

function seedTakeover() {
  installLocalStorage({
    "swin-demo-seed-version": seedVersion(),
    "swin-demo-users": JSON.stringify([
      { id: 1, name: "Lecturer A", email: "lecturerA@fpt.edu.vn", role: "LECTURER" },
      { id: 2, name: "Lecturer B", email: "lecturerB@fpt.edu.vn", role: "LECTURER" }
    ]),
    "swin-demo-equipment": JSON.stringify([
      { id: 99, assetCode: "TAKE-99", name: "Rally Camera", category: "Teaching", location: "Hanoi", status: "BORROWED", totalQuantity: 5 }
    ]),
    "swin-demo-borrowRequests": JSON.stringify([
      {
        id: 70,
        equipmentId: 99,
        lecturerId: 1,
        status: "BORROWED",
        purpose: "CLASSROOM",
        classroom: "HN-AB-2.1",
        startDate: PAST_START,
        dueAt: FUTURE_DUE,
        createdAt: PAST_START,
        updatedAt: PAST_START,
        quantity: 5
      }
    ])
  });
}

test("a lecturer borrowing a fully-booked item does not silently take over another lecturer's loan", async () => {
  seedTakeover();
  const { store } = await import(`../src/store.js?takeover=${Date.now()}`);
  await assert.rejects(
    () => store.borrowEquipment({
      equipmentId: 99,
      lecturerId: 2,
      purpose: "CLASSROOM",
      classroom: "HN-AB-2.1",
      quantity: 5,
      dueAt: FUTURE_DUE
    }),
    { status: 409 }
  );
  const active = await store.listActiveRequests();
  const holderLoan = active.find((r) => r.id === 70);
  assert.equal(holderLoan?.status, "BORROWED");
});

// ---------- #4 schedule grid counts pending holds ----------

test("schedule grid counts pending (REQUESTED) holds as booked, not open", () => {
  const src = readFileSync(new URL("../src/components/SchedulesView.vue", import.meta.url), "utf8");
  assert.match(src, /\[\s*"REQUESTED",\s*"RESERVED",\s*"BORROWED"\s*\]/);
});
