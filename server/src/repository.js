import { PrismaClient } from "@prisma/client";

const users = [
  { id: 1, name: "Dr Minh Nguyen", email: "lecturer@swin.edu.au", role: "LECTURER" },
  { id: 2, name: "Support Desk", email: "support@swin.edu.au", role: "SUPPORT" },
  { id: 3, name: "Admin Office", email: "admin@swin.edu.au", role: "ADMIN" }
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
    updatedAt: new Date("2026-05-27T09:10:00.000Z").toISOString()
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
    return equipment;
  }

  async listActiveRequests() {
    return borrowRequests
      .filter((request) => request.status !== "RETURNED")
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .map(attachEquipment);
  }

  async borrowEquipment(input) {
    const item = equipment.find((candidate) => candidate.id === input.equipmentId);
    if (!item || item.status !== "AVAILABLE") {
      const error = new Error("Equipment is not available");
      error.status = 409;
      throw error;
    }
    item.status = "BORROWED";
    item.conditionNotes = `Borrowed for ${input.classroom}`;
    item.updatedAt = new Date().toISOString();
    const request = {
      id: nextId(borrowRequests),
      equipmentId: item.id,
      lecturerId: input.lecturerId,
      classroom: input.classroom,
      dueAt: new Date(input.dueAt).toISOString(),
      returnedAt: null,
      status: "BORROWED",
      handoverNotes: input.handoverNotes ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    borrowRequests.push(request);
    return attachEquipment(request);
  }

  async confirmReturn(id) {
    const request = borrowRequests.find((candidate) => candidate.id === id);
    if (!request || request.status === "RETURNED") {
      const error = new Error("Borrow request cannot be returned");
      error.status = 404;
      throw error;
    }
    const item = equipment.find((candidate) => candidate.id === request.equipmentId);
    request.status = "RETURNED";
    request.returnedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();
    item.status = "AVAILABLE";
    item.conditionNotes = "Returned and confirmed by lecturer";
    item.updatedAt = new Date().toISOString();
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
      activeRequests: borrowRequests.filter((request) => request.status !== "RETURNED").length,
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
    return this.prisma.equipment.findMany({ orderBy: { assetCode: "asc" } });
  }

  async listActiveRequests() {
    return this.prisma.borrowRequest.findMany({
      where: { status: { not: "RETURNED" } },
      include: { equipment: true, lecturer: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async borrowEquipment(input) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.equipment.findUnique({ where: { id: input.equipmentId } });
      if (!item || item.status !== "AVAILABLE") {
        const error = new Error("Equipment is not available");
        error.status = 409;
        throw error;
      }
      await tx.equipment.update({
        where: { id: input.equipmentId },
        data: {
          status: "BORROWED",
          conditionNotes: `Borrowed for ${input.classroom}`
        }
      });
      return tx.borrowRequest.create({
        data: {
          equipmentId: input.equipmentId,
          lecturerId: input.lecturerId,
          classroom: input.classroom,
          dueAt: new Date(input.dueAt),
          status: "BORROWED",
          handoverNotes: input.handoverNotes ?? ""
        },
        include: { equipment: true, lecturer: true }
      });
    });
  }

  async confirmReturn(id) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.borrowRequest.findUnique({ where: { id }, include: { equipment: true } });
      if (!request || request.status === "RETURNED") {
        const error = new Error("Borrow request cannot be returned");
        error.status = 404;
        throw error;
      }
      await tx.equipment.update({
        where: { id: request.equipmentId },
        data: {
          status: "AVAILABLE",
          conditionNotes: "Returned and confirmed by lecturer"
        }
      });
      return tx.borrowRequest.update({
        where: { id },
        data: {
          status: "RETURNED",
          returnedAt: new Date()
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

  async summary() {
    const [totalEquipment, available, borrowed, maintenance, activeRequests] = await Promise.all([
      this.prisma.equipment.count(),
      this.prisma.equipment.count({ where: { status: "AVAILABLE" } }),
      this.prisma.equipment.count({ where: { status: "BORROWED" } }),
      this.prisma.equipment.count({ where: { status: "MAINTENANCE" } }),
      this.prisma.borrowRequest.count({ where: { status: { not: "RETURNED" } } })
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
