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

test("history screen owns the system audit log instead of a separate sidebar tab", () => {
  const appShell = readClientSource("src/components/AppShell.vue");
  const historyLog = readClientSource("src/components/HistoryLog.vue");

  assert.equal(appShell.includes("activeTab === 'audit-log'"), false);
  assert.equal(appShell.includes("activeTab = 'audit-log'"), false);
  assert.equal(appShell.includes("import AuditLogView"), false);
  assert.match(appShell, /<HistoryLog[\s\S]*:audit-log="state\.auditLog"/);

  assert.match(historyLog, /import AuditLogView/);
  assert.match(historyLog, /canViewAuditLog/);
  assert.match(historyLog, /<AuditLogView[\s\S]*v-if="canViewAuditLog"[\s\S]*:entries="auditLog"/);
});
