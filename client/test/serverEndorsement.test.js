import { test } from "node:test";
import assert from "node:assert/strict";
import { planApprovalNotifications } from "../src/demoOperations.js";

// #2 — A lecturer "approving" a student's SERVER request only ENDORSES it: the
// store returns status REQUESTED with assignedManagerId set to the Server
// Manager. The notification plan must NOT tell the requester it was approved,
// and MUST notify the assigned Server Manager.

test("server-request endorsement does not falsely notify the requester as approved", () => {
  const endorsed = {
    id: 50,
    status: "REQUESTED",
    assignedManagerId: 7,
    purpose: "SERVER",
    equipment: { name: "GPU Server" },
    lecturer: { email: "student@fpt.edu.vn" }
  };
  const plan = planApprovalNotifications(endorsed, { managerEmail: "servermgr@fpt.edu.vn" });

  assert.ok(plan.every((n) => n.type !== "REQUEST_APPROVED"), "must not send a REQUEST_APPROVED on endorsement");
  assert.ok(
    plan.some((n) => n.to === "servermgr@fpt.edu.vn"),
    "must notify the assigned Server Manager"
  );
  assert.ok(
    plan.some((n) => n.to === "student@fpt.edu.vn"),
    "must send the requester a truthful forwarded notice"
  );
});

test("a genuine approval still notifies the requester it was approved", () => {
  const approved = {
    id: 51,
    status: "BORROWED",
    assignedManagerId: null,
    purpose: "CLASSROOM",
    equipment: { name: "Rally Camera" },
    lecturer: { email: "student@fpt.edu.vn" }
  };
  const plan = planApprovalNotifications(approved, {});

  assert.ok(
    plan.some((n) => n.type === "REQUEST_APPROVED" && n.to === "student@fpt.edu.vn"),
    "approval must notify the requester"
  );
});
