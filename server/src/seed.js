import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const lecturer = await prisma.user.upsert({
    where: { email: "buidangminh23@fpt.edu.vn" },
    update: { name: "Minh Bui Dang", role: "LECTURER" },
    create: {
      name: "Minh Bui Dang",
      email: "buidangminh23@fpt.edu.vn",
      role: "LECTURER"
    }
  });

  await prisma.user.upsert({
    where: { email: "taolaminhanh1@fpt.edu.vn" },
    update: { name: "Nguyen Minh Anh", role: "SUPPORT" },
    create: {
      name: "Nguyen Minh Anh",
      email: "taolaminhanh1@fpt.edu.vn",
      role: "SUPPORT"
    }
  });

  const student = await prisma.user.upsert({
    where: { email: "buidangminh.lh@fpt.edu.vn" },
    update: { name: "Dang Minh Bui", role: "STUDENT" },
    create: {
      name: "Dang Minh Bui",
      email: "buidangminh.lh@fpt.edu.vn",
      role: "STUDENT"
    }
  });

  await prisma.user.upsert({
    where: { email: "hiheho911@fpt.edu.vn" },
    update: { name: "Nguyen Hoang Hiep", role: "EVENT_STAFF" },
    create: {
      name: "Nguyen Hoang Hiep",
      email: "hiheho911@fpt.edu.vn",
      role: "EVENT_STAFF"
    }
  });

  await prisma.user.upsert({
    where: { email: "dindungwork@fpt.edu.vn" },
    update: { name: "Dinh Dung", role: "ADMIN" },
    create: {
      name: "Dinh Dung",
      email: "dindungwork@fpt.edu.vn",
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "operations@fpt.edu.vn" },
    update: { name: "Operations", role: "OPERATIONS" },
    create: {
      name: "Operations",
      email: "operations@fpt.edu.vn",
      role: "OPERATIONS"
    }
  });

  const secondLecturer = await prisma.user.upsert({
    where: { email: "lecturer2@fpt.edu.vn" },
    update: { name: "Le Hoang Nam", role: "LECTURER" },
    create: {
      name: "Le Hoang Nam",
      email: "lecturer2@fpt.edu.vn",
      role: "LECTURER"
    }
  });

  const secondStudent = await prisma.user.upsert({
    where: { email: "student2@fpt.edu.vn" },
    update: { name: "Nguyen Tuan Anh", role: "STUDENT" },
    create: {
      name: "Nguyen Tuan Anh",
      email: "student2@fpt.edu.vn",
      role: "STUDENT"
    }
  });

  const semester = await prisma.semester.upsert({
    where: { code: "2026-S1" },
    update: {
      name: "Semester 1 2026",
      startDate: new Date("2026-03-02"),
      endDate: new Date("2026-06-19")
    },
    create: {
      code: "2026-S1",
      name: "Semester 1 2026",
      startDate: new Date("2026-03-02"),
      endDate: new Date("2026-06-19")
    }
  });

  const unitSeeds = [
    { code: "COS20031", name: "Technical Software Development", lecturerId: lecturer.id, dayOfWeek: 1, startHour: 9, endHour: 11, classroom: "HN-DT-9.1" },
    { code: "COS30008", name: "Data Structures and Patterns", lecturerId: lecturer.id, dayOfWeek: 3, startHour: 13, endHour: 15, classroom: "HN-DT-9.2" },
    { code: "COS20007", name: "Object Oriented Programming", lecturerId: secondLecturer.id, dayOfWeek: 2, startHour: 10, endHour: 12, classroom: "HN-AT-6.25" }
  ];

  const unitsByCode = {};
  for (const unitSeed of unitSeeds) {
    const unit = await prisma.unit.upsert({
      where: { code: unitSeed.code },
      update: {
        name: unitSeed.name,
        semesterId: semester.id,
        lecturerId: unitSeed.lecturerId,
        dayOfWeek: unitSeed.dayOfWeek,
        startHour: unitSeed.startHour,
        endHour: unitSeed.endHour,
        classroom: unitSeed.classroom
      },
      create: {
        code: unitSeed.code,
        name: unitSeed.name,
        semesterId: semester.id,
        lecturerId: unitSeed.lecturerId,
        dayOfWeek: unitSeed.dayOfWeek,
        startHour: unitSeed.startHour,
        endHour: unitSeed.endHour,
        classroom: unitSeed.classroom
      }
    });
    unitsByCode[unitSeed.code] = unit;
  }

  const enrollmentSeeds = [
    { studentId: student.id, unitId: unitsByCode.COS20031.id },
    { studentId: student.id, unitId: unitsByCode.COS30008.id },
    { studentId: secondStudent.id, unitId: unitsByCode.COS20031.id }
  ];

  for (const enrollmentSeed of enrollmentSeeds) {
    await prisma.enrollment.upsert({
      where: { studentId_unitId: { studentId: enrollmentSeed.studentId, unitId: enrollmentSeed.unitId } },
      update: {},
      create: enrollmentSeed
    });
  }

  const projectSeeds = [
    { name: "Data Science Capstone", lecturerId: lecturer.id, startDate: new Date("2026-03-09"), endDate: new Date("2026-06-12"), memberIds: [student.id, secondStudent.id] },
    { name: "Computer Vision Lab", lecturerId: secondLecturer.id, startDate: new Date("2026-03-09"), endDate: new Date("2026-06-12"), memberIds: [secondStudent.id] }
  ];

  for (const projectSeed of projectSeeds) {
    let project = await prisma.researchProject.findFirst({ where: { name: projectSeed.name } });
    if (!project) {
      project = await prisma.researchProject.create({
        data: {
          name: projectSeed.name,
          lecturerId: projectSeed.lecturerId,
          startDate: projectSeed.startDate,
          endDate: projectSeed.endDate
        }
      });
    }
    for (const memberId of projectSeed.memberIds) {
      await prisma.projectMember.upsert({
        where: { projectId_studentId: { projectId: project.id, studentId: memberId } },
        update: {},
        create: { projectId: project.id, studentId: memberId }
      });
    }
  }

  const items = [
    ["SW-EQ-1001", "Logitech Rally Camera Kit", "Video", "HN-AT-6.25", "AVAILABLE", "Ready for classroom recording"],
    ["SW-EQ-1002", "Wireless Presentation Clicker", "Teaching", "Library Desk", "BORROWED", "Borrowed for tutorial room HN-EN-4.02"],
    ["SW-EQ-1003", "Portable Projector", "Display", "HN-BA-7.01", "MAINTENANCE", "Lamp replacement required"],
    ["SW-EQ-1004", "HDMI Capture Adapter", "Video", "HN-AT-6.28", "AVAILABLE", "Checked by support staff"],
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
        classroom: "HN-EN-4.02",
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
        classroom: "HN-AT-6.25",
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
