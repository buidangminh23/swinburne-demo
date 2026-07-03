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

function seedApprovalRequest() {
  const storeSource = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
  const seedVersion = storeSource.match(/const SEED_VERSION = "([^"]+)"/)?.[1] ?? "";
  installLocalStorage({
    "swin-demo-seed-version": seedVersion,
    "swin-demo-users": JSON.stringify([
      { id: 1, name: "LECTURER", email: "lecturer@fpt.edu.vn", role: "LECTURER" },
      { id: 4, name: "STUDENT", email: "student@fpt.edu.vn", role: "STUDENT", lecturerId: 1 },
      { id: 5, name: "EVENT_STAFF", email: "event@fpt.edu.vn", role: "EVENT_STAFF" }
    ]),
    "swin-demo-equipment": JSON.stringify([
      {
        id: 99,
        assetCode: "APPROVAL-99",
        name: "Approval Kit",
        category: "Teaching",
        location: "Hanoi",
        status: "AVAILABLE",
        totalQuantity: 5
      }
    ]),
    "swin-demo-borrowRequests": JSON.stringify([
      {
        id: 50,
        equipmentId: 99,
        lecturerId: 4,
        classroom: "EN402",
        startDate: "2026-06-17T08:00:00.000Z",
        dueAt: "2026-12-30T10:00:00.000Z",
        status: "REQUESTED",
        createdAt: "2026-06-17T07:00:00.000Z",
        updatedAt: "2026-06-17T07:00:00.000Z",
        purpose: "CLASSROOM",
        quantity: 1
      }
    ])
  });
}

test("event staff cannot approve or deny student requests", async () => {
  seedApprovalRequest();
  const { store } = await import(`../src/store.js?eventStaffApproval=${Date.now()}`);

  await assert.rejects(() => store.approveRequest(50, 5), { status: 403 });
  await assert.rejects(() => store.denyRequest(50, 5), { status: 403 });
});

test("requesters see approval status instead of moderation actions", () => {
  const appShell = readFileSync(new URL("../src/components/AppShell.vue", import.meta.url), "utf8");
  const requestList = readFileSync(new URL("../src/components/RequestListView.vue", import.meta.url), "utf8");

  assert.ok(appShell.includes("function approvalStatusText(req)"));
  assert.ok(appShell.includes("myApprovalStatusRequests"));
  assert.ok(appShell.includes("Pending Approval Status"));
  assert.ok(appShell.includes('v-if="isApprovalRequester"'));
  assert.ok(appShell.includes('v-for="req in myApprovalStatusRequests"'));
  assert.ok(appShell.includes('v-if="canApproveRequest(req)"'));
  assert.ok(appShell.includes("approvalStatusText(req)"));
  assert.ok(requestList.includes("function approvalStatusText(req)"));
  assert.ok(requestList.includes("!canActOn(req)"));
  assert.equal(requestList.includes('"EVENT_STAFF", "SUPPORT", "OPERATIONS", "ADMIN"'), false);
});

test("borrowed rows expose return beside extend for eligible accounts", () => {
  const appShell = readFileSync(new URL("../src/components/AppShell.vue", import.meta.url), "utf8");
  const requestList = readFileSync(new URL("../src/components/RequestListView.vue", import.meta.url), "utf8");

  assert.match(requestList, /defineEmits\(\[[\s\S]*"return"[\s\S]*\]\)/);
  assert.match(requestList, /function canReturn\(req\)/);
  assert.match(requestList, /v-if="canReturn\(req\)"[\s\S]*@click="emit\('return', \{ id: req\.id, payload: \{ isStatusOk: true \} \}\)"/);
  assert.match(requestList, /v-if="canReturn\(req\)"[\s\S]*\{\{ t\('Return'\) \}\}[\s\S]*v-if="canExtend\(req\)"/);

  assert.match(appShell, /function canReturn\(req\)/);
  assert.match(appShell, /@return="\$emit\('return', \$event\)"/);
  assert.match(appShell, /v-if="canReturn\(req\)"[\s\S]*@click="\$emit\('return', \{ id: req\.id, payload: \{ isStatusOk: true \} \}\)"/);
  assert.match(appShell, /v-if="canReturn\(req\)"[\s\S]*\{\{ t\('Return'\) \}\}[\s\S]*v-if="canExtend\(req\)"/);
});
