import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const testDir = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(testDir, "..");

function readClientSource(path) {
  return readFileSync(resolve(clientDir, path), "utf8");
}

test("dashboard no longer renders the Smart Dashboard Alerts widget", () => {
  const appShell = readClientSource("src/components/AppShell.vue");
  const translations = readClientSource("src/translate.js");

  assert.equal(appShell.includes("Smart Dashboard Alerts"), false);
  assert.equal(appShell.includes("state.smartAlerts"), false);
  assert.equal(appShell.includes("smart-alert"), false);
  assert.equal(appShell.includes("AlertTriangle"), false);
  assert.equal(translations.includes("Smart Dashboard Alerts"), false);
  assert.equal(translations.includes("Cảnh báo bảng điều khiển"), false);
});
