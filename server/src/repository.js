import { PrismaClient } from "@prisma/client";

const DAY = 24 * 60 * 60 * 1000;
const fromNow = (ms) => new Date(Date.now() + ms).toISOString();

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

const users = [
  { id: 1, name: "LECTURER", email: "buidangminh23@fpt.edu.vn", role: "LECTURER" },
  { id: 2, name: "SUPPORT", email: "taolaminhanh1@fpt.edu.vn", role: "SUPPORT" },
  { id: 3, name: "ADMIN", email: "dindungwork@fpt.edu.vn", role: "ADMIN" },
  { id: 4, name: "STUDENT", email: "buidangminh.lh@fpt.edu.vn", role: "STUDENT", lecturerId: 1 },
  { id: 5, name: "EVENT_STAFF", email: "hiheho911@fpt.edu.vn", role: "EVENT_STAFF" },
  { id: 6, name: "LECTURER", email: "linhnt89@fpt.edu.vn", role: "LECTURER" },
  { id: 7, name: "SUPPORT", email: "linhnt89_fe@fpt.edu.vn", role: "SUPPORT" },
  { id: 8, name: "VOVINAM TEACHER", email: "vovinamteacher@fpt.edu.vn", role: "LECTURER" },
  { id: 9, name: "Test Account", email: "cacc80077@fpt.edu.vn", role: "LECTURER" },
  { id: 10, name: "Minh", email: "buidangminhcontentcreator@fpt.edu.vn", role: "LECTURER" },
  { id: 11, name: "OPERATIONS", email: "operations@fpt.edu.vn", role: "OPERATIONS" }
];

const equipment = [
  {
    id: 1,
    assetCode: "Logitech-LRC-001",
    name: "Logitech Rally Camera Kit",
    category: "Video",
    location: "HN-ATC-625",
    status: "AVAILABLE",
    conditionNotes: "Ready for classroom recording",
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
    updatedAt: new Date("2026-05-27T10:20:00.000Z").toISOString()
  },
  {
    id: 6,
    assetCode: "VOV-GIA-006",
    name: "Vovinam Protective Gear",
    category: "Vovinam",
    location: "HN-VOVINAM",
    status: "AVAILABLE",
    conditionNotes: "Standard size L, good condition",
    updatedAt: new Date().toISOString()
  },
  {
    id: 7,
    assetCode: "VOV-GAN-007",
    name: "Boxing Gloves",
    category: "Vovinam",
    location: "HN-VOVINAM",
    status: "AVAILABLE",
    conditionNotes: "12oz, red colour",
    updatedAt: new Date().toISOString()
  },
  {
    id: 8,
    assetCode: "VOV-CON-008",
    name: "Wooden Nunchaku",
    category: "Vovinam",
    location: "HN-VOVINAM",
    status: "AVAILABLE",
    conditionNotes: "Linked with cord, polished",
    updatedAt: new Date().toISOString()
  },
  {
    id: 9,
    assetCode: "VOV-THA-009",
    name: "Training Mat",
    category: "Vovinam",
    location: "HN-VOVINAM",
    status: "AVAILABLE",
    conditionNotes: "EVA foam, blue/red reversible",
    updatedAt: new Date().toISOString()
  },
  {
    id: 10,
    assetCode: "VOV-KIE-010",
    name: "Wooden Sword",
    category: "Vovinam",
    location: "HN-VOVINAM",
    status: "AVAILABLE",
    conditionNotes: "Bokken type, oak wood",
    updatedAt: new Date().toISOString()
  }
];

const STOCK_OVERRIDES = { 6: 10, 7: 8, 8: 6, 9: 5, 10: 4 };
equipment.forEach((item) => {
  item.totalQuantity = STOCK_OVERRIDES[item.id] ?? 1;
});

const borrowRequests = [
  {
    id: 1,
    equipmentId: 2,
    lecturerId: 1,
    classroom: "EN402",
    dueAt: fromNow(2 * DAY),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Collected by lecturer for morning tutorial",
    createdAt: fromNow(-1 * DAY),
    updatedAt: fromNow(-1 * DAY),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  },
  {
    id: 2,
    equipmentId: 4,
    lecturerId: 4,
    classroom: "ATC 625",
    dueAt: fromNow(-4 * DAY),
    returnedAt: fromNow(-4 * DAY),
    status: "RETURNED",
    handoverNotes: "Used for data science workshop recording",
    createdAt: fromNow(-6 * DAY),
    updatedAt: fromNow(-4 * DAY),
    purpose: "RESEARCH",
    program: "Data Science Specialisation",
    unitOrProject: "Research Project A",
    quantity: 1,
    returnedQuantity: 1,
    isStatusOk: true
  },
  {
    id: 3,
    equipmentId: 5,
    lecturerId: 4,
    classroom: "EN402",
    dueAt: fromNow(12 * 60 * 60 * 1000),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Microphone set for classroom presentation",
    createdAt: fromNow(-1 * DAY),
    updatedAt: fromNow(-1 * DAY),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  }
];

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

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
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
    const candidate = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!candidate) {
      const error = new Error("Invalid login");
      error.status = 401;
      throw error;
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
      startDate: input.startDate ? new Date(input.startDate).toISOString() : null,
      recurrence: input.recurrence ?? null,
      custodyLog: JSON.stringify(custody)
    };
    borrowRequests.push(request);
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
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);

    request.status = "RETURNED";
    request.returnedQuantity = input.returnedQuantity ?? request.quantity;
    request.isStatusOk = input.isStatusOk !== false;
    request.damageReport = input.damageReport ?? "";
    request.returnedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    if (item && !request.isStatusOk) {
      item.status = "MAINTENANCE";
      item.conditionNotes = `Returned damaged: ${request.damageReport}`;
      item.updatedAt = new Date().toISOString();
    }

    const custody = parseCustody(request.custodyLog);
    custody.push({
      at: request.returnedAt,
      action: request.isStatusOk ? "RETURNED_OK" : "RETURNED_DAMAGED",
      actor: input.actorName ?? "Staff",
      notes: request.damageReport || ""
    });
    request.custodyLog = JSON.stringify(custody);

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
    item.conditionNotes = input.conditionNotes;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async approveRequest(id, userId) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
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
    return attachEquipment(request);
  }

  async denyRequest(id, userId) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
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
    if (request.purpose !== "RESEARCH") {
      const error = new Error("Extensions are only available for research borrowings");
      error.status = 409;
      throw error;
    }
    const currentDue = new Date(request.dueAt);
    const newDue = input.dueAt ? new Date(input.dueAt) : new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
    request.dueAt = newDue.toISOString();
    request.updatedAt = new Date().toISOString();
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
      nextMeeting: "29/5 Sprint 1 demo"
    };
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

  async updateUserRole(id, role, lecturerId = undefined) {
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
      totalQuantity: input.totalQuantity ?? 1,
      updatedAt: new Date().toISOString()
    };
    equipment.push(item);
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
    item.totalQuantity = input.totalQuantity ?? item.totalQuantity;
    item.updatedAt = new Date().toISOString();
    return item;
  }
}

class PrismaRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async _availableUnits(tx, equipmentId, window, excludeRequestId = null) {
    const item = await tx.equipment.findUnique({ where: { id: equipmentId } });
    if (!item) {
      return { item: null, available: 0 };
    }
    if (["MAINTENANCE", "RETIRED"].includes(item.status)) {
      return { item, available: 0 };
    }
    const holds = await tx.borrowRequest.findMany({
      where: {
        equipmentId,
        status: { in: HOLD_STATUSES },
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {})
      }
    });
    const occupied = holds
      .filter((r) => rangesOverlap(r.startDate ?? r.createdAt, r.dueAt, window.start, window.end))
      .reduce((sum, r) => sum + (r.quantity ?? 1), 0);
    return { item, available: (item.totalQuantity ?? 1) - occupied };
  }

  async login(email) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { lecturer: true }
    });
    if (!user) {
      const error = new Error("Invalid login");
      error.status = 401;
      throw error;
    }
    return { user, token: `mysql-token-${user.id}` };
  }

  async listEquipment() {
    const now = new Date();
    const [items, activeHolds] = await Promise.all([
      this.prisma.equipment.findMany({
        include: {
          requests: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        },
        orderBy: { assetCode: "asc" }
      }),
      this.prisma.borrowRequest.findMany({ where: { status: { in: HOLD_STATUSES } } })
    ]);
    return items.map(item => {
      const latestRequest = item.requests[0] || null;
      const { requests, ...rest } = item;
      const occupied = activeHolds
        .filter((r) => r.equipmentId === item.id && rangesOverlap(r.startDate ?? r.createdAt, r.dueAt, now, now))
        .reduce((sum, r) => sum + (r.quantity ?? 1), 0);
      const availableNow = Math.max(0, (item.totalQuantity ?? 1) - occupied);
      return {
        ...rest,
        totalQuantity: item.totalQuantity ?? 1,
        availableNow,
        displayStatus: computeDisplayStatus(item, availableNow),
        latestRequest
      };
    });
  }

  async listActiveRequests() {
    return this.prisma.borrowRequest.findMany({
      where: { status: { notIn: ["RETURNED", "CANCELLED"] } },
      include: { equipment: true, lecturer: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async listBorrowHistory(userId) {
    return this.prisma.borrowRequest.findMany({
      where: { lecturerId: userId },
      include: { equipment: true, lecturer: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async borrowEquipment(input) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.lecturerId } });

      const item = await tx.equipment.findUnique({ where: { id: input.equipmentId } });
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
      const start = input.startDate ? new Date(input.startDate) : new Date();
      const end = new Date(input.dueAt);
      if (end.getTime() <= start.getTime()) {
        const error = new Error("Return time must be after the start time");
        error.status = 400;
        throw error;
      }
      const { available } = await this._availableUnits(tx, input.equipmentId, { start: start.toISOString(), end: end.toISOString() });
      if (quantity > available) {
        const error = new Error(`Only ${Math.max(0, available)} of ${item.totalQuantity ?? 1} unit(s) are free for that time window`);
        error.status = 409;
        throw error;
      }

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

      return tx.borrowRequest.create({
        data: {
          equipmentId: input.equipmentId,
          lecturerId: input.lecturerId,
          classroom: input.classroom ?? null,
          dueAt: new Date(input.dueAt),
          status,
          handoverNotes: input.handoverNotes ?? "",
          purpose,
          program: input.program ?? null,
          unitOrProject: input.unitOrProject ?? null,
          quantity: input.quantity ?? 1,
          startDate: input.startDate ? new Date(input.startDate) : null,
          recurrence: input.recurrence ?? null,
          custodyLog: JSON.stringify(custody)
        },
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async confirmReturn(id, input = {}) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id }, include: { equipment: true } });
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

      const isStatusOk = input.isStatusOk !== false;
      const damageReport = input.damageReport ?? "";
      const returnedQuantity = input.returnedQuantity ?? request.quantity;

      if (!isStatusOk) {
        await tx.equipment.update({
          where: { id: request.equipmentId },
          data: {
            status: "MAINTENANCE",
            conditionNotes: `Returned damaged: ${damageReport}`
          }
        });
      }

      const custody = parseCustody(request.custodyLog);
      custody.push({
        at: new Date().toISOString(),
        action: isStatusOk ? "RETURNED_OK" : "RETURNED_DAMAGED",
        actor: input.actorName ?? "Staff",
        notes: damageReport
      });

      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "RETURNED",
          returnedAt: new Date(),
          returnedQuantity,
          isStatusOk,
          damageReport,
          custodyLog: JSON.stringify(custody)
        },
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async checkOut(id, input = {}) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id } });
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
      const data = { status: "BORROWED" };
      if (request.purpose === "EVENT") {
        const log = parseCustody(request.custodyLog);
        log.push({
          at: new Date().toISOString(),
          action: "CHECKED_OUT",
          actor: input.actorName ?? "Staff",
          notes: input.notes ?? ""
        });
        data.custodyLog = JSON.stringify(log);
      }
      return tx.borrowRequest.update({
        where: { id },
        data,
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async updateEquipmentStatus(id, input) {
    return this.prisma.equipment.update({
      where: { id },
      data: {
        status: input.status,
        conditionNotes: input.conditionNotes
      }
    });
  }

  async approveRequest(id, userId) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id } });
      if (!request) {
        const error = new Error("Request not found");
        error.status = 404;
        throw error;
      }
      if (request.status !== "REQUESTED") {
        const error = new Error("Only pending requests can be approved");
        error.status = 409;
        throw error;
      }
      const { item, available } = await this._availableUnits(
        tx,
        request.equipmentId,
        { start: request.startDate ?? request.createdAt, end: request.dueAt },
        request.id
      );
      if (!item) {
        const error = new Error("Equipment not found");
        error.status = 404;
        throw error;
      }
      if ((request.quantity ?? 1) > available) {
        const error = new Error(`Equipment is no longer free for that time window (only ${Math.max(0, available)} unit(s) left)`);
        error.status = 409;
        throw error;
      }
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: isImmediateStart(request.startDate) ? "BORROWED" : "RESERVED",
          approvedById: userId
        },
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async denyRequest(id, userId) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id } });
      if (!request) {
        const error = new Error("Request not found");
        error.status = 404;
        throw error;
      }
      if (!["REQUESTED", "RESERVED", "BORROWED"].includes(request.status)) {
        const error = new Error("Only pending, reserved or active requests can be cancelled");
        error.status = 409;
        throw error;
      }
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "CANCELLED",
          deniedById: userId
        },
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async extendRequest(id, input = {}) {
    const request = await this.prisma.borrowRequest.findUnique({ where: { id } });
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
    if (request.purpose !== "RESEARCH") {
      const error = new Error("Extensions are only available for research borrowings");
      error.status = 409;
      throw error;
    }
    const currentDue = new Date(request.dueAt);
    const newDue = input.dueAt ? new Date(input.dueAt) : new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.prisma.borrowRequest.update({
      where: { id },
      data: {
        dueAt: newDue
      },
      include: { equipment: true, lecturer: true }
    });
  }

  async listAllHistory(query = {}) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    const skip = (page - 1) * limit;

    const where = {};
    if (query.userId) {
      where.lecturerId = Number(query.userId);
    }
    if (query.status) {
      if (query.status === "OVERDUE") {
        where.status = "BORROWED";
        where.dueAt = { lt: new Date() };
      } else if (query.status === "NEAR_DUE") {
        where.status = "BORROWED";
        where.dueAt = {
          gt: new Date(),
          lt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
      } else {
        where.status = query.status;
      }
    }
    if (query.purpose) {
      if (query.purpose === "VOVINAM") {
        where.classroom = "Vovinam Room";
      } else {
        where.purpose = query.purpose;
      }
    }
    if (query.search) {
      where.OR = [
        { classroom: { contains: query.search } },
        { unitOrProject: { contains: query.search } },
        { equipment: { name: { contains: query.search } } },
        { lecturer: { name: { contains: query.search } } }
      ];
    }

    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    const isCustomSort = ["nearDue", "overdue"].includes(sortBy);

    const [allData, total] = await Promise.all([
      this.prisma.borrowRequest.findMany({
        where,
        include: { equipment: true, lecturer: true },
        orderBy: isCustomSort ? undefined : { [sortBy]: sortOrder },
        ...(isCustomSort ? {} : { skip, take: limit })
      }),
      this.prisma.borrowRequest.count({ where })
    ]);

    let data = allData;
    if (isCustomSort) {
      data.sort((left, right) => {
        if (sortBy === "nearDue") {
          const now = new Date();
          const limitTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          const leftNear = left.status === "BORROWED" && new Date(left.dueAt) > now && new Date(left.dueAt) < limitTime ? 1 : 0;
          const rightNear = right.status === "BORROWED" && new Date(right.dueAt) > now && new Date(right.dueAt) < limitTime ? 1 : 0;
          if (leftNear !== rightNear) {
            return sortOrder === "desc" ? rightNear - leftNear : leftNear - rightNear;
          }
          // Secondary sort: due date
          const lVal = left.dueAt ? new Date(left.dueAt).getTime() : 0;
          const rVal = right.dueAt ? new Date(right.dueAt).getTime() : 0;
          return sortOrder === "desc" ? rVal - lVal : lVal - rVal;
        }
        if (sortBy === "overdue") {
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
        return 0;
      });
      data = data.slice(skip, skip + limit);
    }

    return {
      data,
      total,
      page,
      limit
    };
  }

  async editRequest(id, input = {}) {
    const request = await this.prisma.borrowRequest.findUnique({ where: { id } });
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
    const data = buildEditData(input, { toDate: (value) => new Date(value) });
    return this.prisma.borrowRequest.update({
      where: { id },
      data,
      include: { equipment: true, lecturer: true }
    });
  }

  async addCustody(id, entry = {}) {
    const request = await this.prisma.borrowRequest.findUnique({ where: { id } });
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
    return this.prisma.borrowRequest.update({
      where: { id },
      data: { custodyLog: JSON.stringify(log) },
      include: { equipment: true, lecturer: true }
    });
  }

  async getEquipmentSchedule(equipmentId) {
    const item = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    const requests = await this.prisma.borrowRequest.findMany({
      where: { equipmentId, status: { in: ["REQUESTED", "RESERVED", "BORROWED"] } },
      include: { lecturer: true }
    });
    const bookings = requests.map((request) => ({
      requestId: request.id,
      status: request.status,
      purpose: request.purpose,
      start: request.startDate ?? request.createdAt,
      end: request.dueAt,
      borrower: request.lecturer?.name ?? null
    }));
    return { equipment: item, bookings };
  }

  async listStaff() {
    return this.prisma.user.findMany({ where: { role: { not: "STUDENT" } } });
  }

  async getUser(id) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getRequest(id) {
    return this.prisma.borrowRequest.findUnique({
      where: { id },
      include: { equipment: true, lecturer: true }
    });
  }

  async summary() {
    const now = new Date();
    const [items, activeHolds, activeRequests, pendingRequests, reservations, currentBorrowing] = await Promise.all([
      this.prisma.equipment.findMany(),
      this.prisma.borrowRequest.findMany({ where: { status: { in: HOLD_STATUSES } } }),
      this.prisma.borrowRequest.count({ where: { status: { notIn: ["RETURNED", "CANCELLED"] } } }),
      this.prisma.borrowRequest.count({ where: { status: "REQUESTED" } }),
      this.prisma.borrowRequest.count({ where: { status: "RESERVED" } }),
      this.prisma.borrowRequest.count({ where: { status: "BORROWED" } })
    ]);
    let available = 0;
    let fullyBooked = 0;
    let maintenance = 0;
    let totalUnits = 0;
    let availableUnits = 0;
    for (const item of items) {
      totalUnits += item.totalQuantity ?? 1;
      if (["MAINTENANCE", "RETIRED"].includes(item.status)) {
        maintenance += 1;
        continue;
      }
      const occupied = activeHolds
        .filter((r) => r.equipmentId === item.id && rangesOverlap(r.startDate ?? r.createdAt, r.dueAt, now, now))
        .reduce((sum, r) => sum + (r.quantity ?? 1), 0);
      const free = Math.max(0, (item.totalQuantity ?? 1) - occupied);
      availableUnits += free;
      if (free <= 0) {
        fullyBooked += 1;
      } else {
        available += 1;
      }
    }
    return {
      totalEquipment: items.length,
      totalUnits,
      availableUnits,
      available,
      borrowed: fullyBooked,
      maintenance,
      activeRequests,
      pendingRequests,
      reservations,
      currentBorrowing,
      nextMeeting: "29/5 Sprint 1 demo"
    };
  }

  async sprintPlan() {
    return sprintPlan;
  }

  async listAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { name: "asc" },
      include: { lecturer: true }
    });
  }

  async updateUserRole(id, role, lecturerId = undefined) {
    const data = { role };
    if (lecturerId !== undefined) {
      data.lecturerId = lecturerId;
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: { lecturer: true }
    });
  }

  async createEquipment(input) {
    return this.prisma.equipment.create({
      data: {
        assetCode: input.assetCode,
        name: input.name,
        category: input.category,
        location: input.location,
        status: input.status ?? "AVAILABLE",
        conditionNotes: input.conditionNotes ?? "",
        totalQuantity: input.totalQuantity ?? 1
      }
    });
  }

  async updateEquipment(id, input) {
    return this.prisma.equipment.update({
      where: { id },
      data: {
        name: input.name,
        category: input.category,
        location: input.location,
        status: input.status,
        conditionNotes: input.conditionNotes,
        totalQuantity: input.totalQuantity
      }
    });
  }
}

export function createRepository() {
  if (process.env.DATABASE_URL && process.env.USE_DEMO_STORE !== "true") {
    return new PrismaRepository();
  }
  return new DemoRepository();
}
