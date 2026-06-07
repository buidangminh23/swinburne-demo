import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createRepository } from "./repository.js";

const app = express();
const repository = createRepository();
const port = Number(process.env.PORT ?? 4000);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173";
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(serverDir, "../../client/dist");
const hasClientBuild = fs.existsSync(path.join(clientDist, "index.html"));

app.use(cors({ origin: clientOrigin }));
app.use(express.json());

if (hasClientBuild) {
  app.use(express.static(clientDist));
}

const loginSchema = z.object({
  email: z.email(),
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

app.post(
  "/api/auth/login",
  route(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const result = await repository.login(payload.email);
    res.json(result);
  })
);

app.post("/api/auth/logout", (req, res) => {
  res.status(204).end();
});

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

app.get(/^\/(?!api\/).*/, (req, res) => {
  if (hasClientBuild) {
    res.sendFile(path.join(clientDist, "index.html"));
    return;
  }
  res.redirect(302, clientOrigin);
});

app.use((error, req, res, next) => {
  if (error instanceof z.ZodError) {
    res.status(400).json({ message: "Invalid request", issues: error.issues });
    return;
  }
  res.status(error.status ?? 500).json({ message: error.message ?? "Unexpected server error" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
