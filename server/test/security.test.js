import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.USE_DEMO_STORE = "true";
process.env.NODE_ENV = "test";
delete process.env.JWT_SECRET;

let server;
let base;

before(async () => {
  const mod = await import("../src/index.js");
  server = mod.app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
});

function login(email, password) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
}

async function tokenFor(email) {
  const res = await login(email, "demo");
  const body = await res.json();
  return body.token;
}

test("auth: wrong password is rejected (no bypass)", async () => {
  const res = await login("dindungwork@fpt.edu.vn", "not-the-password");
  assert.equal(res.status, 401);
});

test("auth: correct demo password succeeds in non-production and never leaks a hash", async () => {
  const res = await login("dindungwork@fpt.edu.vn", "demo");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token);
  assert.equal(body.user.role, "ADMIN");
  assert.equal(body.user.passwordHash, undefined);
});

test("jwt: a token forged with the old hardcoded secret is rejected", async () => {
  const forged = jwt.sign(
    { id: 3, email: "dindungwork@fpt.edu.vn", role: "ADMIN" },
    "fallback-swinburne-secret-key-998877",
    { expiresIn: "7d" }
  );
  const res = await fetch(`${base}/api/summary`, {
    headers: { Authorization: `Bearer ${forged}` }
  });
  assert.equal(res.status, 403);
});

test("rbac: a lecturer cannot change equipment status", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await fetch(`${base}/api/equipment/4/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "MAINTENANCE", conditionNotes: "lecturer attempt" })
  });
  assert.equal(res.status, 403);
});

test("rbac: support can change equipment status", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await fetch(`${base}/api/equipment/4/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "MAINTENANCE", conditionNotes: "support maintenance" })
  });
  assert.equal(res.status, 200);
});

test("sod: a borrower cannot confirm the return of their own item", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await fetch(`${base}/api/borrow-requests/1/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isStatusOk: true })
  });
  assert.equal(res.status, 403);
});

test("sod: a different staff member can confirm the return", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await fetch(`${base}/api/borrow-requests/1/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isStatusOk: true })
  });
  assert.equal(res.status, 200);
});

function authFetch(token, path, options = {}) {
  return fetch(`${base}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers ?? {}) }
  });
}

test("idor: a lecturer without MANAGE_REQUEST cannot edit another user's request", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await authFetch(token, "/api/borrow-requests/3", {
    method: "PATCH",
    body: JSON.stringify({ classroom: "Hacked" })
  });
  assert.equal(res.status, 403);
});

test("idor: support with MANAGE_REQUEST can edit another user's request", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/borrow-requests/3", {
    method: "PATCH",
    body: JSON.stringify({ classroom: "Lab 1" })
  });
  assert.equal(res.status, 200);
});

test("sod: a user cannot approve their own borrow request", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await authFetch(token, "/api/borrow-requests/1/approve", { method: "POST", body: "{}" });
  assert.equal(res.status, 403);
});

test("idor: a lecturer cannot read another user's borrow history", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await authFetch(token, "/api/users/4/borrow-history");
  assert.equal(res.status, 403);
});

test("rbac: support with VIEW_ANY_HISTORY can read another user's borrow history", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/users/4/borrow-history");
  assert.equal(res.status, 200);
});

test("validation: an invalid sortBy is rejected, never a 500", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/borrow-history?sortBy=hacker&sortOrder=evil");
  assert.notEqual(res.status, 500);
  assert.equal(res.status, 400);
});

test("validation: returnedQuantity greater than the borrowed quantity is rejected", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/borrow-requests/3/return", {
    method: "POST",
    body: JSON.stringify({ returnedQuantity: 99 })
  });
  assert.equal(res.status, 400);
});

test("validation: a non-numeric id returns 400, not a 404 lookup", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/equipment/abc/schedule");
  assert.equal(res.status, 400);
});

test("rbac: support can create equipment", async () => {
  const token = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const res = await authFetch(token, "/api/equipment", {
    method: "POST",
    body: JSON.stringify({ assetCode: "SW-EQ-TEST", name: "Test Rig", category: "Video", location: "ATC 600" })
  });
  assert.equal(res.status, 201);
});

test("rbac: a lecturer cannot create equipment", async () => {
  const token = await tokenFor("buidangminh23@fpt.edu.vn");
  const res = await authFetch(token, "/api/equipment", {
    method: "POST",
    body: JSON.stringify({ assetCode: "SW-EQ-NOPE", name: "Nope", category: "Video", location: "ATC 600" })
  });
  assert.equal(res.status, 403);
});

test("transfer: staff can borrow equipment currently borrowed by a lecturer and receive immediate approval", async () => {
  const supportToken = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const lecturerToken = await tokenFor("buidangminh23@fpt.edu.vn");

  const createRes = await authFetch(supportToken, "/api/equipment", {
    method: "POST",
    body: JSON.stringify({
      assetCode: `SW-EQ-XFER-${Date.now()}`,
      name: "Transfer Test Kit",
      category: "Teaching",
      location: "ATC 610"
    })
  });
  assert.equal(createRes.status, 201);
  const item = await createRes.json();

  const lecturerBorrowRes = await authFetch(lecturerToken, "/api/borrow-requests", {
    method: "POST",
    body: JSON.stringify({
      equipmentId: item.id,
      classroom: "ATC 610",
      dueAt: "2026-12-30T10:00:00.000Z",
      purpose: "CLASSROOM"
    })
  });
  assert.equal(lecturerBorrowRes.status, 201);
  const lecturerBorrow = await lecturerBorrowRes.json();
  assert.equal(lecturerBorrow.status, "BORROWED");
  assert.equal(lecturerBorrow.lecturerId, 1);

  const staffBorrowRes = await authFetch(supportToken, "/api/borrow-requests", {
    method: "POST",
    body: JSON.stringify({
      equipmentId: item.id,
      classroom: "ATC 611",
      dueAt: "2026-12-30T12:00:00.000Z",
      purpose: "CLASSROOM"
    })
  });
  assert.equal(staffBorrowRes.status, 201);
  const staffBorrow = await staffBorrowRes.json();
  assert.equal(staffBorrow.status, "BORROWED");
  assert.equal(staffBorrow.lecturerId, 2);

  const activeRes = await authFetch(supportToken, "/api/borrow-requests");
  assert.equal(activeRes.status, 200);
  const active = await activeRes.json();
  const transferRows = active.filter((request) => request.equipmentId === item.id);
  assert.deepEqual(transferRows.map((request) => request.id), [staffBorrow.id]);
});

test("rbac: only an admin can list users", async () => {
  const adminToken = await tokenFor("dindungwork@fpt.edu.vn");
  const adminRes = await authFetch(adminToken, "/api/users");
  assert.equal(adminRes.status, 200);

  const supportToken = await tokenFor("taolaminhanh1@fpt.edu.vn");
  const supportRes = await authFetch(supportToken, "/api/users");
  assert.equal(supportRes.status, 403);
});

test("privacy: a student only sees notifications addressed to them", async () => {
  const token = await tokenFor("buidangminh.lh@fpt.edu.vn");
  const res = await authFetch(token, "/api/notifications");
  assert.equal(res.status, 200);
  const list = await res.json();
  const studentEmail = "buidangminh.lh@fpt.edu.vn";
  assert.ok(
    list.every((entry) => entry.to.map((address) => address.toLowerCase()).includes(studentEmail)),
    "every returned notification must be addressed to the requesting student"
  );
});
