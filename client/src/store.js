import { isProductionMode } from "./config";
import {
  analyzeBorrowRequest,
  applyPartialReturnSnapshot,
  buildEquipmentTimelines,
  buildSmartAlerts
} from "./demoOperations";

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (ms) => new Date(Date.now() + ms).toISOString();
const relativeDate = (days, hours) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

const HOLD_STATUSES = ["RESERVED", "BORROWED"];

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime();
}

function requestWindow(request) {
  return {
    start: request.startDate ?? request.createdAt,
    end: request.dueAt
  };
}

function isImmediateStart(startDate) {
  if (!startDate) {
    return true;
  }
  return new Date(startDate).getTime() <= Date.now() + 60 * 1000;
}

const defaultUsers = [
  { id: 1, name: "LECTURER", email: "buidangminh23@fpt.edu.vn", role: "LECTURER", groupName: "Teaching Team", className: "COS20031" },
  { id: 2, name: "SUPPORT", email: "taolaminhanh1@fpt.edu.vn", role: "SUPPORT", groupName: "IT Support", className: "Support Desk" },
  { id: 3, name: "ADMIN", email: "dindungwork@fpt.edu.vn", role: "ADMIN", groupName: "Admin", className: "Operations" },
  { id: 4, name: "STUDENT", email: "buidangminh.lh@fpt.edu.vn", role: "STUDENT", lecturerId: 1, groupName: "Student Cohort", className: "SE Class" },
  { id: 5, name: "EVENT_STAFF", email: "hiheho911@fpt.edu.vn", role: "EVENT_STAFF", groupName: "Event Team", className: "Campus Events" },
  { id: 7, name: "SUPPORT", email: "linhnt89_fe@fpt.edu.vn", role: "SUPPORT", groupName: "IT Support", className: "Front Desk" },
  { id: 8, name: "VOVINAM TEACHER", email: "vovinamteacher@fpt.edu.vn", role: "LECTURER", groupName: "Physical Education", className: "Vovinam" },
  { id: 9, name: "Test Account", email: "cacc80077@fpt.edu.vn", role: "LECTURER", groupName: "Teaching Team", className: "Demo Class" },
  { id: 10, name: "Minh", email: "buidangminhcontentcreator@fpt.edu.vn", role: "LECTURER", groupName: "Media Team", className: "Content Lab" },
  { id: 11, name: "OPERATIONS", email: "operations@fpt.edu.vn", role: "OPERATIONS", groupName: "Operations", className: "Asset Control" },
  { id: 12, name: "STUDENT 2", email: "student2@fpt.edu.vn", role: "STUDENT", lecturerId: 1, groupName: "Student Cohort", className: "SE Class" }
];

const defaultEquipment = [
  {
    id: 1,
    assetCode: "Logitech-LRC-001",
    name: "Logitech Rally Camera Kit",
    category: "Video",
    location: "HN-ATC-625",
    status: "AVAILABLE",
    conditionNotes: "Ready for classroom recording",
    accessories: ["HDMI cable", "USB-C cable", "Remote", "Tripod mount"],
    updatedAt: new Date("2026-05-27T08:30:00.000Z").toISOString()
  },
  {
    id: 2,
    assetCode: "Kensington-WPC-002",
    name: "Wireless Presentation Clicker",
    category: "Teaching",
    location: "HN-LIB-DESK",
    status: "BORROWED",
    conditionNotes: "Borrowed for tutorial room HN-ATC-625",
    accessories: ["USB receiver", "AAA batteries", "Carry pouch"],
    updatedAt: new Date("2026-05-27T09:10:00.000Z").toISOString()
  },
  {
    id: 3,
    assetCode: "Epson-PPR-003",
    name: "Portable Projector",
    category: "Display",
    location: "HN-BA-701",
    status: "MAINTENANCE",
    conditionNotes: "Lamp replacement required",
    accessories: ["Power cable", "HDMI cable", "Remote"],
    updatedAt: new Date("2026-05-26T17:15:00.000Z").toISOString()
  },
  {
    id: 4,
    assetCode: "Elgato-HCA-004",
    name: "HDMI Capture Adapter",
    category: "Video",
    location: "HN-ATC-628",
    status: "AVAILABLE",
    conditionNotes: "Checked by support staff",
    accessories: ["HDMI cable", "USB cable"],
    updatedAt: new Date("2026-05-27T07:45:00.000Z").toISOString()
  },
  {
    id: 5,
    assetCode: "Sennheiser-LMS-005",
    name: "Lapel Microphone Set",
    category: "Audio",
    location: "HN-MED-DESK",
    status: "AVAILABLE",
    conditionNotes: "Batteries replaced",
    accessories: ["2 lapel mics", "Receiver", "Charging cable", "Carry case"],
    updatedAt: new Date("2026-05-27T10:20:00.000Z").toISOString()
  }
];

const STOCK_OVERRIDES = {};
defaultEquipment.forEach((item) => {
  item.totalQuantity = STOCK_OVERRIDES[item.id] ?? 1;
});

const defaultBorrowRequests = [
  // Equipment 1: Logitech Rally Camera Kit
  {
    id: 1,
    equipmentId: 1,
    lecturerId: 1,
    classroom: "ATC 625",
    startDate: relativeDate(0, 14),
    dueAt: relativeDate(0, 16),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Used for afternoon lecture session",
    createdAt: relativeDate(-1, 8),
    updatedAt: relativeDate(-1, 8),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "Teaching",
    quantity: 1
  },
  // Equipment 2: Wireless Presentation Clicker
  {
    id: 3,
    equipmentId: 2,
    lecturerId: 1,
    classroom: "EN402",
    startDate: relativeDate(0, 8),
    dueAt: relativeDate(0, 12),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Collected by lecturer for morning tutorial",
    createdAt: relativeDate(-1, 8),
    updatedAt: relativeDate(-1, 8),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  },
  // Equipment 4: HDMI Capture Adapter
  {
    id: 5,
    equipmentId: 4,
    lecturerId: 4,
    classroom: "ATC 625",
    startDate: relativeDate(-4, 10),
    dueAt: relativeDate(-4, 12),
    returnedAt: relativeDate(-4, 12),
    status: "RETURNED",
    handoverNotes: "Used for data science workshop recording",
    createdAt: relativeDate(-6, 8),
    updatedAt: relativeDate(-4, 12),
    purpose: "RESEARCH",
    program: "Data Science Specialisation",
    unitOrProject: "Research Project A",
    quantity: 1,
    returnedQuantity: 1,
    isStatusOk: true
  },
  {
    id: 6,
    equipmentId: 4,
    lecturerId: 1,
    classroom: "EN403",
    startDate: relativeDate(1, 16),
    dueAt: relativeDate(1, 20),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "HDMI adapter for lab screen recording",
    createdAt: relativeDate(0, 8),
    updatedAt: relativeDate(0, 8),
    purpose: "LAB",
    program: "Bachelor of Computer Science",
    unitOrProject: "Lab Session",
    quantity: 1
  },
  // Equipment 5: Lapel Microphone Set
  {
    id: 7,
    equipmentId: 5,
    lecturerId: 4,
    classroom: "EN402",
    startDate: relativeDate(0, 18),
    dueAt: relativeDate(0, 20),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Microphone set for classroom presentation",
    createdAt: relativeDate(-1, 8),
    updatedAt: relativeDate(-1, 8),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  },
  // Pending Approval Requests for Demo
  {
    id: 15,
    equipmentId: 1,
    lecturerId: 1,
    classroom: "ATC 625",
    startDate: relativeDate(1, 9),
    dueAt: relativeDate(1, 11),
    returnedAt: null,
    status: "REQUESTED",
    handoverNotes: "Need Rally camera for guest speaker recording",
    createdAt: relativeDate(0, -2),
    updatedAt: relativeDate(0, -2),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "Recording Seminar",
    quantity: 1
  },
  {
    id: 18,
    equipmentId: 4,
    lecturerId: 10,
    classroom: "EN402",
    startDate: relativeDate(1, 10),
    dueAt: relativeDate(1, 12),
    returnedAt: null,
    status: "REQUESTED",
    handoverNotes: "Capture card for coding demo recording",
    createdAt: relativeDate(0, -2),
    updatedAt: relativeDate(0, -2),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS30008",
    quantity: 1
  },
  {
    id: 20,
    equipmentId: 5,
    lecturerId: 12,
    classroom: "EN402",
    startDate: relativeDate(1, 9),
    dueAt: relativeDate(1, 11),
    returnedAt: null,
    status: "REQUESTED",
    handoverNotes: "Lapel mic for student presentation rehearsal",
    createdAt: relativeDate(0, -1),
    updatedAt: relativeDate(0, -1),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  }
];

const SEED_VERSION = "2026-06-19-no-vovinam";
const AUDIT_KEY = "swin-demo-audit-log";
const PREF_KEY = "swin-demo-notification-preferences";
const REMINDER_KEY = "swin-demo-reminder-rules";

const defaultNotificationPreferences = {
  enabledTypes: [
    "BORROW_REQUEST",
    "REQUEST_APPROVED",
    "REQUEST_DENIED",
    "EQUIPMENT_CHECKED_OUT",
    "EQUIPMENT_RETURNED",
    "OVERDUE_REMINDER",
    "MAINTENANCE_ALERT"
  ],
  channels: ["inApp"],
  quietHours: false
};

const defaultReminderRules = [
  { id: 1, type: "NEAR_DUE", enabled: true, offsetHours: 24 },
  { id: 2, type: "OVERDUE", enabled: true, offsetHours: 0 }
];

(() => {
  try {
    if (localStorage.getItem("swin-demo-seed-version") !== SEED_VERSION) {
      localStorage.removeItem("swin-demo-users");
      localStorage.removeItem("swin-demo-equipment");
      localStorage.removeItem("swin-demo-borrowRequests");
      localStorage.removeItem("swin-demo-notifications");
      localStorage.removeItem(AUDIT_KEY);
      localStorage.removeItem(PREF_KEY);
      localStorage.removeItem(REMINDER_KEY);
      localStorage.setItem("swin-demo-seed-version", SEED_VERSION);
    }
  } catch {
    // noop
  }
})();

const users = (() => {
  try {
    const saved = localStorage.getItem("swin-demo-users");
    return saved ? JSON.parse(saved) : (isProductionMode ? [] : defaultUsers);
  } catch {
    return isProductionMode ? [] : defaultUsers;
  }
})();

const equipment = (() => {
  try {
    const saved = localStorage.getItem("swin-demo-equipment");
    return saved ? JSON.parse(saved) : defaultEquipment;
  } catch {
    return defaultEquipment;
  }
})();

const borrowRequests = (() => {
  try {
    const saved = localStorage.getItem("swin-demo-borrowRequests");
    const validEquipmentIds = new Set(defaultEquipment.map((item) => item.id));
    const seeded = defaultBorrowRequests.filter((request) => validEquipmentIds.has(request.equipmentId));
    return saved ? JSON.parse(saved) : (isProductionMode ? [] : seeded);
  } catch {
    const validEquipmentIds = new Set(defaultEquipment.map((item) => item.id));
    return isProductionMode ? [] : defaultBorrowRequests.filter((request) => validEquipmentIds.has(request.equipmentId));
  }
})();

const auditLog = (() => {
  try {
    const saved = localStorage.getItem(AUDIT_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
})();

const notificationPreferences = (() => {
  try {
    const saved = localStorage.getItem(PREF_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
})();

const reminderRules = (() => {
  try {
    const saved = localStorage.getItem(REMINDER_KEY);
    return saved ? JSON.parse(saved) : defaultReminderRules;
  } catch {
    return defaultReminderRules;
  }
})();

function persistState() {
  try {
    localStorage.setItem("swin-demo-users", JSON.stringify(users));
    localStorage.setItem("swin-demo-equipment", JSON.stringify(equipment));
    localStorage.setItem("swin-demo-borrowRequests", JSON.stringify(borrowRequests));
    localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog));
    localStorage.setItem(PREF_KEY, JSON.stringify(notificationPreferences));
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminderRules));
  } catch (e) {
    console.error("Failed to persist state", e);
  }
}

const sprintPlan = [
  {
    id: 1,
    name: "Sprint 1",
    dates: "Weeks 1-2",
    status: "active",
    focus: "Classroom use",
    items: ["Login/logout", "View equipment", "Borrow equipment", "Confirm returns", "Update status"]
  },
  {
    id: 2,
    name: "Sprint 2",
    dates: "Weeks 3-4",
    status: "planned",
    focus: "Student and support flow",
    items: ["Student requests", "Support handover", "Borrow extension"]
  },
  {
    id: 3,
    name: "Sprint 3",
    dates: "Weeks 5-6",
    status: "planned",
    focus: "Inventory operations",
    items: ["Inventory CRUD", "Reports", "Audit trail"]
  },
  {
    id: 4,
    name: "Sprint 4",
    dates: "Weeks 7-8",
    status: "planned",
    focus: "Admin controls",
    items: ["Manage users", "Permissions", "Analytics"]
  }
];

function attachEquipment(request) {
  const item = equipment.find((candidate) => candidate.id === request.equipmentId);
  const lecturer = users.find((candidate) => candidate.id === request.lecturerId);
  return { ...request, equipment: item, lecturer };
}

const APPROVER_ROLES = ["ADMIN", "SUPPORT", "OPERATIONS", "EVENT_STAFF"];

function canApproveRequest(actorId, request) {
  const actor = users.find((candidate) => candidate.id === actorId);
  if (!actor) {
    return false;
  }
  if (actor.role === "LECTURER") {
    const requester = users.find((candidate) => candidate.id === request.lecturerId);
    return requester?.role === "STUDENT" && requester.lecturerId === actor.id;
  }
  return APPROVER_ROLES.includes(actor.role);
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

function recordAudit({ action, actorId = null, actorName = "", entityType, entityId, details = {} }) {
  const actor = actorId ? users.find((candidate) => candidate.id === actorId) : null;
  const entry = {
    id: nextId(auditLog),
    action,
    actorId,
    actorName: actor?.email ?? actor?.name ?? actorName,
    actor,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString()
  };
  auditLog.unshift(entry);
  if (auditLog.length > 250) {
    auditLog.length = 250;
  }
  return entry;
}

function parseCustody(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

const EDITABLE_FIELDS = [
  "classroom",
  "dueAt",
  "handoverNotes",
  "purpose",
  "program",
  "unitOrProject",
  "quantity",
  "startDate",
  "recurrence"
];
const DATE_FIELDS = ["dueAt", "startDate"];

function buildEditData(input, { toDate }) {
  const data = {};
  for (const key of EDITABLE_FIELDS) {
    if (input[key] === undefined) {
      continue;
    }
    if (DATE_FIELDS.includes(key)) {
      data[key] = input[key] ? toDate(input[key]) : null;
    } else {
      data[key] = input[key];
    }
  }
  return data;
}

function computeDisplayStatus(item, availableNow) {
  if (["MAINTENANCE", "RETIRED"].includes(item.status)) {
    return item.status;
  }
  return availableNow <= 0 ? "BORROWED" : "AVAILABLE";
}

function demoAvailableUnits(equipmentId, window, excludeRequestId = null) {
  const item = equipment.find((candidate) => candidate.id === equipmentId);
  if (!item) {
    return 0;
  }
  if (["MAINTENANCE", "RETIRED"].includes(item.status)) {
    return 0;
  }
  const occupied = borrowRequests
    .filter((request) =>
      request.equipmentId === equipmentId &&
      request.id !== excludeRequestId &&
      HOLD_STATUSES.includes(request.status) &&
      rangesOverlap(requestWindow(request).start, requestWindow(request).end, window.start, window.end)
    )
    .reduce((sum, request) => sum + (request.quantity ?? 1), 0);
  return (item.totalQuantity ?? 1) - occupied;
}

class DemoRepository {
  async login(email) {
    let candidate = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!candidate) {
      const newId = nextId(users);
      let role = "ADMIN"; // Default to admin for convenience
      const namePart = email.split("@")[0].toLowerCase();
      if (namePart.includes("student") || namePart.includes("std")) {
        role = "STUDENT";
      } else if (namePart.includes("lecturer") || namePart.includes("lec") || namePart.includes("teacher")) {
        role = "LECTURER";
      } else if (namePart.includes("support")) {
        role = "SUPPORT";
      } else if (namePart.includes("operations") || namePart.includes("ops")) {
        role = "OPERATIONS";
      } else if (namePart.includes("staff")) {
        role = "EVENT_STAFF";
      }

      candidate = {
        id: newId,
        name: namePart.toUpperCase(),
        email: email.toLowerCase(),
        role: role,
        groupName: role === "STUDENT" ? "Student Cohort" : "Demo Users",
        className: role === "STUDENT" ? "Unassigned Class" : "Staff"
      };
      users.push(candidate);
      persistState();
    }
    const user = {
      ...candidate,
      lecturer: candidate.lecturerId ? users.find(l => l.id === candidate.lecturerId) : null
    };
    return { user, token: `demo-token-${user.id}` };
  }

  async listEquipment() {
    const now = new Date().toISOString();
    return equipment.map(item => {
      const itemRequests = borrowRequests
        .filter((r) => r.equipmentId === item.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const availableNow = demoAvailableUnits(item.id, { start: now, end: now });
      return {
        ...item,
        accessories: item.accessories ?? [],
        totalQuantity: item.totalQuantity ?? 1,
        availableNow: Math.max(0, availableNow),
        displayStatus: computeDisplayStatus(item, availableNow),
        latestRequest: itemRequests[0] || null
      };
    });
  }

  async listActiveRequests() {
    return borrowRequests
      .filter((request) => !["RETURNED", "CANCELLED"].includes(request.status))
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map(attachEquipment);
  }

  async listBorrowHistory(userId) {
    return borrowRequests
      .filter((request) => request.lecturerId === userId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map(attachEquipment);
  }

  async analyzeBorrow(input, requesterId = null) {
    return analyzeBorrowRequest({
      equipment,
      users,
      requests: borrowRequests,
      payload: input,
      requesterId: requesterId ?? input.lecturerId
    });
  }

  async borrowEquipment(input) {
    const item = equipment.find((candidate) => candidate.id === input.equipmentId);
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }

    if (["RETIRED", "MAINTENANCE"].includes(item.status)) {
      const error = new Error(`Equipment is ${item.status.toLowerCase()} and cannot be booked`);
      error.status = 409;
      throw error;
    }

    const quantity = input.quantity ?? 1;
    const start = input.startDate ? new Date(input.startDate).toISOString() : new Date().toISOString();
    const end = new Date(input.dueAt).toISOString();
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      const error = new Error("Return time must be after the start time");
      error.status = 400;
      throw error;
    }
    const available = demoAvailableUnits(item.id, { start, end });
    if (quantity > available) {
      const error = new Error(`Only ${Math.max(0, available)} of ${item.totalQuantity ?? 1} unit(s) are free for that time window`);
      error.status = 409;
      throw error;
    }
    const preflight = await this.analyzeBorrow(input, input.lecturerId);

    const user = users.find((candidate) => candidate.id === input.lecturerId);
    const status = "REQUESTED";
    const purpose = input.purpose ?? "CLASSROOM";

    const custody = [];
    if (purpose === "EVENT") {
      custody.push({
        at: new Date().toISOString(),
        action: "REQUESTED",
        actor: user?.name ?? `User ${input.lecturerId}`,
        notes: input.handoverNotes ?? ""
      });
    }

    const request = {
      id: nextId(borrowRequests),
      equipmentId: item.id,
      lecturerId: input.lecturerId,
      classroom: input.classroom ?? null,
      dueAt: end,
      returnedAt: null,
      status,
      handoverNotes: input.handoverNotes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purpose,
      program: input.program ?? null,
      unitOrProject: input.unitOrProject ?? null,
      quantity,
      startDate: start,
      recurrence: input.recurrence ?? null,
      custodyLog: JSON.stringify(custody)
    };
    borrowRequests.push(request);
    recordAudit({
      action: "BORROW_REQUEST_CREATED",
      actorId: input.lecturerId,
      entityType: "borrowRequest",
      entityId: request.id,
      details: {
        equipmentId: item.id,
        quantity,
        startDate: start,
        dueAt: end,
        duplicates: preflight.duplicates.length
      }
    });
    persistState();
    return attachEquipment(request);
  }

  async confirmReturn(id, input = {}) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Borrow request not found");
      error.status = 404;
      throw error;
    }
    if (request.status !== "BORROWED") {
      const error = new Error("Only borrowed equipment can be returned");
      error.status = 409;
      throw error;
    }
    if (input.actorId != null && input.actorId === request.lecturerId) {
      const error = new Error("A different staff member must confirm this return (separation of duties).");
      error.status = 403;
      throw error;
    }
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);

    Object.assign(request, applyPartialReturnSnapshot(request, {
      ...input,
      at: new Date().toISOString()
    }));

    if (item) {
      if (!request.isStatusOk) {
        item.status = "MAINTENANCE";
        item.conditionNotes = `Returned with issue: ${request.damageReport || request.conditionAfter || "Accessory or condition issue"}`;
      } else if (request.status === "RETURNED") {
        item.status = "AVAILABLE";
        item.conditionNotes = request.conditionAfter || "Returned and confirmed OK";
      }
      item.updatedAt = new Date().toISOString();
    }

    recordAudit({
      action: request.status === "RETURNED" ? "RETURN_CONFIRMED" : "PARTIAL_RETURN_RECORDED",
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? "Staff",
      entityType: "borrowRequest",
      entityId: request.id,
      details: {
        returnedQuantity: request.returnedQuantity,
        remainingQuantity: request.remainingQuantity,
        receiptId: request.latestReceipt?.id,
        accessoriesMissing: request.accessoriesMissing ?? []
      }
    });
    persistState();
    return attachEquipment(request);
  }

  async checkOut(id, input = {}) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (request.status !== "RESERVED") {
      const error = new Error("Only reserved bookings can be checked out");
      error.status = 409;
      throw error;
    }
    request.status = "BORROWED";
    request.updatedAt = new Date().toISOString();
    request.latestReceipt = {
      id: `RCPT-${request.id}-${Date.now()}`,
      type: "HANDOVER",
      requestId: request.id,
      equipmentId: request.equipmentId,
      lecturerId: request.lecturerId,
      actorName: input.actorName ?? "Staff",
      conditionBefore: input.conditionBefore ?? "",
      photoBeforeUrl: input.photoBeforeUrl ?? "",
      accessoriesReturned: [],
      accessoriesMissing: [],
      createdAt: request.updatedAt
    };
    if (request.purpose === "EVENT") {
      const log = parseCustody(request.custodyLog);
      log.push({
        at: new Date().toISOString(),
        action: "CHECKED_OUT",
        actor: input.actorName ?? "Staff",
        notes: input.notes ?? ""
      });
      request.custodyLog = JSON.stringify(log);
    }
    recordAudit({
      action: "EQUIPMENT_CHECKED_OUT",
      actorName: input.actorName ?? "Staff",
      entityType: "borrowRequest",
      entityId: request.id,
      details: { receiptId: request.latestReceipt.id }
    });
    persistState();
    return attachEquipment(request);
  }

  async updateEquipmentStatus(id, input) {
    const item = equipment.find((candidate) => candidate.id === id);
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    item.status = input.status;
    if (input.conditionNotes !== undefined) {
      item.conditionNotes = input.conditionNotes;
    }
    item.updatedAt = new Date().toISOString();
    recordAudit({
      action: "EQUIPMENT_STATUS_UPDATED",
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? "",
      entityType: "equipment",
      entityId: item.id,
      details: { status: item.status, conditionNotes: item.conditionNotes }
    });
    persistState();
    return item;
  }

  async approveRequest(id, userId) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!canApproveRequest(userId, request)) {
      const error = new Error("Lecturers can only approve borrow requests submitted by students.");
      error.status = 403;
      throw error;
    }
    if (request.status !== "REQUESTED") {
      const error = new Error("Only pending requests can be approved");
      error.status = 409;
      throw error;
    }
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    const available = demoAvailableUnits(item.id, requestWindow(request), request.id);
    if ((request.quantity ?? 1) > available) {
      const error = new Error(`Equipment is no longer free for that time window (only ${Math.max(0, available)} unit(s) left)`);
      error.status = 409;
      throw error;
    }
    request.status = isImmediateStart(request.startDate) ? "BORROWED" : "RESERVED";
    request.approvedById = userId;
    request.updatedAt = new Date().toISOString();
    recordAudit({
      action: "REQUEST_APPROVED",
      actorId: userId,
      entityType: "borrowRequest",
      entityId: request.id,
      details: { status: request.status }
    });
    persistState();
    return attachEquipment(request);
  }

  async denyRequest(id, userId) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!canApproveRequest(userId, request)) {
      const error = new Error("Lecturers can only deny borrow requests submitted by students.");
      error.status = 403;
      throw error;
    }
    if (!["REQUESTED", "RESERVED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending, reserved or active requests can be cancelled");
      error.status = 409;
      throw error;
    }
    request.status = "CANCELLED";
    request.deniedById = userId;
    request.updatedAt = new Date().toISOString();
    recordAudit({
      action: "REQUEST_DENIED",
      actorId: userId,
      entityType: "borrowRequest",
      entityId: request.id,
      details: { status: request.status }
    });
    persistState();
    return attachEquipment(request);
  }

  async extendRequest(id, input = {}) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (request.status !== "BORROWED") {
      const error = new Error("Only borrowed equipment can be extended");
      error.status = 409;
      throw error;
    }

    const currentDue = new Date(request.dueAt);
    const newDue = input.dueAt ? new Date(input.dueAt) : new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
    request.dueAt = newDue.toISOString();
    request.updatedAt = new Date().toISOString();
    recordAudit({
      action: "REQUEST_EXTENDED",
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? "",
      entityType: "borrowRequest",
      entityId: request.id,
      details: { dueAt: request.dueAt }
    });
    persistState();
    return attachEquipment(request);
  }

  async listAllHistory(query = {}) {
    let list = [...borrowRequests];

    if (query.userId) {
      list = list.filter(r => r.lecturerId === Number(query.userId));
    }

    if (query.status) {
      if (query.status === "OVERDUE") {
        const now = new Date();
        list = list.filter(r => r.status === "BORROWED" && new Date(r.dueAt) < now);
      } else if (query.status === "NEAR_DUE") {
        const now = new Date();
        const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
        list = list.filter(r => r.status === "BORROWED" && new Date(r.dueAt) > now && new Date(r.dueAt) < limit);
      } else {
        list = list.filter(r => r.status === query.status);
      }
    }

    if (query.purpose) {
      if (query.purpose === "VOVINAM") {
        list = list.filter(r => r.classroom === "Vovinam Room");
      } else {
        list = list.filter(r => r.purpose === query.purpose);
      }
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      list = list.filter(r => {
        const item = equipment.find(e => e.id === r.equipmentId);
        const user = users.find(u => u.id === r.lecturerId);
        return (
          (item && item.name.toLowerCase().includes(searchLower)) ||
          (user && user.name.toLowerCase().includes(searchLower)) ||
          (r.unitOrProject && r.unitOrProject.toLowerCase().includes(searchLower)) ||
          (r.classroom && r.classroom.toLowerCase().includes(searchLower))
        );
      });
    }

    const sortField = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    list.sort((left, right) => {
      if (sortField === "nearDue") {
        const now = new Date();
        const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const leftNear = left.status === "BORROWED" && new Date(left.dueAt) > now && new Date(left.dueAt) < limit ? 1 : 0;
        const rightNear = right.status === "BORROWED" && new Date(right.dueAt) > now && new Date(right.dueAt) < limit ? 1 : 0;
        if (leftNear !== rightNear) {
          return sortOrder === "desc" ? rightNear - leftNear : leftNear - rightNear;
        }
        // Secondary sort: due date
        const lVal = left.dueAt ? new Date(left.dueAt).getTime() : 0;
        const rVal = right.dueAt ? new Date(right.dueAt).getTime() : 0;
        return sortOrder === "desc" ? rVal - lVal : lVal - rVal;
      }
      if (sortField === "overdue") {
        const now = new Date();
        const leftOver = left.status === "BORROWED" && new Date(left.dueAt) < now ? 1 : 0;
        const rightOver = right.status === "BORROWED" && new Date(right.dueAt) < now ? 1 : 0;
        if (leftOver !== rightOver) {
          return sortOrder === "desc" ? rightOver - leftOver : leftOver - rightOver;
        }
        // Secondary sort: due date
        const lVal = left.dueAt ? new Date(left.dueAt).getTime() : 0;
        const rVal = right.dueAt ? new Date(right.dueAt).getTime() : 0;
        return sortOrder === "desc" ? rVal - lVal : lVal - rVal;
      }
      const lVal = left[sortField] ? new Date(left[sortField]).getTime() : 0;
      const rVal = right[sortField] ? new Date(right[sortField]).getTime() : 0;
      return sortOrder === "desc" ? rVal - lVal : lVal - rVal;
    });

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      data: paginated.map(attachEquipment),
      total: list.length,
      page,
      limit
    };
  }

  async editRequest(id, input = {}) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!["REQUESTED", "RESERVED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending, reserved or active borrowings can be edited");
      error.status = 409;
      throw error;
    }
    const data = buildEditData(input, { toDate: (value) => new Date(value).toISOString() });
    Object.assign(request, data);
    request.updatedAt = new Date().toISOString();
    recordAudit({
      action: "REQUEST_EDITED",
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? "",
      entityType: "borrowRequest",
      entityId: request.id,
      details: data
    });
    persistState();
    return attachEquipment(request);
  }

  async addCustody(id, entry = {}) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    const log = parseCustody(request.custodyLog);
    log.push({
      at: new Date().toISOString(),
      action: entry.action ?? "HANDOVER",
      actor: entry.actor ?? "Unknown",
      notes: entry.notes ?? ""
    });
    request.custodyLog = JSON.stringify(log);
    request.updatedAt = new Date().toISOString();
    recordAudit({
      action: "CUSTODY_LOGGED",
      actorName: entry.actor ?? "Unknown",
      entityType: "borrowRequest",
      entityId: request.id,
      details: log.at(-1)
    });
    persistState();
    return attachEquipment(request);
  }

  async getEquipmentSchedule(equipmentId) {
    const item = equipment.find((candidate) => candidate.id === equipmentId);
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    const bookings = borrowRequests
      .filter((request) => request.equipmentId === equipmentId && ["REQUESTED", "RESERVED", "BORROWED"].includes(request.status))
      .map((request) => ({
        requestId: request.id,
        status: request.status,
        purpose: request.purpose,
        start: request.startDate ?? request.createdAt,
        end: request.dueAt,
        borrower: users.find((user) => user.id === request.lecturerId)?.name ?? null
      }));
    return { equipment: item, bookings };
  }

  async listStaff() {
    return users.filter((user) => user.role !== "STUDENT");
  }

  async getUser(id) {
    return users.find((user) => user.id === id) ?? null;
  }

  async getRequest(id) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    return request ? attachEquipment(request) : null;
  }

  async summary() {
    const now = new Date().toISOString();
    let available = 0;
    let fullyBooked = 0;
    let maintenance = 0;
    let totalUnits = 0;
    let availableUnits = 0;
    for (const item of equipment) {
      totalUnits += item.totalQuantity ?? 1;
      if (["MAINTENANCE", "RETIRED"].includes(item.status)) {
        maintenance += 1;
        continue;
      }
      const free = Math.max(0, demoAvailableUnits(item.id, { start: now, end: now }));
      availableUnits += free;
      if (free <= 0) {
        fullyBooked += 1;
      } else {
        available += 1;
      }
    }
    return {
      totalEquipment: equipment.length,
      totalUnits,
      availableUnits,
      available,
      borrowed: fullyBooked,
      maintenance,
      activeRequests: borrowRequests.filter((request) => !["RETURNED", "CANCELLED"].includes(request.status)).length,
      pendingRequests: borrowRequests.filter((r) => r.status === "REQUESTED").length,
      reservations: borrowRequests.filter((r) => r.status === "RESERVED").length,
      currentBorrowing: borrowRequests.filter((r) => r.status === "BORROWED").length,
      smartAlerts: buildSmartAlerts({
        equipment: await this.listEquipment(),
        requests: borrowRequests.map(attachEquipment),
        now
      }).length,
      nextMeeting: "29/5 Sprint 1 demo"
    };
  }

  async smartAlerts() {
    return buildSmartAlerts({
      equipment: await this.listEquipment(),
      requests: borrowRequests.map(attachEquipment)
    });
  }

  async equipmentTimelines() {
    return buildEquipmentTimelines({
      equipment: await this.listEquipment(),
      requests: borrowRequests.map(attachEquipment),
      auditLog,
      users
    });
  }

  async listAuditLog() {
    return auditLog.map((entry) => ({
      ...entry,
      actor: entry.actorId ? users.find((user) => user.id === entry.actorId) ?? entry.actor : entry.actor
    }));
  }

  async notificationPreferences(userId) {
    const key = String(userId ?? "default");
    return {
      ...defaultNotificationPreferences,
      ...(notificationPreferences[key] ?? {})
    };
  }

  async updateNotificationPreferences(userId, input = {}) {
    const key = String(userId ?? "default");
    notificationPreferences[key] = {
      ...(notificationPreferences[key] ?? defaultNotificationPreferences),
      ...input
    };
    recordAudit({
      action: "NOTIFICATION_PREFERENCES_UPDATED",
      actorId: userId ?? null,
      entityType: "user",
      entityId: userId ?? 0,
      details: notificationPreferences[key]
    });
    persistState();
    return this.notificationPreferences(userId);
  }

  async listReminderRules() {
    return reminderRules;
  }

  async updateReminderRules(rules = []) {
    reminderRules.splice(0, reminderRules.length, ...rules);
    recordAudit({
      action: "REMINDER_RULES_UPDATED",
      entityType: "system",
      entityId: 0,
      details: { count: reminderRules.length }
    });
    persistState();
    return reminderRules;
  }

  async sprintPlan() {
    return sprintPlan;
  }

  async listAllUsers() {
    return users.map(u => ({
      ...u,
      lecturer: u.lecturerId ? users.find(l => l.id === u.lecturerId) : null
    }));
  }

  async updateUserRole(id, role, lecturerId = undefined, profile = {}) {
    const user = users.find((u) => u.id === id);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    user.role = role;
    if (lecturerId !== undefined) {
      user.lecturerId = lecturerId;
    }
    if (profile.groupName !== undefined) {
      user.groupName = profile.groupName;
    }
    if (profile.className !== undefined) {
      user.className = profile.className;
    }
    recordAudit({
      action: "USER_ACCESS_UPDATED",
      actorId: profile.actorId ?? null,
      entityType: "user",
      entityId: user.id,
      details: {
        role: user.role,
        lecturerId: user.lecturerId ?? null,
        groupName: user.groupName ?? "",
        className: user.className ?? ""
      }
    });
    persistState();
    return {
      ...user,
      lecturer: user.lecturerId ? users.find(l => l.id === user.lecturerId) : null
    };
  }

  async createEquipment(input) {
    const newId = nextId(equipment);
    const item = {
      id: newId,
      assetCode: input.assetCode,
      name: input.name,
      category: input.category,
      location: input.location,
      status: input.status ?? "AVAILABLE",
      conditionNotes: input.conditionNotes ?? "",
      accessories: input.accessories ?? [],
      totalQuantity: input.totalQuantity ?? 1,
      updatedAt: new Date().toISOString()
    };
    equipment.push(item);
    recordAudit({
      action: "EQUIPMENT_CREATED",
      entityType: "equipment",
      entityId: item.id,
      details: { assetCode: item.assetCode, name: item.name }
    });
    persistState();
    return item;
  }

  async updateEquipment(id, input) {
    const item = equipment.find((candidate) => candidate.id === id);
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    item.name = input.name ?? item.name;
    item.category = input.category ?? item.category;
    item.location = input.location ?? item.location;
    item.status = input.status ?? item.status;
    item.conditionNotes = input.conditionNotes !== undefined ? input.conditionNotes : item.conditionNotes;
    item.accessories = input.accessories ?? item.accessories ?? [];
    item.totalQuantity = input.totalQuantity ?? item.totalQuantity;
    item.updatedAt = new Date().toISOString();
    recordAudit({
      action: "EQUIPMENT_UPDATED",
      entityType: "equipment",
      entityId: item.id,
      details: { assetCode: item.assetCode, name: item.name }
    });
    persistState();
    return item;
  }
}

export const store = new DemoRepository();
