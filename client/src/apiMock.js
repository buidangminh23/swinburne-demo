import { store } from "./store";
import { filterNotifications } from "./demoOperations";

const ALLOWED_DOMAIN = "@fpt.edu.vn";

function currentUser() {
  try {
    const session = JSON.parse(localStorage.getItem("portal-session") || "null");
    return session?.user ?? null;
  } catch {
    return null;
  }
}

const NOTIF_KEY = "swin-demo-notifications";

const notifications = (() => {
  try {
    const saved = localStorage.getItem(NOTIF_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
})();
let notifSeq = notifications.reduce((max, n) => Math.max(max, n.id ?? 0), 0);

function persistNotifications() {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
  } catch {
    /* noop */
  }
}

function pushNotification({ to, type, subject, message, meta = {} }) {
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const duplicate = notifications.some((notification) =>
    notification.type === type &&
    notification.subject === subject &&
    JSON.stringify(notification.meta ?? {}) === JSON.stringify(meta)
  );
  if (duplicate) {
    return;
  }
  notifications.unshift({
    id: ++notifSeq,
    to: recipients,
    type,
    subject,
    message,
    channel: "logged",
    readAt: null,
    meta,
    createdAt: new Date().toISOString()
  });
  if (notifications.length > 100) {
    notifications.length = 100;
  }
  persistNotifications();
}

async function staffEmails() {
  const all = await store.listAllUsers();
  return all.filter((u) => u.role !== "STUDENT").map((u) => u.email);
}

const itemName = (request) => request?.equipment?.name ?? "equipment";

export const apiMock = {
  async login(payload) {
    const email = String(payload?.email ?? "").trim();
    if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return Promise.reject(new Error(`Only ${ALLOWED_DOMAIN} accounts can sign in.`));
    }
    return store.login(email);
  },
  googleLogin() {
    return Promise.reject(new Error("Google sign-in needs a backend. Pick a demo account from the list."));
  },
  logout() {
    return Promise.resolve(null);
  },
  summary() {
    return store.summary();
  },
  equipment() {
    return store.listEquipment();
  },
  borrowRequests() {
    return store.listActiveRequests();
  },
  borrowHistory(userId) {
    return store.listBorrowHistory(Number(userId));
  },
  async borrow(payload) {
    const user = currentUser();
    const list = Array.isArray(payload) ? payload : [payload];
    const results = [];
    for (const item of list) {
      const created = await store.borrowEquipment({ ...item, lecturerId: user?.id });
      results.push(created);
      pushNotification({
        to: await staffEmails(),
        type: "BORROW_REQUEST",
        subject: `New borrow request • ${itemName(created)}`,
        message: `${created.lecturer?.name ?? "A user"} requested ${itemName(created)} for ${created.purpose}.`
      });
    }
    return Array.isArray(payload) ? results : results[0];
  },
  async borrowPreflight(payload) {
    const user = currentUser();
    const list = Array.isArray(payload) ? payload : [payload];
    const results = [];
    for (const item of list) {
      results.push(await store.analyzeBorrow({ ...item, lecturerId: user?.id }, user?.id));
    }
    return Array.isArray(payload) ? results : results[0];
  },
  async confirmReturn(id, payload = {}) {
    const user = currentUser();
    const updated = await store.confirmReturn(Number(id), { ...payload, actorId: user?.id, actorName: user?.email });
    pushNotification({
      to: updated.lecturer?.email,
      type: "EQUIPMENT_RETURNED",
      subject: `Return confirmed • ${itemName(updated)}`,
      message: `Return of ${itemName(updated)} has been confirmed.`
    });
    return updated;
  },
  updateStatus(id, payload) {
    const user = currentUser();
    return store.updateEquipmentStatus(Number(id), { ...payload, actorId: user?.id, actorName: user?.email });
  },
  sprints() {
    return store.sprintPlan();
  },
  async approve(id, userId) {
    const updated = await store.approveRequest(Number(id), userId ?? currentUser()?.id);
    pushNotification({
      to: updated.lecturer?.email,
      type: "REQUEST_APPROVED",
      subject: `Request approved • ${itemName(updated)}`,
      message: `Your borrow request for ${itemName(updated)} was approved.`
    });
    return updated;
  },
  async deny(id, userId) {
    const updated = await store.denyRequest(Number(id), userId ?? currentUser()?.id);
    pushNotification({
      to: updated.lecturer?.email,
      type: "REQUEST_DENIED",
      subject: `Request denied • ${itemName(updated)}`,
      message: `Your borrow request for ${itemName(updated)} was denied.`
    });
    return updated;
  },
  async extend(id, payload = {}) {
    const user = currentUser();
    const updated = await store.extendRequest(Number(id), { ...payload, actorId: user?.id, actorName: user?.email });
    pushNotification({
      to: updated.lecturer?.email,
      type: "BORROW_EXTENDED",
      subject: `Borrow extended • ${itemName(updated)}`,
      message: `The borrow for ${itemName(updated)} now ends ${updated.dueAt}.`
    });
    return updated;
  },
  async checkOut(id) {
    const user = currentUser();
    const updated = await store.checkOut(Number(id), { actorName: user?.email });
    pushNotification({
      to: updated.lecturer?.email,
      type: "EQUIPMENT_CHECKED_OUT",
      subject: `Checked out • ${itemName(updated)}`,
      message: `${itemName(updated)} has been checked out and is now in use.`
    });
    return updated;
  },
  async remind(id) {
    const request = await store.getRequest(Number(id));
    if (request) {
      pushNotification({
        to: request.lecturer?.email,
        type: "OVERDUE_REMINDER",
        subject: `Reminder • return ${itemName(request)}`,
        message: `Please return ${itemName(request)} as soon as possible.`
      });
    }
    return { success: true, message: "Email reminder sent successfully." };
  },
  history(params = {}) {
    const user = currentUser();
    const query = { ...params };
    if (user?.role === "STUDENT") {
      query.userId = user.id;
    }
    return store.listAllHistory(query);
  },
  editRequest(id, payload) {
    const user = currentUser();
    return store.editRequest(Number(id), { ...payload, actorId: user?.id, actorName: user?.email });
  },
  custody(id, payload = {}) {
    const user = currentUser();
    return store.addCustody(Number(id), { ...payload, actor: payload.actor ?? user?.email });
  },
  schedule(equipmentId) {
    return store.getEquipmentSchedule(Number(equipmentId));
  },
  async runAutoReminders() {
    const alerts = await store.smartAlerts();
    const staff = await staffEmails();
    for (const alert of alerts) {
      if (alert.type === "OVERDUE" || alert.type === "NEAR_DUE") {
        pushNotification({
          to: staff,
          type: alert.type === "OVERDUE" ? "OVERDUE_REMINDER" : "RETURN_DUE_SOON",
          subject: alert.title,
          message: alert.message,
          meta: { alertId: alert.id, requestId: alert.requestId }
        });
      }
    }
    return { success: true };
  },
  async notifications(limit = 20, filters = {}) {
    const user = currentUser();
    const lower = String(user?.email ?? "").toLowerCase();
    const preferences = await store.notificationPreferences(user?.id);
    const list = user
      ? notifications.filter((n) => n.to.some((addr) => String(addr).toLowerCase() === lower))
      : [];
    return filterNotifications(list, filters, preferences).slice(0, Math.max(0, limit));
  },
  markNotificationRead(id) {
    const notification = notifications.find((item) => item.id === Number(id));
    if (notification) {
      notification.readAt = new Date().toISOString();
      persistNotifications();
    }
    return Promise.resolve(notification ?? null);
  },
  notificationPreferences() {
    const user = currentUser();
    return store.notificationPreferences(user?.id);
  },
  updateNotificationPreferences(payload) {
    const user = currentUser();
    return store.updateNotificationPreferences(user?.id, payload);
  },
  reminderRules() {
    return store.listReminderRules();
  },
  updateReminderRules(rules) {
    return store.updateReminderRules(rules);
  },
  smartAlerts() {
    return store.smartAlerts();
  },
  equipmentTimelines() {
    return store.equipmentTimelines();
  },
  auditLog() {
    return store.listAuditLog();
  },
  users() {
    return store.listAllUsers();
  },
  updateUserRole(id, role, lecturerId = null, profile = {}) {
    const user = currentUser();
    return store.updateUserRole(Number(id), role, lecturerId, { ...profile, actorId: user?.id });
  },
  addEquipment(payload) {
    return store.createEquipment(payload);
  },
  editEquipment(id, payload) {
    return store.updateEquipment(Number(id), payload);
  }
};
