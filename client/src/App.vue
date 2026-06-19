<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "./api";
import AppShell from "./components/AppShell.vue";
import LoginView from "./components/LoginView.vue";

const session = ref(JSON.parse(localStorage.getItem("portal-session") || "null"));
const state = reactive({
  loading: false,
  message: "",
  error: "",
  summary: null,
  equipment: [],
  requests: [],
  borrowHistory: [],
  historyData: { data: [], total: 0, page: 1, limit: 10 },
  sprints: [],
  notifications: [],
  users: [],
  smartAlerts: [],
  auditLog: [],
  notificationPreferences: null,
  reminderRules: [],
  equipmentTimelines: [],
  myUnits: [],
  myProjects: [],
  managers: [],
  serverManagers: [],
  lecturers: []
});

const isLoggedIn = computed(() => Boolean(session.value?.token && session.value?.user?.role));

async function loadPortal() {
  state.loading = true;
  state.error = "";
  try {
    const user = session.value?.user;
    await api.runAutoReminders?.().catch(() => null);
    const failed = [];
    const core = await Promise.all([
      api.summary().catch((error) => { failed.push(error); return null; }),
      api.equipment().catch((error) => { failed.push(error); return []; }),
      api.borrowRequests().catch((error) => { failed.push(error); return []; }),
      api.sprints().catch((error) => { failed.push(error); return []; })
    ]);
    if (failed.length) {
      throw new Error(failed[0]?.message || "Failed to load portal data.");
    }
    const [summary, equipment, requests, sprints] = core;
    const [notifications, smartAlerts, auditLog, notificationPreferences, reminderRules, equipmentTimelines, myUnits, myProjects] = await Promise.all([
      api.notifications().catch(() => []),
      api.smartAlerts?.().catch(() => []),
      api.auditLog?.().catch(() => []),
      api.notificationPreferences?.().catch(() => null),
      api.reminderRules?.().catch(() => []),
      api.equipmentTimelines?.().catch(() => []),
      api.units?.().catch(() => []),
      api.researchProjects?.().catch(() => [])
    ]);
    state.summary = summary;
    state.equipment = equipment;
    state.requests = requests;
    state.sprints = sprints;
    state.notifications = notifications;
    state.smartAlerts = smartAlerts;
    state.auditLog = auditLog;
    state.notificationPreferences = notificationPreferences;
    state.reminderRules = reminderRules;
    state.equipmentTimelines = equipmentTimelines;
    state.myUnits = myUnits;
    state.myProjects = myProjects;

    if (user?.role === "ADMIN") {
      state.users = await api.users().catch(() => []);
    } else {
      state.users = [];
    }
    state.managers = await api.managers?.().catch(() => []);
    state.serverManagers = await api.serverManagers?.().catch(() => []);
    state.lecturers = await api.lecturers?.().catch(() => []);

    const historyParams = ["STUDENT", "EVENT_STAFF", "EQUIPMENT_MANAGER"].includes(user?.role) ? { userId: user.id } : {};
    const histResult = await api.history(historyParams);
    state.borrowHistory = histResult.data || [];
    state.historyData = histResult;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
  }
}

async function login(payload) {
  state.error = "";
  try {
    const result = payload.accessToken
      ? await api.googleLogin(payload.accessToken)
      : await api.login(payload);
    session.value = result;
    localStorage.setItem("portal-session", JSON.stringify(result));
    await loadPortal();
  } catch (error) {
    state.error = error.message;
  }
}

async function logout() {
  session.value = null;
  state.message = "";
  state.error = "";
  localStorage.removeItem("portal-session");
  const demoKeys = [
    "swin-demo-users",
    "swin-demo-equipment",
    "swin-demo-borrowRequests",
    "swin-demo-notifications",
    "swin-demo-audit-log",
    "swin-demo-notification-preferences",
    "swin-demo-reminder-rules",
    "swin-demo-seed-version"
  ];
  for (const key of demoKeys) {
    localStorage.removeItem(key);
  }
  try {
    await api.logout();
  } catch {
    session.value = null;
  }
}

function clearBanners() {
  state.message = "";
  state.error = "";
}

async function borrowEquipment(payload) {
  state.message = "";
  state.error = "";
  try {
    const body = Array.isArray(payload) ? payload : [payload];
    await api.borrow(body);
    await loadPortal();
    state.message = "Borrow request submitted successfully for approval.";
  } catch (error) {
    state.error = error.message;
  }
}

async function importSchedule(rows) {
  state.message = "";
  state.error = "";
  try {
    const result = await api.importUnits(rows);
    await loadPortal();
    state.message = `Semester timetable imported: ${result.count} unit(s) loaded.`;
  } catch (error) {
    state.error = error.message;
  }
}

async function confirmReturn({ id, payload }) {
  state.message = "";
  state.error = "";
  try {
    await api.confirmReturn(id, payload);
    await loadPortal();
    state.message = "Return confirmed and equipment status updated.";
  } catch (error) {
    state.error = error.message;
  }
}

async function updateStatus(payload) {
  state.message = "";
  state.error = "";
  try {
    await api.updateStatus(payload.id, {
      status: payload.status,
      conditionNotes: payload.conditionNotes
    });
    await loadPortal();
    state.message = "Equipment status updated.";
  } catch (error) {
    state.error = error.message;
  }
}

async function approveRequest(id) {
  state.message = "";
  state.error = "";
  try {
    await api.approve(id, session.value.user.id);
    await loadPortal();
    state.message = "Request approved successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function denyRequest(id) {
  state.message = "";
  state.error = "";
  try {
    await api.deny(id, session.value.user.id);
    await loadPortal();
    state.message = "Request denied successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function extendRequest({ id, payload }) {
  state.message = "";
  state.error = "";
  try {
    await api.extend(id, payload);
    await loadPortal();
    state.message = "Borrow extension granted successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function checkOutRequest(id) {
  state.message = "";
  state.error = "";
  try {
    await api.checkOut(id);
    await loadPortal();
    state.message = "Equipment checked out and now in use.";
  } catch (error) {
    state.error = error.message;
  }
}

async function editBorrow({ id, payload }) {
  state.message = "";
  state.error = "";
  try {
    await api.editRequest(id, payload);
    await loadPortal();
    state.message = "Borrow request updated.";
  } catch (error) {
    state.error = error.message;
  }
}

async function logCustody({ id, payload }) {
  state.message = "";
  state.error = "";
  try {
    await api.custody(id, payload);
    await loadPortal();
    state.message = "Chain-of-custody entry recorded.";
  } catch (error) {
    state.error = error.message;
  }
}

async function sendReminder(id) {
  state.message = "";
  state.error = "";
  try {
    const res = await api.remind(id);
    state.message = res.message;
  } catch (error) {
    state.error = error.message;
  }
}

async function addEquipment(payload) {
  state.message = "";
  state.error = "";
  try {
    await api.addEquipment(payload);
    await loadPortal();
    state.message = "Equipment added successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function editEquipment({ id, payload }) {
  state.message = "";
  state.error = "";
  try {
    await api.editEquipment(id, payload);
    await loadPortal();
    state.message = "Equipment updated successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function updateUserRole({ id, role, lecturerId, groupName, className }) {
  state.message = "";
  state.error = "";
  try {
    await api.updateUserRole(id, role, lecturerId, { groupName, className });
    await loadPortal();
    state.message = "User updated successfully.";
  } catch (error) {
    state.error = error.message;
  }
}

async function updateNotificationPreferences(payload) {
  state.message = "";
  state.error = "";
  try {
    await api.updateNotificationPreferences(payload);
    await loadPortal();
    state.message = "Notification preferences updated.";
  } catch (error) {
    state.error = error.message;
  }
}

async function updateReminderRules(rules) {
  state.message = "";
  state.error = "";
  try {
    await api.updateReminderRules(rules);
    await loadPortal();
    state.message = "Auto reminder rules updated.";
  } catch (error) {
    state.error = error.message;
  }
}

async function markNotificationRead(id) {
  try {
    await api.markNotificationRead(id);
    state.notifications = await api.notifications().catch(() => state.notifications);
  } catch (error) {
    state.error = error.message;
  }
}

async function fetchHistory(params) {
  state.loading = true;
  try {
    const res = await api.history(params);
    state.historyData = res;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
  }
}

onMounted(() => {
  if (isLoggedIn.value) {
    loadPortal();
  }
});
</script>

<template>
  <LoginView v-if="!isLoggedIn" :error="state.error" @login="login" />
  <AppShell
    v-else
    :session="session"
    :state="state"
    @navigate="clearBanners"
    @logout="logout"
    @borrow="borrowEquipment"
    @import-schedule="importSchedule"
    @return="confirmReturn"
    @status="updateStatus"
    @approve="approveRequest"
    @deny="denyRequest"
    @extend="extendRequest"
    @check-out="checkOutRequest"
    @edit="editBorrow"
    @custody="logCustody"
    @remind="sendReminder"
    @fetch-history="fetchHistory"
    @add-equipment="addEquipment"
    @edit-equipment="editEquipment"
    @update-user-role="updateUserRole"
    @update-notification-preferences="updateNotificationPreferences"
    @update-reminder-rules="updateReminderRules"
    @mark-notification-read="markNotificationRead"
  />
</template>
