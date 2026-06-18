import { PrismaClient } from "@prisma/client";

// Deterministically generate a student ID from an email address.
// Format: SWH + 5-digit number (e.g. SWH02468)
function generateStudentId(email) {
  const prefix = email.split("@")[0].toLowerCase();
  let hash = 0;
  for (let i = 0; i < prefix.length; i++) {
    hash = (hash * 31 + prefix.charCodeAt(i)) & 0xfffff;
  }
  return "SWH" + String(hash % 100000).padStart(5, "0");
}

function attachStudentIdToUser(user) {
  if (!user) return user;
  return {
    ...user,
    studentId: generateStudentId(user.email)
  };
}

function attachStudentIdToRequest(request) {
  if (!request) return request;
  const copy = { ...request };
  if (copy.lecturer) {
    copy.lecturer = attachStudentIdToUser(copy.lecturer);
  }
  return copy;
}

const users = [
  { id: 1, name: "Minh Bui Dang", email: "buidangminh23@fpt.edu.vn", role: "LECTURER", studentId: generateStudentId("buidangminh23@fpt.edu.vn") },
  { id: 2, name: "Nguyen Minh Anh", email: "taolaminhanh1@fpt.edu.vn", role: "SUPPORT", studentId: generateStudentId("taolaminhanh1@fpt.edu.vn") },
  { id: 3, name: "Dinh Dung", email: "dindungwork@fpt.edu.vn", role: "ADMIN", studentId: generateStudentId("dindungwork@fpt.edu.vn") },
  { id: 4, name: "Dang Minh Bui", email: "buidangminh.lh@fpt.edu.vn", role: "STUDENT", studentId: generateStudentId("buidangminh.lh@fpt.edu.vn") },
  { id: 5, name: "Nguyen Hoang Hiep", email: "hiheho911@fpt.edu.vn", role: "EVENT_STAFF", studentId: generateStudentId("hiheho911@fpt.edu.vn") },
  { id: 6, name: "Operations", email: "operations@fpt.edu.vn", role: "OPERATIONS", studentId: generateStudentId("operations@fpt.edu.vn") }
];

const equipment = [
  {
    id: 1,
    assetCode: "SW-EQ-1001",
    name: "Logitech Rally Camera Kit",
    category: "Video",
    location: "ATC 625",
    status: "AVAILABLE",
    conditionNotes: "Ready for classroom recording",
    updatedAt: new Date("2026-05-27T08:30:00.000Z").toISOString()
  },
  {
    id: 2,
    assetCode: "SW-EQ-1002",
    name: "Wireless Presentation Clicker",
    category: "Teaching",
    location: "Library Desk",
    status: "BORROWED",
    conditionNotes: "Borrowed for tutorial room EN402",
    updatedAt: new Date("2026-05-27T09:10:00.000Z").toISOString()
  },
  {
    id: 3,
    assetCode: "SW-EQ-1003",
    name: "Portable Projector",
    category: "Display",
    location: "Room BA701",
    status: "MAINTENANCE",
    conditionNotes: "Lamp replacement required",
    updatedAt: new Date("2026-05-26T17:15:00.000Z").toISOString()
  },
  {
    id: 4,
    assetCode: "SW-EQ-1004",
    name: "HDMI Capture Adapter",
    category: "Video",
    location: "ATC 628",
    status: "AVAILABLE",
    conditionNotes: "Checked by support staff",
    updatedAt: new Date("2026-05-27T07:45:00.000Z").toISOString()
  },
  {
    id: 5,
    assetCode: "SW-EQ-1005",
    name: "Lapel Microphone Set",
    category: "Audio",
    location: "Media Counter",
    status: "AVAILABLE",
    conditionNotes: "Batteries replaced",
    updatedAt: new Date("2026-05-27T10:20:00.000Z").toISOString()
  }
];

const borrowRequests = [
  {
    id: 1,
    equipmentId: 2,
    lecturerId: 1,
    classroom: "EN402",
    dueAt: new Date("2026-05-29T10:30:00.000Z").toISOString(),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Collected by lecturer for morning tutorial",
    createdAt: new Date("2026-05-27T09:10:00.000Z").toISOString(),
    updatedAt: new Date("2026-05-27T09:10:00.000Z").toISOString(),
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
    dueAt: new Date("2026-05-26T10:30:00.000Z").toISOString(),
    returnedAt: new Date("2026-05-26T10:05:00.000Z").toISOString(),
    status: "RETURNED",
    handoverNotes: "Used for data science workshop recording",
    createdAt: new Date("2026-05-24T08:20:00.000Z").toISOString(),
    updatedAt: new Date("2026-05-26T10:05:00.000Z").toISOString(),
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
    dueAt: new Date("2026-05-29T12:00:00.000Z").toISOString(),
    returnedAt: null,
    status: "BORROWED",
    handoverNotes: "Microphone set for classroom presentation",
    createdAt: new Date("2026-05-27T11:45:00.000Z").toISOString(),
    updatedAt: new Date("2026-05-27T11:45:00.000Z").toISOString(),
    purpose: "CLASSROOM",
    program: "Bachelor of Computer Science",
    unitOrProject: "COS20031.1",
    quantity: 1
  }
];

const semesters = [
  { id: 1, code: "2026-S1", name: "Semester 1 2026", startDate: "2026-03-02", endDate: "2026-06-19" }
];

const units = [
  { id: 1, code: "COS20031", name: "Technical Software Development", semesterId: 1, lecturerId: 1, dayOfWeek: 1, startHour: 9, endHour: 11, classroom: "HN-DT1-9.1" },
  { id: 2, code: "COS30008", name: "Data Structures and Patterns", semesterId: 1, lecturerId: 1, dayOfWeek: 3, startHour: 13, endHour: 15, classroom: "HN-DT1-9.2" },
  { id: 3, code: "COS20007", name: "Object Oriented Programming", semesterId: 1, lecturerId: 10, dayOfWeek: 2, startHour: 10, endHour: 12, classroom: "HN-ATC-6.25" }
];

const enrollments = [
  { studentId: 12, unitId: 1 },
  { studentId: 12, unitId: 3 }
];

const researchProjects = [
  { id: 1, name: "Data Science Capstone", lecturerId: 1, startDate: "2026-03-09", endDate: "2026-06-12", memberIds: [12] },
  { id: 2, name: "Computer Vision Lab", lecturerId: 10, startDate: "2026-03-09", endDate: "2026-06-12", memberIds: [12] }
];

const schedules = [
  { id: 1, ownerType: "CLASS", ownerId: 1, startDate: "2026-03-02", endDate: "2026-06-19" },
  { id: 2, ownerType: "PROJECT", ownerId: 1, startDate: "2026-03-09", endDate: "2026-06-12" }
];

function unitIdsForStudent(studentId) {
  return enrollments
    .filter((enrollment) => enrollment.studentId === studentId)
    .map((enrollment) => enrollment.unitId);
}

function inMemoryLecturerTeachesStudent(lecturerId, studentId) {
  const taughtUnitIds = units
    .filter((unit) => unit.lecturerId === lecturerId)
    .map((unit) => unit.id);
  return enrollments.some(
    (enrollment) => enrollment.studentId === studentId && taughtUnitIds.includes(enrollment.unitId)
  );
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
  "recurrence",
  "unitId",
  "researchProjectId"
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

const SORTABLE_FIELDS = ["createdAt", "dueAt", "returnedAt", "updatedAt", "startDate"];

function normalizeSort(query) {
  const sortBy = SORTABLE_FIELDS.includes(query.sortBy) ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { sortBy, sortOrder };
}

function parsePageLimit(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  return { page, limit };
}

function toValidDate(value) {
  if (value == null) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error("Invalid date value");
    error.status = 400;
    throw error;
  }
  return date;
}

function clampReturnedQuantity(input, quantity) {
  const total = Number(quantity ?? 1);
  if (input.returnedQuantity == null) {
    return total;
  }
  const value = Number(input.returnedQuantity);
  if (!Number.isInteger(value) || value < 0 || value > total) {
    const error = new Error("returnedQuantity must be an integer between 0 and the borrowed quantity");
    error.status = 400;
    throw error;
  }
  return value;
}

function findInMemoryLecturerBorrowForTransfer(equipmentId, requesterId, quantity = 1) {
  return borrowRequests.find((request) => {
    if (request.equipmentId !== equipmentId || request.status !== "BORROWED" || request.lecturerId === requesterId) {
      return false;
    }
    const holder = users.find((candidate) => candidate.id === request.lecturerId);
    const remaining = request.remainingQuantity ?? request.quantity ?? 1;
    return holder?.role === "LECTURER" && remaining >= quantity;
  }) ?? null;
}

function closeInMemoryTransferredBorrow(request, recipient, at) {
  request.status = "RETURNED";
  request.returnedAt = at;
  request.returnedQuantity = request.quantity ?? 1;
  request.isStatusOk = true;
  request.damageReport = "";
  request.updatedAt = at;
  const custody = parseCustody(request.custodyLog);
  custody.push({
    at,
    action: "TRANSFERRED",
    actor: recipient?.email ?? recipient?.name ?? "Staff",
    notes: `Transferred directly to ${recipient?.name ?? recipient?.email ?? "new borrower"}`
  });
  request.custodyLog = JSON.stringify(custody);
}

class DemoRepository {
  async login(email) {
    let user = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Auto-register new Google account as STUDENT with a generated student ID
      user = {
        id: nextId(users),
        name: email.split("@")[0],
        email: email.toLowerCase(),
        role: "STUDENT",
        studentId: generateStudentId(email)
      };
      users.push(user);
    }
    return { user, token: `token-${user.id}` };
  }

  async listEquipment() {
    return equipment.map(item => {
      const itemRequests = borrowRequests
        .filter((r) => r.equipmentId === item.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return {
        ...item,
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

    if (item.status === "RETIRED") {
      const error = new Error("Equipment has been retired and cannot be borrowed");
      error.status = 409;
      throw error;
    }

    const user = users.find((candidate) => candidate.id === input.lecturerId);
    const isStudent = user?.role === "STUDENT";

    const quantity = input.quantity ?? 1;
    const transferSource = !isStudent && item.status === "BORROWED"
      ? findInMemoryLecturerBorrowForTransfer(item.id, input.lecturerId, quantity)
      : null;

    if (item.status !== "AVAILABLE" && !transferSource && !isStudent) {
      const error = new Error("Equipment is not available");
      error.status = 409;
      throw error;
    }

    const status = isStudent ? "REQUESTED" : "BORROWED";
    const purpose = input.purpose ?? "CLASSROOM";
    if (user?.role === "EVENT_STAFF" && purpose !== "EVENT") {
      const error = new Error("Event staff can only borrow equipment for event support");
      error.status = 400;
      throw error;
    }
    const dueAt = toValidDate(input.dueAt);
    if (!dueAt) {
      const error = new Error("dueAt is required");
      error.status = 400;
      throw error;
    }
    const startDate = toValidDate(input.startDate);

    const custody = [];
    if (purpose === "EVENT") {
      custody.push({
        at: new Date().toISOString(),
        action: isStudent ? "REQUESTED" : "CHECKED_OUT",
        actor: user?.name ?? `User ${input.lecturerId}`,
        notes: input.handoverNotes ?? ""
      });
    }

    const now = new Date().toISOString();
    const request = {
      id: nextId(borrowRequests),
      equipmentId: item.id,
      lecturerId: input.lecturerId,
      classroom: input.classroom ?? null,
      dueAt: dueAt.toISOString(),
      returnedAt: null,
      status,
      handoverNotes: input.handoverNotes ?? "",
      createdAt: now,
      updatedAt: now,
      purpose,
      program: input.program ?? null,
      unitOrProject: input.unitOrProject ?? null,
      quantity,
      startDate: startDate ? startDate.toISOString() : null,
      recurrence: input.recurrence ?? null,
      unitId: input.unitId ?? null,
      researchProjectId: input.researchProjectId ?? null,
      custodyLog: JSON.stringify(custody)
    };

    if (transferSource) {
      closeInMemoryTransferredBorrow(transferSource, user, now);
    }

    if (!isStudent) {
      item.status = "BORROWED";
      item.conditionNotes = transferSource
        ? `Transferred from ${users.find((candidate) => candidate.id === transferSource.lecturerId)?.name ?? "lecturer"} to ${user?.name ?? "staff"}`
        : `Borrowed for ${input.classroom || purpose}`;
      item.updatedAt = now;
    }
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
    if (input.actorId != null && input.actorId === request.lecturerId) {
      const error = new Error("A different staff member must confirm this return (separation of duties).");
      error.status = 403;
      throw error;
    }
    const returnedQuantity = clampReturnedQuantity(input, request.quantity);
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);

    request.status = "RETURNED";
    request.returnedQuantity = returnedQuantity;
    request.isStatusOk = input.isStatusOk !== false;
    request.damageReport = input.damageReport ?? "";
    request.returnedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    if (item) {
      if (request.isStatusOk) {
        item.status = "AVAILABLE";
        item.conditionNotes = "Returned and confirmed OK";
      } else {
        item.status = "MAINTENANCE";
        item.conditionNotes = `Returned damaged: ${request.damageReport}`;
      }
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
    if (!item || item.status !== "AVAILABLE") {
      const error = new Error("Equipment is no longer available to approve");
      error.status = 409;
      throw error;
    }
    request.status = "BORROWED";
    request.approvedById = userId;
    request.updatedAt = new Date().toISOString();
    item.status = "BORROWED";
    item.conditionNotes = `Approved borrow for ${request.classroom || request.purpose}`;
    item.updatedAt = new Date().toISOString();
    return attachEquipment(request);
  }

  async denyRequest(id, userId) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!["REQUESTED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending or active requests can be denied");
      error.status = 409;
      throw error;
    }
    const wasHoldingEquipment = request.status === "BORROWED";
    request.status = "REJECTED";
    request.deniedById = userId;
    request.updatedAt = new Date().toISOString();
    if (wasHoldingEquipment) {
      const item = equipment.find((candidate) => candidate.id === request.equipmentId);
      if (item) {
        item.status = "AVAILABLE";
        item.conditionNotes = "Borrow request denied";
        item.updatedAt = new Date().toISOString();
      }
    }
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
    const newDue = toValidDate(input.dueAt) ?? new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
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
      list = list.filter(r => r.status === query.status);
    }

    if (query.purpose) {
      list = list.filter(r => r.purpose === query.purpose);
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

    const { sortBy, sortOrder } = normalizeSort(query);
    list.sort((left, right) => {
      const lVal = left[sortBy] ? new Date(left[sortBy]).getTime() : 0;
      const rVal = right[sortBy] ? new Date(right[sortBy]).getTime() : 0;
      return sortOrder === "desc" ? rVal - lVal : lVal - rVal;
    });

    const { page, limit } = parsePageLimit(query);
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      data: paginated.map(attachEquipment),
      total: list.length,
      page,
      limit
    };
  }

  async editRequest(id, input = {}, actor = null) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!["REQUESTED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending or active borrowings can be edited");
      error.status = 409;
      throw error;
    }
    const owner = users.find((candidate) => candidate.id === request.lecturerId);
    const ownerIsStudent = owner?.role === "STUDENT";
    if (actor && actor.id === request.lecturerId && ownerIsStudent && request.status !== "REQUESTED" && input.isExtendMode) {
      if (input.dueAt) {
        const origStart = request.startDate ?? request.createdAt;
        const origDay = new Date(origStart).toDateString();
        const newDay = new Date(input.dueAt).toDateString();
        if (origDay !== newDay) {
          const error = new Error("Extension is only allowed within the same day.");
          error.status = 400;
          throw error;
        }
      }
      const disallowed = ["classroom", "purpose", "program", "unitOrProject", "quantity", "recurrence"];
      for (const k of disallowed) {
        if (input[k] !== undefined && input[k] !== request[k]) {
          const error = new Error("After approval you can only extend the due date.");
          error.status = 409;
          throw error;
        }
      }
    }
    const data = buildEditData(input, { toDate: (value) => new Date(value).toISOString() });
    const nextPurpose = data.purpose ?? request.purpose;
    if (owner?.role === "EVENT_STAFF" && nextPurpose !== "EVENT") {
      const error = new Error("Event staff can only borrow equipment for event support");
      error.status = 400;
      throw error;
    }
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
      .filter((request) => request.equipmentId === equipmentId && ["REQUESTED", "BORROWED"].includes(request.status))
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

  async listUnitsForUser(user) {
    if (!user) {
      return [];
    }
    if (user.role === "STUDENT") {
      const enrolledUnitIds = unitIdsForStudent(user.id);
      return units.filter((unit) => enrolledUnitIds.includes(unit.id));
    }
    if (user.role === "LECTURER") {
      return units.filter((unit) => unit.lecturerId === user.id);
    }
    return [...units];
  }

  async listProjectsForUser(user) {
    if (!user) {
      return [];
    }
    if (user.role === "STUDENT") {
      return researchProjects.filter((project) => project.memberIds.includes(user.id));
    }
    if (user.role === "LECTURER") {
      return researchProjects.filter((project) => project.lecturerId === user.id);
    }
    return [...researchProjects];
  }

  async lecturerTeachesStudent(lecturerId, studentId) {
    return inMemoryLecturerTeachesStudent(lecturerId, studentId);
  }

  async getUser(id) {
    return users.find((user) => user.id === id) ?? null;
  }

  async getRequest(id) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    return request ? attachEquipment(request) : null;
  }

  async createEquipment(input) {
    if (equipment.some((candidate) => candidate.assetCode === input.assetCode)) {
      const error = new Error("Asset code already exists");
      error.status = 409;
      throw error;
    }
    const item = {
      id: nextId(equipment),
      assetCode: input.assetCode,
      name: input.name,
      category: input.category,
      location: input.location,
      status: input.status ?? "AVAILABLE",
      conditionNotes: input.conditionNotes ?? null,
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
    for (const key of ["assetCode", "name", "category", "location", "status", "conditionNotes"]) {
      if (input[key] !== undefined) {
        item[key] = input[key];
      }
    }
    item.updatedAt = new Date().toISOString();
    return item;
  }

  async listAllUsers() {
    return users;
  }

  async updateUserRole(id, role) {
    const user = users.find((candidate) => candidate.id === id);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }
    user.role = role;
    return user;
  }

  async summary() {
    const counts = equipment.reduce(
      (accumulator, item) => ({ ...accumulator, [item.status]: (accumulator[item.status] ?? 0) + 1 }),
      {}
    );
    return {
      totalEquipment: equipment.length,
      available: counts.AVAILABLE ?? 0,
      borrowed: counts.BORROWED ?? 0,
      maintenance: counts.MAINTENANCE ?? 0,
      activeRequests: borrowRequests.filter((request) => !["RETURNED", "CANCELLED"].includes(request.status)).length,
      nextMeeting: "29/5 Sprint 1 demo"
    };
  }

  async sprintPlan() {
    return sprintPlan;
  }
}

class PrismaRepository {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async login(email) {
    const user = await this.prisma.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (!user) {
      const error = new Error("Invalid login");
      error.status = 401;
      throw error;
    }
    return { user: attachStudentIdToUser(user), token: `token-${user.id}` };
  }

  async listEquipment() {
    const items = await this.prisma.equipment.findMany({
      include: {
        requests: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { assetCode: "asc" }
    });
    return items.map(item => {
      const latestRequest = item.requests[0] || null;
      const { requests, ...rest } = item;
      return {
        ...rest,
        latestRequest: attachStudentIdToRequest(latestRequest)
      };
    });
  }

  async listActiveRequests() {
    const requests = await this.prisma.borrowRequest.findMany({
      where: { status: { notIn: ["RETURNED", "CANCELLED"] } },
      include: { equipment: true, lecturer: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
    return requests.map(attachStudentIdToRequest);
  }

  async listBorrowHistory(userId) {
    const requests = await this.prisma.borrowRequest.findMany({
      where: { lecturerId: userId },
      include: { equipment: true, lecturer: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    });
    return requests.map(attachStudentIdToRequest);
  }

  async borrowEquipment(input) {
    const request = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.lecturerId } });
      const isStudent = user?.role === "STUDENT";

      const item = await tx.equipment.findUnique({ where: { id: input.equipmentId } });
      if (!item) {
        const error = new Error("Equipment not found");
        error.status = 404;
        throw error;
      }

      if (item.status === "RETIRED") {
        const error = new Error("Equipment has been retired and cannot be borrowed");
        error.status = 409;
        throw error;
      }

      const quantity = input.quantity ?? 1;
      const transferSource = !isStudent && item.status === "BORROWED"
        ? await tx.borrowRequest.findFirst({
            where: {
              equipmentId: input.equipmentId,
              status: "BORROWED",
              lecturerId: { not: input.lecturerId },
              lecturer: { is: { role: "LECTURER" } },
              quantity: { gte: quantity }
            },
            include: { lecturer: true },
            orderBy: { createdAt: "asc" }
          })
        : null;

      if (item.status !== "AVAILABLE" && !transferSource && !isStudent) {
        const error = new Error("Equipment is not available");
        error.status = 409;
        throw error;
      }

      const status = isStudent ? "REQUESTED" : "BORROWED";
      const purpose = input.purpose ?? "CLASSROOM";
      if (user?.role === "EVENT_STAFF" && purpose !== "EVENT") {
        const error = new Error("Event staff can only borrow equipment for event support");
        error.status = 400;
        throw error;
      }
      const dueAt = toValidDate(input.dueAt);
      if (!dueAt) {
        const error = new Error("dueAt is required");
        error.status = 400;
        throw error;
      }
      const startDate = toValidDate(input.startDate);

      if (!isStudent && !transferSource) {
        const flipped = await tx.equipment.updateMany({
          where: { id: input.equipmentId, status: "AVAILABLE" },
          data: {
            status: "BORROWED",
            conditionNotes: `Borrowed for ${input.classroom || purpose}`
          }
        });
        if (flipped.count === 0) {
          const error = new Error("Equipment is not available");
          error.status = 409;
          throw error;
        }
      }

      if (transferSource) {
        const custody = parseCustody(transferSource.custodyLog);
        custody.push({
          at: new Date().toISOString(),
          action: "TRANSFERRED",
          actor: user?.email ?? user?.name ?? "Staff",
          notes: `Transferred directly to ${user?.name ?? user?.email ?? "new borrower"}`
        });
        await tx.borrowRequest.update({
          where: { id: transferSource.id },
          data: {
            status: "RETURNED",
            returnedAt: new Date(),
            returnedQuantity: transferSource.quantity ?? 1,
            isStatusOk: true,
            damageReport: "",
            custodyLog: JSON.stringify(custody)
          }
        });
        await tx.equipment.update({
          where: { id: input.equipmentId },
          data: {
            status: "BORROWED",
            conditionNotes: `Transferred from ${transferSource.lecturer?.name ?? "lecturer"} to ${user?.name ?? "staff"}`
          }
        });
      }

      const custody = [];
      if (purpose === "EVENT") {
        custody.push({
          at: new Date().toISOString(),
          action: isStudent ? "REQUESTED" : "CHECKED_OUT",
          actor: user?.name ?? `User ${input.lecturerId}`,
          notes: input.handoverNotes ?? ""
        });
      }

      return tx.borrowRequest.create({
        data: {
          equipmentId: input.equipmentId,
          lecturerId: input.lecturerId,
          classroom: input.classroom ?? null,
          dueAt,
          status,
          handoverNotes: input.handoverNotes ?? "",
          purpose,
          program: input.program ?? null,
          unitOrProject: input.unitOrProject ?? null,
          quantity,
          startDate,
          recurrence: input.recurrence ?? null,
          unitId: input.unitId ?? null,
          researchProjectId: input.researchProjectId ?? null,
          custodyLog: JSON.stringify(custody)
        },
        include: { equipment: true, lecturer: true }
      });
    });
    return attachStudentIdToRequest(request);
  }

  async confirmReturn(id, input = {}) {
    const request = await this.prisma.$transaction(async (tx) => {
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

      if (input.actorId != null && input.actorId === request.lecturerId) {
        const error = new Error("A different staff member must confirm this return (separation of duties).");
        error.status = 403;
        throw error;
      }

      const isStatusOk = input.isStatusOk !== false;
      const damageReport = input.damageReport ?? "";
      const returnedQuantity = clampReturnedQuantity(input, request.quantity);

      await tx.equipment.update({
        where: { id: request.equipmentId },
        data: {
          status: isStatusOk ? "AVAILABLE" : "MAINTENANCE",
          conditionNotes: isStatusOk ? "Returned and confirmed OK" : `Returned damaged: ${damageReport}`
        }
      });

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
    return attachStudentIdToRequest(request);
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
    const request = await this.prisma.$transaction(async (tx) => {
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
      const flipped = await tx.equipment.updateMany({
        where: { id: request.equipmentId, status: "AVAILABLE" },
        data: {
          status: "BORROWED",
          conditionNotes: `Approved borrow for ${request.classroom || request.purpose}`
        }
      });
      if (flipped.count === 0) {
        const error = new Error("Equipment is no longer available to approve");
        error.status = 409;
        throw error;
      }
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "BORROWED",
          approvedById: userId
        },
        include: { equipment: true, lecturer: true }
      });
    });
    return attachStudentIdToRequest(request);
  }

  async denyRequest(id, userId) {
    const request = await this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id } });
      if (!request) {
        const error = new Error("Request not found");
        error.status = 404;
        throw error;
      }
      if (!["REQUESTED", "BORROWED"].includes(request.status)) {
        const error = new Error("Only pending or active requests can be denied");
        error.status = 409;
        throw error;
      }
      if (request.status === "BORROWED") {
        await tx.equipment.update({
          where: { id: request.equipmentId },
          data: {
            status: "AVAILABLE",
            conditionNotes: "Borrow request denied"
          }
        });
      }
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          deniedById: userId
        },
        include: { equipment: true, lecturer: true }
      });
    });
    return attachStudentIdToRequest(request);
  }

  async extendRequest(id, input = {}) {
    const newDueInput = toValidDate(input.dueAt);
    const request = await this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id } });
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
      const newDue = newDueInput ?? new Date(currentDue.getTime() + 7 * 24 * 60 * 60 * 1000);
      return tx.borrowRequest.update({
        where: { id },
        data: {
          dueAt: newDue
        },
        include: { equipment: true, lecturer: true }
      });
    });
    return attachStudentIdToRequest(request);
  }

  async listAllHistory(query = {}) {
    const { page, limit } = parsePageLimit(query);
    const skip = (page - 1) * limit;

    const where = {};
    if (query.userId) {
      where.lecturerId = Number(query.userId);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.purpose) {
      where.purpose = query.purpose;
    }
    if (query.search) {
      where.OR = [
        { classroom: { contains: query.search } },
        { unitOrProject: { contains: query.search } },
        { equipment: { name: { contains: query.search } } },
        { lecturer: { name: { contains: query.search } } }
      ];
    }

    const { sortBy, sortOrder } = normalizeSort(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.borrowRequest.findMany({
        where,
        include: { equipment: true, lecturer: true },
        orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
        skip,
        take: limit
      }),
      this.prisma.borrowRequest.count({ where })
    ]);

    return {
      data: data.map(attachStudentIdToRequest),
      total,
      page,
      limit
    };
  }

  async editRequest(id, input = {}, actor = null) {
    const request = await this.prisma.borrowRequest.findUnique({ where: { id }, include: { lecturer: true } });
    if (!request) {
      const error = new Error("Request not found");
      error.status = 404;
      throw error;
    }
    if (!["REQUESTED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending or active borrowings can be edited");
      error.status = 409;
      throw error;
    }
    const ownerIsStudent = request.lecturer?.role === "STUDENT";
    if (actor && actor.id === request.lecturerId && ownerIsStudent && request.status !== "REQUESTED" && input.isExtendMode) {
      if (input.dueAt) {
        const origStart = request.startDate ?? request.createdAt;
        const origDay = new Date(origStart).toDateString();
        const newDay = new Date(input.dueAt).toDateString();
        if (origDay !== newDay) {
          const error = new Error("Extension is only allowed within the same day.");
          error.status = 400;
          throw error;
        }
      }
      const disallowed = ["classroom", "purpose", "program", "unitOrProject", "quantity", "recurrence"];
      for (const k of disallowed) {
        if (input[k] !== undefined && input[k] !== request[k]) {
          const error = new Error("After approval you can only extend the due date.");
          error.status = 409;
          throw error;
        }
      }
    }
    const data = buildEditData(input, { toDate: (value) => new Date(value) });
    const nextPurpose = data.purpose ?? request.purpose;
    if (request.lecturer?.role === "EVENT_STAFF" && nextPurpose !== "EVENT") {
      const error = new Error("Event staff can only borrow equipment for event support");
      error.status = 400;
      throw error;
    }
    const updated = await this.prisma.borrowRequest.update({
      where: { id },
      data,
      include: { equipment: true, lecturer: true }
    });
    return attachStudentIdToRequest(updated);
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
    const updated = await this.prisma.borrowRequest.update({
      where: { id },
      data: { custodyLog: JSON.stringify(log) },
      include: { equipment: true, lecturer: true }
    });
    return attachStudentIdToRequest(updated);
  }

  async getEquipmentSchedule(equipmentId) {
    const item = await this.prisma.equipment.findUnique({ where: { id: equipmentId } });
    if (!item) {
      const error = new Error("Equipment not found");
      error.status = 404;
      throw error;
    }
    const requests = await this.prisma.borrowRequest.findMany({
      where: { equipmentId, status: { in: ["REQUESTED", "BORROWED"] } },
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

  async listUnitsForUser(user) {
    if (!user) {
      return [];
    }
    if (user.role === "STUDENT") {
      return this.prisma.unit.findMany({
        where: { enrollments: { some: { studentId: user.id } } },
        orderBy: { code: "asc" }
      });
    }
    if (user.role === "LECTURER") {
      return this.prisma.unit.findMany({ where: { lecturerId: user.id }, orderBy: { code: "asc" } });
    }
    return this.prisma.unit.findMany({ orderBy: { code: "asc" } });
  }

  async listProjectsForUser(user) {
    if (!user) {
      return [];
    }
    let projects;
    if (user.role === "STUDENT") {
      projects = await this.prisma.researchProject.findMany({
        where: { members: { some: { studentId: user.id } } },
        include: { members: true },
        orderBy: { id: "asc" }
      });
    } else if (user.role === "LECTURER") {
      projects = await this.prisma.researchProject.findMany({
        where: { lecturerId: user.id },
        include: { members: true },
        orderBy: { id: "asc" }
      });
    } else {
      projects = await this.prisma.researchProject.findMany({
        include: { members: true },
        orderBy: { id: "asc" }
      });
    }
    return projects.map(({ members, ...rest }) => ({ ...rest, memberIds: members.map((member) => member.studentId) }));
  }

  async lecturerTeachesStudent(lecturerId, studentId) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, unit: { is: { lecturerId } } }
    });
    return Boolean(enrollment);
  }

  async getUser(id) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return attachStudentIdToUser(user);
  }

  async getRequest(id) {
    const request = await this.prisma.borrowRequest.findUnique({
      where: { id },
      include: { equipment: true, lecturer: true }
    });
    return attachStudentIdToRequest(request);
  }

  async createEquipment(input) {
    return this.prisma.equipment.create({
      data: {
        assetCode: input.assetCode,
        name: input.name,
        category: input.category,
        location: input.location,
        status: input.status ?? "AVAILABLE",
        conditionNotes: input.conditionNotes ?? null
      }
    });
  }

  async updateEquipment(id, input) {
    const data = {};
    for (const key of ["assetCode", "name", "category", "location", "status", "conditionNotes"]) {
      if (input[key] !== undefined) {
        data[key] = input[key];
      }
    }
    return this.prisma.equipment.update({ where: { id }, data });
  }

  async listAllUsers() {
    const users = await this.prisma.user.findMany({ orderBy: { id: "asc" } });
    return users.map(attachStudentIdToUser);
  }

  async updateUserRole(id, role) {
    const user = await this.prisma.user.update({ where: { id }, data: { role } });
    return attachStudentIdToUser(user);
  }

  async summary() {
    const [totalEquipment, available, borrowed, maintenance, activeRequests] = await Promise.all([
      this.prisma.equipment.count(),
      this.prisma.equipment.count({ where: { status: "AVAILABLE" } }),
      this.prisma.equipment.count({ where: { status: "BORROWED" } }),
      this.prisma.equipment.count({ where: { status: "MAINTENANCE" } }),
      this.prisma.borrowRequest.count({ where: { status: { notIn: ["RETURNED", "CANCELLED"] } } })
    ]);
    return {
      totalEquipment,
      available,
      borrowed,
      maintenance,
      activeRequests,
      nextMeeting: "29/5 Sprint 1 demo"
    };
  }

  async sprintPlan() {
    return sprintPlan;
  }
}

export function createRepository() {
  if (process.env.DATABASE_URL && process.env.USE_DEMO_STORE !== "true") {
    return new PrismaRepository();
  }
  return new DemoRepository();
}
