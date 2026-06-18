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

test("staff can borrow equipment currently borrowed by a lecturer and receive immediate approval", async () => {
  const storeSource = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
  const seedVersion = storeSource.match(/const SEED_VERSION = "([^"]+)"/)?.[1] ?? "";
  installLocalStorage({
    "swin-demo-seed-version": seedVersion,
    "swin-demo-users": JSON.stringify([
      { id: 1, name: "LECTURER", email: "lecturer@fpt.edu.vn", role: "LECTURER" },
      { id: 2, name: "SUPPORT", email: "support@fpt.edu.vn", role: "SUPPORT" }
    ]),
    "swin-demo-equipment": JSON.stringify([
      {
        id: 99,
        assetCode: "SW-XFER-99",
        name: "Transfer Kit",
        category: "Teaching",
        location: "Hanoi",
        status: "BORROWED",
        totalQuantity: 1
      }
    ]),
    "swin-demo-borrowRequests": JSON.stringify([
      {
        id: 1,
        equipmentId: 99,
        lecturerId: 1,
        classroom: "ATC 610",
        startDate: "2026-06-17T08:00:00.000Z",
        dueAt: "2026-12-30T10:00:00.000Z",
        status: "BORROWED",
        createdAt: "2026-06-17T08:00:00.000Z",
        updatedAt: "2026-06-17T08:00:00.000Z",
        purpose: "CLASSROOM",
        quantity: 1
      }
    ])
  });

  const { store } = await import(`../src/store.js?transfer=${Date.now()}`);
  const created = await store.borrowEquipment({
    equipmentId: 99,
    lecturerId: 2,
    classroom: "ATC 611",
    dueAt: "2026-12-30T12:00:00.000Z",
    purpose: "CLASSROOM"
  });

  assert.equal(created.status, "BORROWED");
  assert.equal(created.lecturerId, 2);

  const active = await store.listActiveRequests();
  assert.deepEqual(active.filter((request) => request.equipmentId === 99).map((request) => request.id), [created.id]);
});
