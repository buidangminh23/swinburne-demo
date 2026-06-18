import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const loginView = readFileSync(new URL("../src/components/LoginView.vue", import.meta.url), "utf8");
const store = readFileSync(new URL("../src/store.js", import.meta.url), "utf8");
const translate = readFileSync(new URL("../src/translate.js", import.meta.url), "utf8");

test("login demo data no longer exposes the Vovinam account", () => {
  assert.equal(loginView.includes("vovinamteacher@fpt.edu.vn"), false);
  assert.equal(store.includes("vovinamteacher@fpt.edu.vn"), false);
  assert.equal(translate.includes("vovinamteacher@fpt.edu.vn"), false);
});

test("login location selector lists cities only", () => {
  for (const label of ["Hanoi", "Ho Chi Minh City", "Da Nang", "Can Tho"]) {
    assert.ok(loginView.includes(`label: "${label}"`));
  }

  assert.equal(loginView.includes("Swinburne Hanoi"), false);
  assert.equal(loginView.includes("Swinburne HO"), false);
  assert.equal(loginView.includes("Swinburne HCM"), false);
  assert.equal(loginView.includes("Swinburne Da Nang"), false);
  assert.equal(loginView.includes("Swinburne CT"), false);
});
