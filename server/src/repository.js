import { PrismaClient } from "@prisma/client";

const users = [
  { id: 1, name: "Minh Bùi Đăng", email: "buidangminh23@gmail.com", role: "LECTURER" },
  { id: 2, name: "minh anh", email: "taolaminhanh1@gmail.com", role: "SUPPORT" },
  { id: 3, name: "Đinh Dũng", email: "dindungwork@gmail.com", role: "ADMIN" },
  { id: 4, name: "Đăng Minh Bùi", email: "buidangminh.lh@gmail.com", role: "STUDENT" },
  { id: 5, name: "hihi", email: "hiheho911@gmail.com", role: "EVENT_STAFF" }
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

class DemoRepository {
  async login(email) {
    const user = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const error = new Error("Invalid login");
      error.status = 401;
      throw error;
    }
    return { user, token: `demo-token-${user.id}` };
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

    if (item.status !== "AVAILABLE" && !isStudent) {
      const error = new Error("Equipment is not available");
      error.status = 409;
      throw error;
    }

    const status = isStudent ? "REQUESTED" : "BORROWED";
    const purpose = input.purpose ?? "CLASSROOM";

    if (!isStudent) {
      item.status = "BORROWED";
      item.conditionNotes = `Borrowed for ${input.classroom || purpose}`;
      item.updatedAt = new Date().toISOString();
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

    const request = {
      id: nextId(borrowRequests),
      equipmentId: item.id,
      lecturerId: input.lecturerId,
      classroom: input.classroom ?? null,
      dueAt: new Date(input.dueAt).toISOString(),
      returnedAt: null,
      status,
      handoverNotes: input.handoverNotes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purpose,
      program: input.program ?? null,
      unitOrProject: input.unitOrProject ?? null,
      quantity: input.quantity ?? 1,
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
    if (input.actorId != null && input.actorId === request.lecturerId) {
      const error = new Error("A different staff member must confirm this return (separation of duties).");
      error.status = 403;
      throw error;
    }
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);

    request.status = "RETURNED";
    request.returnedQuantity = input.returnedQuantity ?? request.quantity;
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
    request.status = "CANCELLED";
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
    if (request.purpose !== "RESEARCH" && request.classroom !== "Vovinam Room" && request.lecturerId !== 8) {
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

    const sortField = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    list.sort((left, right) => {
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
    if (!["REQUESTED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending or active borrowings can be edited");
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

  async getUser(id) {
    return users.find((user) => user.id === id) ?? null;
  }

  async getRequest(id) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    return request ? attachEquipment(request) : null;
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
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      const error = new Error("Invalid login");
      error.status = 401;
      throw error;
    }
    return { user, token: `mysql-token-${user.id}` };
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

      if (item.status !== "AVAILABLE" && !isStudent) {
        const error = new Error("Equipment is not available");
        error.status = 409;
        throw error;
      }

      const status = isStudent ? "REQUESTED" : "BORROWED";
      const purpose = input.purpose ?? "CLASSROOM";

      if (!isStudent) {
        await tx.equipment.update({
          where: { id: input.equipmentId },
          data: {
            status: "BORROWED",
            conditionNotes: `Borrowed for ${input.classroom || purpose}`
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

      if (input.actorId != null && input.actorId === request.lecturerId) {
        const error = new Error("A different staff member must confirm this return (separation of duties).");
        error.status = 403;
        throw error;
      }

      const isStatusOk = input.isStatusOk !== false;
      const damageReport = input.damageReport ?? "";
      const returnedQuantity = input.returnedQuantity ?? request.quantity;

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
      const item = await tx.equipment.findUnique({ where: { id: request.equipmentId } });
      if (!item || item.status !== "AVAILABLE") {
        const error = new Error("Equipment is no longer available to approve");
        error.status = 409;
        throw error;
      }
      await tx.equipment.update({
        where: { id: request.equipmentId },
        data: {
          status: "BORROWED",
          conditionNotes: `Approved borrow for ${request.classroom || request.purpose}`
        }
      });
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "BORROWED",
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
    if (request.purpose !== "RESEARCH" && request.classroom !== "Vovinam Room" && request.lecturerId !== 8) {
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

    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";

    const [data, total] = await Promise.all([
      this.prisma.borrowRequest.findMany({
        where,
        include: { equipment: true, lecturer: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      this.prisma.borrowRequest.count({ where })
    ]);

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
    if (!["REQUESTED", "BORROWED"].includes(request.status)) {
      const error = new Error("Only pending or active borrowings can be edited");
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
