import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createRepository } from "./repository.js";
import { sendNotification, listNotifications } from "./notifications.js";

const app = express();
const repository = createRepository();
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(serverDir, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDist, "index.html"));

const jwtSecret = process.env.JWT_SECRET || "fallback-swinburne-secret-key-998877";

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

if (hasClientBuild) {
  app.use(express.static(clientDist));
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const borrowSchema = z.object({
  equipmentId: z.number().int().positive(),
  lecturerId: z.number().int().positive().optional(),
  classroom: z.string().max(40).optional().nullable(),
  dueAt: z.string().datetime(),
  handoverNotes: z.string().max(240).optional().nullable(),
  purpose: z.enum(["CLASSROOM", "LAB", "RESEARCH", "EVENT"]).optional(),
  program: z.string().max(100).optional().nullable(),
  unitOrProject: z.string().max(100).optional().nullable(),
  quantity: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional().nullable(),
  recurrence: z.string().max(50).optional().nullable()
});

const editSchema = z.object({
  classroom: z.string().max(40).optional().nullable(),
  dueAt: z.string().datetime().optional(),
  handoverNotes: z.string().max(240).optional().nullable(),
  purpose: z.enum(["CLASSROOM", "LAB", "RESEARCH", "EVENT"]).optional(),
  program: z.string().max(100).optional().nullable(),
  unitOrProject: z.string().max(100).optional().nullable(),
  quantity: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional().nullable(),
  recurrence: z.string().max(50).optional().nullable()
});

const custodySchema = z.object({
  action: z.string().max(40).optional(),
  actor: z.string().max(120).optional(),
  notes: z.string().max(240).optional().nullable()
});

const statusSchema = z.object({
  status: z.enum(["AVAILABLE", "BORROWED", "MAINTENANCE", "RETIRED"]),
  conditionNotes: z.string().min(2).max(240)
});

const equipmentSchema = z.object({
  assetCode: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  location: z.string().min(2).max(50),
  status: z.enum(["AVAILABLE", "BORROWED", "MAINTENANCE", "RETIRED"]).optional(),
  conditionNotes: z.string().max(240).optional().nullable()
});

const userRoleSchema = z.object({
  role: z.enum(["STUDENT", "LECTURER", "SUPPORT", "ADMIN", "OPERATIONS", "EVENT_STAFF"]),
  lecturerId: z.number().int().nullable().optional()
});

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Chức năng này chỉ dành cho quản trị viên (ADMIN)." });
  }
  next();
}

function route(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

// Google OAuth verification helper
async function verifyGoogleToken(accessToken) {
  const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
  if (!response.ok) {
    const err = new Error("Xác thực tài khoản Google thất bại.");
    err.status = 401;
    throw err;
  }
  const info = await response.json();
  if (!info.email) {
    const err = new Error("Không thể truy xuất email từ Google.");
    err.status = 400;
    throw err;
  }
  return info.email;
}

// JWT verification middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Yêu cầu mã xác thực đăng nhập để thực hiện tác vụ này." });
  }

  try {
    const user = jwt.verify(token, jwtSecret);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại." });
  }
}

// ==========================================
// PUBLIC API ROUTES
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({ ok: true, store: process.env.DATABASE_URL ? "mysql-prisma" : "demo" });
});

app.get("/", (req, res) => {
  if (hasClientBuild) {
    res.sendFile(path.join(clientDist, "index.html"));
    return;
  }
  res.redirect(302, clientOrigin);
});

// Developer/Demo credentials login (Simulated chooser fallback)
app.post(
  "/api/auth/login",
  route(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    if (!payload.email.toLowerCase().endsWith("@fpt.edu.vn")) {
      return res.status(400).json({ message: "Chỉ cho phép đăng nhập bằng tài khoản FPT (@fpt.edu.vn)" });
    }
    const result = await repository.login(payload.email);
    
    // Sign a real secure JWT token containing the user details
    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, role: result.user.role },
      jwtSecret,
      { expiresIn: "7d" }
    );
    
    res.json({
      user: result.user,
      token
    });
  })
);

// Real Google OAuth 2.0 login
app.post(
  "/api/auth/google",
  route(async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Yêu cầu cung cấp Google access token." });
    }
    
    // Validate the Google Access Token and extract email
    const email = await verifyGoogleToken(accessToken);
    if (!email.toLowerCase().endsWith("@fpt.edu.vn")) {
      return res.status(400).json({ message: "Chỉ cho phép đăng nhập bằng tài khoản FPT (@fpt.edu.vn)" });
    }
    const result = await repository.login(email);
    
    // Sign secure JWT token
    const token = jwt.sign(
      { id: result.user.id, email: result.user.email, role: result.user.role },
      jwtSecret,
      { expiresIn: "7d" }
    );
    
    res.json({
      user: result.user,
      token
    });
  })
);

app.post("/api/auth/logout", (req, res) => {
  res.status(204).end();
});

// ==========================================
// PROTECTED API ROUTES (Require valid JWT)
// ==========================================
app.use("/api", authenticateToken);

function requireStaff(req, res, next) {
  if (!req.user || req.user.role === "STUDENT") {
    return res.status(403).json({ message: "Chức năng này chỉ dành cho cán bộ/giảng viên." });
  }
  next();
}

function loadOwnRequest(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const request = await repository.getRequest(Number(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu mượn." });
      }
      if (req.user.role === "STUDENT" && request.lecturerId !== req.user.id) {
        return res.status(403).json({ message: "Bạn chỉ có thể thao tác trên yêu cầu của chính mình." });
      }
      req.borrowRequest = request;
      next();
    })
    .catch(next);
}

function safeNotify(task) {
  Promise.resolve()
    .then(task)
    .catch((error) => console.error(`[notification] handler error: ${error.message}`));
}

async function notifyStaff(type, subject, message, meta) {
  const staff = await repository.listStaff();
  await sendNotification({ to: staff.map((member) => member.email), type, subject, message, meta });
}

function notifyBorrower(request, type, subject, message) {
  return sendNotification({ to: request.lecturer?.email, type, subject, message, meta: { requestId: request.id } });
}

const itemName = (request) => request.equipment?.name ?? "equipment";

app.get("/api/summary", route(async (req, res) => {
  res.json(await repository.summary());
}));

app.get("/api/equipment", route(async (req, res) => {
  res.json(await repository.listEquipment());
}));

app.get("/api/equipment/:id/schedule", route(async (req, res) => {
  res.json(await repository.getEquipmentSchedule(Number(req.params.id)));
}));

app.get("/api/borrow-requests", route(async (req, res) => {
  res.json(await repository.listActiveRequests());
}));

app.get("/api/notifications", route(async (req, res) => {
  res.json(listNotifications(Number(req.query.limit ?? 20)));
}));

app.get("/api/users/:id/borrow-history", route(async (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role === "STUDENT" && targetId !== req.user.id) {
    return res.status(403).json({ message: "Bạn chỉ có thể xem lịch sử của chính mình." });
  }
  res.json(await repository.listBorrowHistory(targetId));
}));

app.post("/api/borrow-requests", route(async (req, res) => {
  const assignOwner = (payload) => ({ ...payload, lecturerId: req.user.id });
  const announce = (created) =>
    safeNotify(() =>
      created.status === "REQUESTED"
        ? notifyStaff("BORROW_REQUEST", `New borrow request • ${itemName(created)}`, `${created.lecturer?.name ?? "A user"} requested ${itemName(created)} for ${created.purpose}. Classroom: ${created.classroom ?? "-"}. Needed until ${created.dueAt}.`, { requestId: created.id })
        : notifyStaff("EQUIPMENT_BORROWED", `Equipment borrowed • ${itemName(created)}`, `${created.lecturer?.name ?? "A user"} borrowed ${itemName(created)} (${created.purpose}). Due ${created.dueAt}.`, { requestId: created.id })
    );

  if (Array.isArray(req.body)) {
    const payloads = z.array(borrowSchema).parse(req.body);
    const results = [];
    for (const payload of payloads) {
      const created = await repository.borrowEquipment(assignOwner(payload));
      results.push(created);
      announce(created);
    }
    res.status(201).json(results);
  } else {
    const payload = borrowSchema.parse(req.body);
    const created = await repository.borrowEquipment(assignOwner(payload));
    announce(created);
    res.status(201).json(created);
  }
}));

app.patch("/api/borrow-requests/:id", loadOwnRequest, route(async (req, res) => {
  const payload = editSchema.parse(req.body);
  res.json(await repository.editRequest(Number(req.params.id), payload));
}));

app.post("/api/borrow-requests/:id/approve", requireStaff, route(async (req, res) => {
  const updated = await repository.approveRequest(Number(req.params.id), req.user.id);
  safeNotify(() => notifyBorrower(updated, "REQUEST_APPROVED", `Request approved • ${itemName(updated)}`, `Your borrow request for ${itemName(updated)} was approved. Due ${updated.dueAt}.`));
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/deny", requireStaff, route(async (req, res) => {
  const updated = await repository.denyRequest(Number(req.params.id), req.user.id);
  safeNotify(() => notifyBorrower(updated, "REQUEST_DENIED", `Request denied • ${itemName(updated)}`, `Your borrow request for ${itemName(updated)} was denied.`));
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/extend", loadOwnRequest, route(async (req, res) => {
  const updated = await repository.extendRequest(Number(req.params.id), req.body);
  safeNotify(async () => {
    await notifyBorrower(updated, "BORROW_EXTENDED", `Borrow extended • ${itemName(updated)}`, `The borrow for ${itemName(updated)} was extended. New due date ${updated.dueAt}.`);
    await notifyStaff("EXTENSION_REQUEST", `Extension recorded • ${itemName(updated)}`, `${updated.lecturer?.name ?? "A user"} extended ${itemName(updated)} to ${updated.dueAt}.`, { requestId: updated.id });
  });
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/custody", loadOwnRequest, route(async (req, res) => {
  const payload = custodySchema.parse(req.body);
  res.json(await repository.addCustody(Number(req.params.id), { ...payload, actor: payload.actor ?? req.user.email }));
}));

app.post("/api/borrow-requests/:id/remind", requireStaff, route(async (req, res) => {
  const request = await repository.getRequest(Number(req.params.id));
  if (!request) {
    return res.status(404).json({ message: "Không tìm thấy yêu cầu mượn." });
  }
  await sendNotification({
    to: request.lecturer?.email,
    type: "OVERDUE_REMINDER",
    subject: `Reminder • return ${itemName(request)}`,
    message: `Please return ${itemName(request)} (due ${request.dueAt}) as soon as possible.`,
    meta: { requestId: request.id }
  });
  res.json({ success: true, message: "Email reminder sent successfully." });
}));

app.get("/api/borrow-history", route(async (req, res) => {
  const query = { ...req.query };
  if (req.user.role === "STUDENT") {
    query.userId = req.user.id;
  }
  res.json(await repository.listAllHistory(query));
}));

app.post("/api/borrow-requests/:id/return", loadOwnRequest, route(async (req, res) => {
  const updated = await repository.confirmReturn(Number(req.params.id), { ...req.body, actorName: req.user.email });
  safeNotify(() => notifyBorrower(updated, "EQUIPMENT_RETURNED", `Return confirmed • ${itemName(updated)}`, `Return of ${itemName(updated)} has been confirmed.`));
  res.json(updated);
}));

app.patch("/api/equipment/:id/status", requireStaff, route(async (req, res) => {
  const payload = statusSchema.parse(req.body);
  res.json(await repository.updateEquipmentStatus(Number(req.params.id), payload));
}));

app.get("/api/users", requireAdmin, route(async (req, res) => {
  res.json(await repository.listAllUsers());
}));

app.put("/api/users/:id/role", requireAdmin, route(async (req, res) => {
  const payload = userRoleSchema.parse(req.body);
  res.json(await repository.updateUserRole(Number(req.params.id), payload.role, payload.lecturerId));
}));

app.post("/api/equipment", requireAdmin, route(async (req, res) => {
  const payload = equipmentSchema.parse(req.body);
  res.status(201).json(await repository.createEquipment(payload));
}));

app.put("/api/equipment/:id", requireAdmin, route(async (req, res) => {
  const payload = equipmentSchema.parse(req.body);
  res.json(await repository.updateEquipment(Number(req.params.id), payload));
}));

app.get("/api/sprints", route(async (req, res) => {
  res.json(await repository.sprintPlan());
}));

// Fallback for spa routing
app.get(/^\/(?!api\/).*/, (req, res) => {
  if (hasClientBuild) {
    res.sendFile(path.join(clientDist, "index.html"));
    return;
  }
  res.redirect(302, clientOrigin);
});

app.use((error, req, res, next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Yêu cầu không hợp lệ", issues: error.issues });
    return;
  }
  res.status(error.status ?? 500).json({ message: error.message ?? "Lỗi máy chủ ngoài dự kiến" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
