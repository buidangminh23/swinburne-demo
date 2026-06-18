import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { createRepository } from "./repository.js";
import { sendNotification, listNotifications, markNotificationRead } from "./notifications.js";

const app = express();
const repository = createRepository();
const port = Number(process.env.PORT ?? 4000);
const clientOrigins = (process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173,http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const primaryClientOrigin = clientOrigins[0];
const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "";
const allowedEmailDomain = process.env.ALLOWED_EMAIL_DOMAIN ?? "";
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(serverDir, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDist, "index.html"));

function resolveJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production. Refusing to start with an insecure default.");
  }
  console.warn("[security] JWT_SECRET is not set; using a random ephemeral secret. Tokens will not survive a restart. Set JWT_SECRET in your .env for stable sessions.");
  return crypto.randomBytes(48).toString("hex");
}

const jwtSecret = resolveJwtSecret();
const demoLoginPassword = process.env.DEMO_LOGIN_PASSWORD ?? "demo";
const credentialLoginEnabled = process.env.NODE_ENV !== "production";

app.use(cors({ origin: clientOrigins }));
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
  recurrence: z.string().max(50).optional().nullable(),
  unitId: z.number().int().positive().optional().nullable(),
  researchProjectId: z.number().int().positive().optional().nullable()
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
  recurrence: z.string().max(50).optional().nullable(),
  unitId: z.number().int().positive().optional().nullable(),
  researchProjectId: z.number().int().positive().optional().nullable()
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

const equipmentCreateSchema = z.object({
  assetCode: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(60),
  location: z.string().min(1).max(120),
  status: z.enum(["AVAILABLE", "BORROWED", "MAINTENANCE", "RETIRED"]).optional(),
  conditionNotes: z.string().max(240).optional().nullable()
});

const equipmentUpdateSchema = z.object({
  assetCode: z.string().min(1).max(40).optional(),
  name: z.string().min(1).max(120).optional(),
  category: z.string().min(1).max(60).optional(),
  location: z.string().min(1).max(120).optional(),
  status: z.enum(["AVAILABLE", "BORROWED", "MAINTENANCE", "RETIRED"]).optional(),
  conditionNotes: z.string().max(240).optional().nullable()
});

const userRoleSchema = z.object({
  role: z.enum(["STUDENT", "LECTURER", "SUPPORT", "OPERATIONS", "ADMIN", "EVENT_STAFF"])
});

const returnSchema = z.object({
  returnedQuantity: z.number().int().min(0).optional(),
  isStatusOk: z.boolean().optional(),
  damageReport: z.string().max(240).optional().nullable()
});

const extendSchema = z.object({
  dueAt: z.string().datetime().optional()
});

const historyQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  status: z.enum(["REQUESTED", "RESERVED", "BORROWED", "RETURNED", "CANCELLED", "REJECTED"]).optional(),
  purpose: z.enum(["CLASSROOM", "LAB", "RESEARCH", "EVENT"]).optional(),
  search: z.string().max(120).optional(),
  sortBy: z.enum(["createdAt", "dueAt", "returnedAt", "updatedAt", "startDate"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional()
});

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error("Invalid id parameter");
    error.status = 400;
    throw error;
  }
  return id;
}

const formatDate = (value) => (value ? new Date(value).toISOString() : "-");

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
  if (googleClientId) {
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!tokenInfoResponse.ok) {
      const err = new Error("Google authentication failed.");
      err.status = 401;
      throw err;
    }
    const tokenInfo = await tokenInfoResponse.json();
    if (tokenInfo.aud !== googleClientId) {
      const err = new Error("Google token was not issued for this application.");
      err.status = 401;
      throw err;
    }
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const err = new Error("Google authentication failed.");
    err.status = 401;
    throw err;
  }
  const info = await response.json();
  if (!info.email) {
    const err = new Error("Unable to read email from Google account.");
    err.status = 400;
    throw err;
  }
  if (info.email_verified === false) {
    const err = new Error("Google email address is not verified.");
    err.status = 401;
    throw err;
  }
  if (allowedEmailDomain && !info.email.toLowerCase().endsWith(allowedEmailDomain.toLowerCase())) {
    const err = new Error("This email domain is not permitted to sign in.");
    err.status = 403;
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
  res.redirect(302, primaryClientOrigin);
});

// Developer/Demo credentials login (Simulated chooser fallback)
app.post(
  "/api/auth/login",
  route(async (req, res) => {
    if (!credentialLoginEnabled) {
      return res.status(403).json({ message: "Credential login is disabled in production. Please sign in with Google." });
    }
    const payload = loginSchema.parse(req.body);
    if (payload.password !== demoLoginPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const result = await repository.login(payload.email);

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

const CAPABILITIES = {
  STUDENT: [],
  LECTURER: ["APPROVE_REQUEST", "DENY_REQUEST", "CONFIRM_RETURN", "SEND_REMINDER"],
  EVENT_STAFF: ["APPROVE_REQUEST", "DENY_REQUEST", "CONFIRM_RETURN", "SEND_REMINDER"],
  SUPPORT: ["APPROVE_REQUEST", "DENY_REQUEST", "CONFIRM_RETURN", "SEND_REMINDER", "MANAGE_EQUIPMENT", "MANAGE_REQUEST", "VIEW_ANY_HISTORY"],
  OPERATIONS: ["APPROVE_REQUEST", "DENY_REQUEST", "CONFIRM_RETURN", "SEND_REMINDER", "MANAGE_EQUIPMENT", "MANAGE_REQUEST", "VIEW_ANY_HISTORY"],
  ADMIN: ["APPROVE_REQUEST", "DENY_REQUEST", "CONFIRM_RETURN", "SEND_REMINDER", "MANAGE_EQUIPMENT", "MANAGE_REQUEST", "VIEW_ANY_HISTORY", "MANAGE_USERS"]
};

function can(role, capability) {
  return (CAPABILITIES[role] ?? []).includes(capability);
}

function requireCapability(capability) {
  return (req, res, next) => {
    if (!req.user || !can(req.user.role, capability)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    next();
  };
}

function loadRequest(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const request = await repository.getRequest(parseId(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu mượn." });
      }
      req.borrowRequest = request;
      next();
    })
    .catch(next);
}

function loadOwnRequest(req, res, next) {
  Promise.resolve()
    .then(async () => {
      const request = await repository.getRequest(parseId(req.params.id));
      if (!request) {
        return res.status(404).json({ message: "Không tìm thấy yêu cầu mượn." });
      }
      const isOwner = request.lecturerId === req.user.id;
      if (!isOwner && !can(req.user.role, "MANAGE_REQUEST")) {
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
  res.json(await repository.getEquipmentSchedule(parseId(req.params.id)));
}));

app.get("/api/units", route(async (req, res) => {
  res.json(await repository.listUnitsForUser(req.user));
}));

app.get("/api/research-projects", route(async (req, res) => {
  res.json(await repository.listProjectsForUser(req.user));
}));

app.get("/api/borrow-requests", route(async (req, res) => {
  res.json(await repository.listActiveRequests());
}));

app.get("/api/notifications", route(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  res.json(
    listNotifications(limit, {
      recipient: req.user.email,
      type: req.query.type,
      status: req.query.status,
      search: req.query.search
    })
  );
}));

app.patch("/api/notifications/:id/read", route(async (req, res) => {
  const entry = markNotificationRead(parseId(req.params.id), req.user.email);
  if (!entry) {
    return res.status(404).json({ message: "Notification not found." });
  }
  res.json(entry);
}));

app.get("/api/users/:id/borrow-history", route(async (req, res) => {
  const targetId = parseId(req.params.id);
  if (targetId !== req.user.id && !can(req.user.role, "VIEW_ANY_HISTORY")) {
    return res.status(403).json({ message: "Bạn chỉ có thể xem lịch sử của chính mình." });
  }
  res.json(await repository.listBorrowHistory(targetId));
}));

app.post("/api/borrow-requests", route(async (req, res) => {
  const assignOwner = (payload) => ({ ...payload, lecturerId: req.user.id });
  const announce = (created) =>
    safeNotify(() =>
      created.status === "REQUESTED"
        ? notifyStaff("BORROW_REQUEST", `New borrow request • ${itemName(created)}`, `${created.lecturer?.name ?? "A user"} requested ${itemName(created)} for ${created.purpose}. Classroom: ${created.classroom ?? "-"}. Needed until ${formatDate(created.dueAt)}.`, { requestId: created.id })
        : notifyStaff("EQUIPMENT_BORROWED", `Equipment borrowed • ${itemName(created)}`, `${created.lecturer?.name ?? "A user"} borrowed ${itemName(created)} (${created.purpose}). Due ${formatDate(created.dueAt)}.`, { requestId: created.id })
    );

  if (Array.isArray(req.body)) {
    const payloads = z.array(borrowSchema).parse(req.body);
    const results = [];
    const errors = [];
    for (const payload of payloads) {
      try {
        const created = await repository.borrowEquipment(assignOwner(payload));
        results.push(created);
        announce(created);
      } catch (error) {
        errors.push({ equipmentId: payload.equipmentId, message: error.message });
      }
    }
    if (results.length === 0 && errors.length > 0) {
      const error = new Error(errors[0].message);
      error.status = 409;
      throw error;
    }
    if (errors.length > 0) {
      res.set("X-Partial-Errors", String(errors.length));
    }
    res.status(201).json(results);
  } else {
    const payload = borrowSchema.parse(req.body);
    const created = await repository.borrowEquipment(assignOwner(payload));
    announce(created);
    res.status(201).json(created);
  }
}));

app.patch("/api/borrow-requests/:id", loadRequest, route(async (req, res) => {
  const request = req.borrowRequest;
  const isOwner = request.lecturerId === req.user.id;
  const canManage = can(req.user.role, "MANAGE_REQUEST");
  let allowed = isOwner || canManage;
  if (!allowed && req.user.role === "LECTURER") {
    allowed = await repository.lecturerTeachesStudent(req.user.id, request.lecturerId);
  }
  if (!allowed) {
    return res.status(403).json({ message: "Bạn chỉ có thể thao tác trên yêu cầu của chính mình." });
  }
  const payload = editSchema.parse(req.body);
  res.json(await repository.editRequest(parseId(req.params.id), payload, { id: req.user.id, role: req.user.role }));
}));

app.post("/api/borrow-requests/:id/approve", requireCapability("APPROVE_REQUEST"), loadRequest, route(async (req, res) => {
  if (req.borrowRequest.lecturerId === req.user.id) {
    return res.status(403).json({ message: "You cannot approve your own borrow request (separation of duties)." });
  }
  const updated = await repository.approveRequest(parseId(req.params.id), req.user.id);
  safeNotify(() => notifyBorrower(updated, "REQUEST_APPROVED", `Request approved • ${itemName(updated)}`, `Your borrow request for ${itemName(updated)} was approved. Due ${formatDate(updated.dueAt)}.`));
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/deny", requireCapability("DENY_REQUEST"), route(async (req, res) => {
  const updated = await repository.denyRequest(parseId(req.params.id), req.user.id);
  safeNotify(() => notifyBorrower(updated, "REQUEST_DENIED", `Request denied • ${itemName(updated)}`, `Your borrow request for ${itemName(updated)} was denied.`));
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/extend", loadOwnRequest, route(async (req, res) => {
  const payload = extendSchema.parse(req.body);
  const updated = await repository.extendRequest(parseId(req.params.id), payload);
  safeNotify(async () => {
    await notifyBorrower(updated, "BORROW_EXTENDED", `Borrow extended • ${itemName(updated)}`, `The borrow for ${itemName(updated)} was extended. New due date ${formatDate(updated.dueAt)}.`);
    await notifyStaff("EXTENSION_REQUEST", `Extension recorded • ${itemName(updated)}`, `${updated.lecturer?.name ?? "A user"} extended ${itemName(updated)} to ${formatDate(updated.dueAt)}.`, { requestId: updated.id });
  });
  res.json(updated);
}));

app.post("/api/borrow-requests/:id/custody", loadOwnRequest, route(async (req, res) => {
  const payload = custodySchema.parse(req.body);
  res.json(await repository.addCustody(parseId(req.params.id), { ...payload, actor: payload.actor ?? req.user.email }));
}));

app.post("/api/borrow-requests/:id/remind", requireCapability("SEND_REMINDER"), route(async (req, res) => {
  const request = await repository.getRequest(parseId(req.params.id));
  if (!request) {
    return res.status(404).json({ message: "Không tìm thấy yêu cầu mượn." });
  }
  const result = await sendNotification({
    to: request.lecturer?.email,
    type: "OVERDUE_REMINDER",
    subject: `Reminder • return ${itemName(request)}`,
    message: `Please return ${itemName(request)} (due ${formatDate(request.dueAt)}) as soon as possible.`,
    meta: { requestId: request.id }
  });
  res.json({
    success: result.delivered,
    message: result.delivered
      ? "Reminder sent successfully."
      : "Reminder logged, but email delivery failed."
  });
}));

app.get("/api/borrow-history", route(async (req, res) => {
  const query = historyQuerySchema.parse(req.query);
  if (req.user.role === "STUDENT") {
    query.userId = req.user.id;
  }
  res.json(await repository.listAllHistory(query));
}));

app.post("/api/borrow-requests/:id/return", requireCapability("CONFIRM_RETURN"), loadRequest, route(async (req, res) => {
  if (req.borrowRequest.lecturerId === req.user.id) {
    return res.status(403).json({ message: "A different staff member must confirm this return (separation of duties)." });
  }
  const payload = returnSchema.parse(req.body);
  const updated = await repository.confirmReturn(parseId(req.params.id), { ...payload, actorId: req.user.id, actorName: req.user.email });
  safeNotify(() => notifyBorrower(updated, "EQUIPMENT_RETURNED", `Return confirmed • ${itemName(updated)}`, `Return of ${itemName(updated)} has been confirmed.`));
  res.json(updated);
}));

app.patch("/api/equipment/:id/status", requireCapability("MANAGE_EQUIPMENT"), route(async (req, res) => {
  const payload = statusSchema.parse(req.body);
  res.json(await repository.updateEquipmentStatus(parseId(req.params.id), payload));
}));

app.post("/api/equipment", requireCapability("MANAGE_EQUIPMENT"), route(async (req, res) => {
  const payload = equipmentCreateSchema.parse(req.body);
  res.status(201).json(await repository.createEquipment(payload));
}));

app.patch("/api/equipment/:id", requireCapability("MANAGE_EQUIPMENT"), route(async (req, res) => {
  const payload = equipmentUpdateSchema.parse(req.body);
  res.json(await repository.updateEquipment(parseId(req.params.id), payload));
}));

app.get("/api/users", requireCapability("MANAGE_USERS"), route(async (req, res) => {
  res.json(await repository.listAllUsers());
}));

app.patch("/api/users/:id/role", requireCapability("MANAGE_USERS"), route(async (req, res) => {
  const payload = userRoleSchema.parse(req.body);
  res.json(await repository.updateUserRole(parseId(req.params.id), payload.role));
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
  res.redirect(302, primaryClientOrigin);
});

app.use((error, req, res, next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Yêu cầu không hợp lệ", issues: error.issues });
    return;
  }
  if (error.status) {
    res.status(error.status).json({ message: error.message ?? "Request failed" });
    return;
  }
  console.error(`[error] ${req.method} ${req.path}:`, error);
  res.status(500).json({ message: "Lỗi máy chủ ngoài dự kiến" });
});

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

export { app };
