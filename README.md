# Swinburne Equipment Portal

Web portal quản lý mượn và trả thiết bị lớp học cho demo Sprint 1.

## Tech Stack

- Frontend: Vue 3 + Vite chạy trên Node.js
- Backend: Node.js + Express
- Database: MySQL
- ORM: Prisma
- Demo mode: dùng in-memory data khi chưa cấu hình `DATABASE_URL`

## Web Hoạt Động Như Thế Nào

Ứng dụng tách thành hai phần chính:

- Vue.js render giao diện portal trên trình duyệt.
- Node.js backend nhận request từ Vue, xử lý nghiệp vụ và trả dữ liệu qua REST API.
- Prisma là lớp trung gian giữa backend và MySQL.
- Khi chưa có MySQL, backend tự dùng demo data trong bộ nhớ để trình bày được ngay.

Luồng cơ bản:

1. Người dùng mở web ở `http://127.0.0.1:5173` hoặc `http://localhost:4000`.
2. Vue hiển thị màn hình login.
3. Khi login, Vue gọi API `POST /api/auth/login`.
4. Backend kiểm tra tài khoản demo và trả về user + token demo.
5. Vue gọi các API để lấy summary, danh sách thiết bị, request đang mượn, sprint plan và borrow history nếu là student.
6. Khi người dùng borrow, confirm return hoặc update status, Vue gửi request lên backend.
7. Backend cập nhật dữ liệu qua repository. Nếu có MySQL thì Prisma ghi vào database, nếu không thì ghi vào demo store.
8. Vue reload dữ liệu và cập nhật dashboard.

## Node.js Backend

Backend nằm trong thư mục `server/`.

Backend dùng Node.js + Express để:

- Cung cấp REST API cho frontend.
- Xử lý login/logout.
- Trả danh sách thiết bị.
- Tạo request mượn thiết bị.
- Xác nhận trả thiết bị.
- Cập nhật trạng thái thiết bị.
- Trả lịch sử mượn đồ của student.
- Trả sprint roadmap cho demo.
- Serve frontend build ở route `/` khi đã chạy `npm run build`.

Các API chính:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/summary`
- `GET /api/equipment`
- `GET /api/borrow-requests`
- `POST /api/borrow-requests`
- `POST /api/borrow-requests/:id/return`
- `PATCH /api/equipment/:id/status`
- `GET /api/users/:id/borrow-history`
- `GET /api/sprints`

## Vue.js Frontend

Frontend nằm trong thư mục `client/`.

Vue.js dùng để:

- Render giao diện giống Swinburne portal.
- Hiển thị sidebar, topbar, profile dropdown và dashboard.
- Quản lý trạng thái login bằng `localStorage`.
- Gọi API backend qua `fetch`.
- Hiển thị dữ liệu inventory, borrow request, return request, sprint roadmap.
- Hiển thị Borrow History chỉ khi tài khoản có role `STUDENT`.
- Cập nhật giao diện ngay sau khi borrow, return hoặc update status.

Các màn hình/chức năng chính:

- Login page.
- Dashboard portal.
- Equipment list.
- Borrow equipment form.
- Confirm return panel.
- Update equipment status form.
- Student borrow history.
- Profile dropdown với My Profile, Borrow history và Sign Out.

## Tính Năng Hiện Có

### Chung

- Login/logout.
- Dashboard theo phong cách Swinburne.
- Topbar có notification, lời chào và avatar.
- Profile dropdown giống mẫu giao diện.
- Sidebar điều hướng.
- Sprint roadmap 4 sprint, mỗi sprint 2 tuần.

### Lecturer

- Xem danh sách thiết bị.
- Mượn thiết bị cho classroom use.
- Xác nhận thiết bị đã được trả.
- Cập nhật trạng thái thiết bị: Available, Borrowed, Maintenance, Retired.
- Xem request đang active.

### Student

- Login bằng tài khoản student.
- Xem danh sách thiết bị.
- Mượn thiết bị.
- Có thêm mục Borrow History trong sidebar.
- Có thêm mục Borrow history trong profile dropdown.
- Có panel Borrow history trong dashboard.
- Lecturer không thấy phần Borrow History.

## Sprint Plan

- Sprint 1: Classroom use, login/logout, view equipment, borrow equipment, confirm returns, update equipment status.
- Sprint 2: Student requests, support handover, borrowing extensions, notifications.
- Sprint 3: Inventory CRUD, user management, reporting, audit trail.
- Sprint 4: Admin governance, role permissions, analytics, production hardening.

Next meeting: 29/5, Sprint 1 demo.

## Run

```bash
npm install
npm run dev
```

Frontend dev server:

```text
http://127.0.0.1:5173
```

Backend:

```text
http://localhost:4000
```

Sau khi chạy `npm run build`, mở backend root cũng vào được web:

```text
http://localhost:4000
```

Demo login:

| Email | Tên | Role |
|-------|-----|------|
| `buidangminh23@gmail.com` | Minh Bùi Đăng | LECTURER |
| `taolaminhanh1@gmail.com` | minh anh | SUPPORT |
| `buidangminh.lh@gmail.com` | Đăng Minh Bùi | STUDENT |
| `hiheho911@gmail.com` | hihi | EVENT_STAFF |
| `dindungwork@gmail.com` | Đinh Dũng | ADMIN |

> Password: nhập gì cũng được trong demo mode (server chỉ kiểm tra email).

## MySQL + Prisma

```bash
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Set `DATABASE_URL` trong `.env` trước khi chạy migration.

Ví dụ:

```text
DATABASE_URL=mysql://root:password@localhost:3306/swinburne_equipment
```

## Test Nhanh

```bash
npm run build
```

Test thủ công:

1. Login bằng `buidangminh23@gmail.com` (LECTURER).
2. Borrow một thiết bị available.
3. Confirm return thiết bị đang borrowed.
4. Update status một thiết bị sang Maintenance.
5. Logout.
6. Login bằng `buidangminh.lh@gmail.com` (STUDENT).
7. Kiểm tra sidebar/profile dropdown có Borrow History.
8. Kiểm tra lecturer không thấy Borrow History.
9. Login bằng `dindungwork@gmail.com` (ADMIN) để kiểm tra toàn quyền.
