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

function login(email) {
  return fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

async function tokenFor(email) {
  const res = await login(email);
  const body = await res.json();
  return body.token;
}

test("auth: unregistered email is rejected", async () => {
  const res = await login("nonexistent@gmail.com");
  assert.equal(res.status, 401);
});

test("auth: registered email succeeds without password and never leaks a hash", async () => {
  const res = await login("dindungwork@gmail.com");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.token);
  assert.equal(body.user.role, "ADMIN");
  assert.equal(body.user.passwordHash, undefined);
});

test("jwt: a token forged with the old hardcoded secret is rejected", async () => {
  const forged = jwt.sign(
    { id: 3, email: "dindungwork@gmail.com", role: "ADMIN" },
    "fallback-swinburne-secret-key-998877",
    { expiresIn: "7d" }
  );
  const res = await fetch(`${base}/api/summary`, {
    headers: { Authorization: `Bearer ${forged}` }
  });
  assert.equal(res.status, 403);
});

test("rbac: a lecturer cannot change equipment status", async () => {
  const token = await tokenFor("buidangminh23@gmail.com");
  const res = await fetch(`${base}/api/equipment/4/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "MAINTENANCE", conditionNotes: "lecturer attempt" })
  });
  assert.equal(res.status, 403);
});

test("rbac: support cannot change equipment status", async () => {
  const token = await tokenFor("taolaminhanh1@gmail.com");
  const res = await fetch(`${base}/api/equipment/4/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "MAINTENANCE", conditionNotes: "support maintenance" })
  });
  assert.equal(res.status, 403);
});

test("sod: a borrower cannot confirm the return of their own item", async () => {
  const token = await tokenFor("buidangminh23@gmail.com");
  const res = await fetch(`${base}/api/borrow-requests/1/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isStatusOk: true })
  });
  assert.equal(res.status, 403);
});

test("sod: a different staff member can confirm the return", async () => {
  const token = await tokenFor("dindungwork@gmail.com");
  const res = await fetch(`${base}/api/borrow-requests/1/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isStatusOk: true })
  });
  assert.equal(res.status, 200);
});

test("rbac: any purpose borrow can be extended", async () => {
  const token = await tokenFor("buidangminh.lh@gmail.com");
  const res = await fetch(`${base}/api/borrow-requests/3/extend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() })
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 3);
  assert.ok(body.dueAt);
});
