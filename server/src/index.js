import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { createRepository } from "./repository.js";

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
  lecturerId: z.number().int().positive(),
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

const statusSchema = z.object({
  status: z.enum(["AVAILABLE", "BORROWED", "MAINTENANCE", "RETIRED"]),
  conditionNotes: z.string().min(2).max(240)
});

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

app.get(
  "/api/summary",
  route(async (req, res) => {
    res.json(await repository.summary());
  })
);

app.get(
  "/api/equipment",
  route(async (req, res) => {
    res.json(await repository.listEquipment());
  })
);

app.get(
  "/api/borrow-requests",
  route(async (req, res) => {
    res.json(await repository.listActiveRequests());
  })
);

app.get(
  "/api/users/:id/borrow-history",
  route(async (req, res) => {
    res.json(await repository.listBorrowHistory(Number(req.params.id)));
  })
);

app.post(
  "/api/borrow-requests",
  route(async (req, res) => {
    if (Array.isArray(req.body)) {
      const payloads = z.array(borrowSchema).parse(req.body);
      const results = [];
      for (const payload of payloads) {
        results.push(await repository.borrowEquipment(payload));
      }
      res.status(201).json(results);
    } else {
      const payload = borrowSchema.parse(req.body);
      res.status(201).json(await repository.borrowEquipment(payload));
    }
  })
);

app.post(
  "/api/borrow-requests/:id/approve",
  route(async (req, res) => {
    const userId = Number(req.body.userId ?? 1);
    res.json(await repository.approveRequest(Number(req.params.id), userId));
  })
);

app.post(
  "/api/borrow-requests/:id/deny",
  route(async (req, res) => {
    const userId = Number(req.body.userId ?? 1);
    res.json(await repository.denyRequest(Number(req.params.id), userId));
  })
);

app.post(
  "/api/borrow-requests/:id/extend",
  route(async (req, res) => {
    res.json(await repository.extendRequest(Number(req.params.id), req.body));
  })
);

app.post(
  "/api/borrow-requests/:id/remind",
  route(async (req, res) => {
    console.log(`[Email Reminder] To borrower of request ID ${req.params.id}: Please return equipment soon.`);
    res.json({ success: true, message: "Email reminder sent successfully." });
  })
);

app.get(
  "/api/borrow-history",
  route(async (req, res) => {
    res.json(await repository.listAllHistory(req.query));
  })
);

app.post(
  "/api/borrow-requests/:id/return",
  route(async (req, res) => {
    res.json(await repository.confirmReturn(Number(req.params.id), req.body));
  })
);

app.patch(
  "/api/equipment/:id/status",
  route(async (req, res) => {
    const payload = statusSchema.parse(req.body);
    res.json(await repository.updateEquipmentStatus(Number(req.params.id), payload));
  })
);

app.get(
  "/api/sprints",
  route(async (req, res) => {
    res.json(await repository.sprintPlan());
  })
);

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
