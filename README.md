# Swinburne Equipment Portal

Lecturer portal for classroom equipment borrowing and return workflows.

## Stack

- Frontend: Vue 3 + Vite running on Node.js
- Backend: Node.js + Express
- Database: MySQL with Prisma ORM
- Demo mode: in-memory repository when `DATABASE_URL` is not configured

## Sprint Plan

- Sprint 1: Classroom use, login/logout, view equipment, borrow equipment, confirm returns, update equipment status
- Sprint 2: Student requests, support handover, borrowing extensions, notifications
- Sprint 3: Inventory CRUD, user management, reporting, audit trail
- Sprint 4: Admin governance, role permissions, analytics, production hardening

Next meeting: 29/5, Sprint 1 demo.

## Run

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:4000`

Demo login:

- `lecturer@swin.edu.au`
- `student@swin.edu.au`
- any password

## MySQL + Prisma

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Set `DATABASE_URL` to a MySQL connection string before running migrations.
