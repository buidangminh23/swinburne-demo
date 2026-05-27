import "dotenv/config";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { createRepository } from "./repository.js";

const app = express();
const repository = createRepository();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

const borrowSchema = z.object({
  equipmentId: z.number().int().positive(),
  lecturerId: z.number().int().positive(),
  classroom: z.string().min(2).max(40),
  dueAt: z.string().datetime(),
  handoverNotes: z.string().max(240).optional()
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

app.post(
  "/api/borrow-requests",
  route(async (req, res) => {
    const payload = borrowSchema.parse(req.body);
    res.status(201).json(await repository.borrowEquipment(payload));
  })
);

app.post(
  "/api/borrow-requests/:id/return",
  route(async (req, res) => {
    res.json(await repository.confirmReturn(Number(req.params.id)));
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

