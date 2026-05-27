import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lecturer = await prisma.user.upsert({
    where: { email: "lecturer@swin.edu.au" },
    update: {},
    create: {
      name: "Dr Minh Nguyen",
      email: "lecturer@swin.edu.au",
      role: "LECTURER"
    }
  });

  await prisma.user.upsert({
    where: { email: "support@swin.edu.au" },
    update: {},
    create: {
      name: "Support Desk",
      email: "support@swin.edu.au",
      role: "SUPPORT"
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "student@swin.edu.au" },
    update: {},
    create: {
      name: "Bui Dang Minh",
      email: "student@swin.edu.au",
      role: "STUDENT"
    }
  });

  const items = [
    ["SW-EQ-1001", "Logitech Rally Camera Kit", "Video", "ATC 625", "AVAILABLE", "Ready for classroom recording"],
    ["SW-EQ-1002", "Wireless Presentation Clicker", "Teaching", "Library Desk", "BORROWED", "Borrowed for tutorial room EN402"],
    ["SW-EQ-1003", "Portable Projector", "Display", "Room BA701", "MAINTENANCE", "Lamp replacement required"],
    ["SW-EQ-1004", "HDMI Capture Adapter", "Video", "ATC 628", "AVAILABLE", "Checked by support staff"],
    ["SW-EQ-1005", "Lapel Microphone Set", "Audio", "Media Counter", "AVAILABLE", "Batteries replaced"]
  ];

  for (const [assetCode, name, category, location, status, conditionNotes] of items) {
    await prisma.equipment.upsert({
      where: { assetCode },
      update: { name, category, location, status, conditionNotes },
      create: { assetCode, name, category, location, status, conditionNotes }
    });
  }

  const clicker = await prisma.equipment.findUnique({ where: { assetCode: "SW-EQ-1002" } });
  const existing = await prisma.borrowRequest.findFirst({
    where: { equipmentId: clicker.id, status: "BORROWED" }
  });

  if (!existing) {
    await prisma.borrowRequest.create({
      data: {
        equipmentId: clicker.id,
        lecturerId: lecturer.id,
        classroom: "EN402",
        dueAt: new Date("2026-05-29T10:30:00.000Z"),
        status: "BORROWED",
        handoverNotes: "Collected by lecturer for morning tutorial"
      }
    });
  }

  const adapter = await prisma.equipment.findUnique({ where: { assetCode: "SW-EQ-1004" } });
  const existingHistory = await prisma.borrowRequest.findFirst({
    where: { equipmentId: adapter.id, lecturerId: student.id, status: "RETURNED" }
  });

  if (!existingHistory) {
    await prisma.borrowRequest.create({
      data: {
        equipmentId: adapter.id,
        lecturerId: student.id,
        classroom: "ATC 625",
        dueAt: new Date("2026-05-26T10:30:00.000Z"),
        returnedAt: new Date("2026-05-26T10:05:00.000Z"),
        status: "RETURNED",
        handoverNotes: "Used for data science workshop recording"
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
