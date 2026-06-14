import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeBorrowRequest,
  applyPartialReturnSnapshot,
  buildEquipmentTimelines,
  buildSmartAlerts,
  filterNotifications
} from "../src/demoOperations.js";

const equipment = [
  {
    id: 1,
    assetCode: "SW-EQ-1001",
    name: "Logitech Rally Camera Kit",
    category: "Video",
    status: "AVAILABLE",
    totalQuantity: 1,
    accessories: ["HDMI cable", "Remote"]
  },
  {
    id: 2,
    assetCode: "SW-EQ-1002",
    name: "Portable Lecture Camera",
    category: "Video",
    status: "AVAILABLE",
    totalQuantity: 1,
    accessories: ["USB-C cable"]
  }
];

const users = [
  {
    id: 7,
    name: "Minh Bui",
    email: "minh@fpt.edu.vn",
    role: "LECTURER",
    groupName: "Teaching Team",
    className: "SE Class"
  },
  {
    id: 9,
    name: "Support Desk",
    email: "support@fpt.edu.vn",
    role: "SUPPORT",
    groupName: "IT Support"
  }
];

test("analyzeBorrowRequest blocks overlapping conflicts, warns on duplicates, and suggests replacements", () => {
  const result = analyzeBorrowRequest({
    equipment,
    users,
    requesterId: 7,
    requests: [
      {
        id: 44,
        equipmentId: 1,
        lecturerId: 7,
        status: "BORROWED",
        startDate: "2026-06-14T01:00:00.000Z",
        dueAt: "2026-06-14T03:00:00.000Z",
        quantity: 1
      }
    ],
    payload: {
      equipmentId: 1,
      lecturerId: 7,
      startDate: "2026-06-14T02:00:00.000Z",
      dueAt: "2026-06-14T04:00:00.000Z",
      quantity: 1
    }
  });

  assert.equal(result.canSubmit, false);
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.replacements[0].id, 2);
});

test("applyPartialReturnSnapshot keeps partially returned requests active with receipt data", () => {
  const result = applyPartialReturnSnapshot(
    {
      id: 51,
      equipmentId: 1,
      lecturerId: 7,
      status: "BORROWED",
      quantity: 5,
      returnedQuantity: 1,
      custodyLog: "[]"
    },
    {
      returnedQuantity: 2,
      actorName: "support@fpt.edu.vn",
      at: "2026-06-14T05:00:00.000Z",
      conditionBefore: "No visible damage",
      conditionAfter: "One remote missing",
      photoBeforeUrl: "https://example.test/before.jpg",
      photoAfterUrl: "https://example.test/after.jpg",
      accessoriesReturned: ["HDMI cable"],
      accessoriesMissing: ["Remote"]
    }
  );

  assert.equal(result.status, "BORROWED");
  assert.equal(result.returnedQuantity, 3);
  assert.equal(result.remainingQuantity, 2);
  assert.equal(result.latestReceipt.type, "PARTIAL_RETURN");
  assert.equal(result.latestReceipt.accessoriesMissing[0], "Remote");
});

test("buildSmartAlerts reports overdue and partial-return work", () => {
  const alerts = buildSmartAlerts({
    equipment,
    now: "2026-06-14T06:00:00.000Z",
    requests: [
      {
        id: 88,
        equipmentId: 1,
        lecturerId: 7,
        status: "BORROWED",
        dueAt: "2026-06-14T04:00:00.000Z",
        remainingQuantity: 2
      }
    ]
  });

  assert.ok(alerts.some((alert) => alert.type === "OVERDUE"));
  assert.ok(alerts.some((alert) => alert.type === "PARTIAL_RETURN"));
});

test("filterNotifications applies type, read-state, and preference filters", () => {
  const result = filterNotifications(
    [
      { id: 1, type: "OVERDUE_REMINDER", readAt: null, subject: "Return camera" },
      { id: 2, type: "REQUEST_APPROVED", readAt: null, subject: "Approved" },
      { id: 3, type: "OVERDUE_REMINDER", readAt: "2026-06-14T01:00:00.000Z", subject: "Old" }
    ],
    { type: "OVERDUE_REMINDER", status: "unread" },
    { enabledTypes: ["OVERDUE_REMINDER"] }
  );

  assert.deepEqual(result.map((notification) => notification.id), [1]);
});

test("buildEquipmentTimelines includes lecturer context on request events", () => {
  const timelines = buildEquipmentTimelines({
    equipment,
    users,
    auditLog: [
      {
        id: 1,
        entityType: "borrowRequest",
        entityId: 44,
        actorId: 9,
        action: "APPROVED",
        createdAt: "2026-06-14T02:15:00.000Z"
      }
    ],
    requests: [
      {
        id: 44,
        equipmentId: 1,
        lecturerId: 7,
        approvedById: 9,
        status: "RESERVED",
        purpose: "CLASSROOM",
        classroom: "ATC 625",
        quantity: 1,
        startDate: "2026-06-14T02:00:00.000Z",
        dueAt: "2026-06-14T04:00:00.000Z",
        createdAt: "2026-06-14T01:00:00.000Z"
      }
    ]
  });

  const timeline = timelines.find((item) => item.equipment.id === 1);
  assert.equal(timeline.events[0].lecturer.email, "minh@fpt.edu.vn");
  assert.equal(timeline.events[0].lecturer.className, "SE Class");
  assert.ok(timeline.events.some((event) => event.staff?.email === "support@fpt.edu.vn"));
});
