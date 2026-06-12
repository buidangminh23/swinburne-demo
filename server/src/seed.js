import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lecturer = await prisma.user.upsert({
    where: { email: "buidangminh23@fpt.edu.vn" },
    update: {},
    create: {
      name: "LECTURER",
      email: "buidangminh23@fpt.edu.vn",
      role: "LECTURER"
    }
  });

  await prisma.user.upsert({
    where: { email: "taolaminhanh1@fpt.edu.vn" },
    update: {},
    create: {
      name: "SUPPORT",
      email: "taolaminhanh1@fpt.edu.vn",
      role: "SUPPORT"
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "buidangminh.lh@fpt.edu.vn" },
    update: { lecturerId: lecturer.id },
    create: {
      name: "STUDENT",
      email: "buidangminh.lh@fpt.edu.vn",
      role: "STUDENT",
      lecturerId: lecturer.id
    }
  });

  await prisma.user.upsert({
    where: { email: "hiheho911@fpt.edu.vn" },
    update: {},
    create: {
      name: "EVENT_STAFF",
      email: "hiheho911@fpt.edu.vn",
      role: "EVENT_STAFF"
    }
  });

  await prisma.user.upsert({
    where: { email: "dindungwork@fpt.edu.vn" },
    update: {},
    create: {
      name: "ADMIN",
      email: "dindungwork@fpt.edu.vn",
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "linhnt89@fpt.edu.vn" },
    update: {},
    create: {
      name: "LECTURER",
      email: "linhnt89@fpt.edu.vn",
      role: "LECTURER"
    }
  });

  await prisma.user.upsert({
    where: { email: "linhnt89_fe@fpt.edu.vn" },
    update: {},
    create: {
      name: "SUPPORT",
      email: "linhnt89_fe@fpt.edu.vn",
      role: "SUPPORT"
    }
  });

  const items = [
    ["Logitech-LRC-001", "Logitech Rally Camera Kit", "Video", "HN-ATC-625", "AVAILABLE", "Ready for classroom recording"],
    ["Kensington-WPC-002", "Wireless Presentation Clicker", "Teaching", "HN-LIB-DESK", "BORROWED", "Borrowed for tutorial room HN-ATC-625"],
    ["Epson-PPR-003", "Portable Projector", "Display", "HN-BA-701", "MAINTENANCE", "Lamp replacement required"],
    ["Elgato-HCA-004", "HDMI Capture Adapter", "Video", "HN-ATC-628", "AVAILABLE", "Checked by support staff"],
    ["Sennheiser-LMS-005", "Lapel Microphone Set", "Audio", "HN-MED-DESK", "AVAILABLE", "Batteries replaced"]
  ];

  for (const [assetCode, name, category, location, status, conditionNotes] of items) {
    await prisma.equipment.upsert({
      where: { assetCode },
      update: { name, category, location, status, conditionNotes },
      create: { assetCode, name, category, location, status, conditionNotes }
    });
  }

  const clicker = await prisma.equipment.findUnique({ where: { assetCode: "Kensington-WPC-002" } });
  const existing = await prisma.borrowRequest.findFirst({
    where: { equipmentId: clicker.id, status: "BORROWED" }
  });

  if (!existing) {
    await prisma.borrowRequest.create({
      data: {
        equipmentId: clicker.id,
        lecturerId: lecturer.id,
        classroom: "HN-ATC-625",
        dueAt: new Date("2026-05-29T10:30:00.000Z"),
        status: "BORROWED",
        handoverNotes: "Collected by lecturer for morning tutorial"
      }
    });
  }

  const adapter = await prisma.equipment.findUnique({ where: { assetCode: "Elgato-HCA-004" } });
  const existingHistory = await prisma.borrowRequest.findFirst({
    where: { equipmentId: adapter.id, lecturerId: student.id, status: "RETURNED" }
  });

  if (!existingHistory) {
    await prisma.borrowRequest.create({
      data: {
        equipmentId: adapter.id,
        lecturerId: student.id,
        classroom: "HN-ATC-625",
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
