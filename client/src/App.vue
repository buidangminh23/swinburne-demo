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
  equipmentTimelines: []
});

const isLoggedIn = computed(() => Boolean(session.value?.token));

async function loadPortal() {
  state.loading = true;
  state.error = "";
  try {
    const user = session.value?.user;
    await api.runAutoReminders?.().catch(() => null);
    const [summary, equipment, requests, sprints, notifications, smartAlerts, auditLog, notificationPreferences, reminderRules, equipmentTimelines] = await Promise.all([
      api.summary(),
      api.equipment(),
      api.borrowRequests(),
      api.sprints(),
      api.notifications().catch(() => []),
      api.smartAlerts?.().catch(() => []),
      api.auditLog?.().catch(() => []),
      api.notificationPreferences?.().catch(() => null),
      api.reminderRules?.().catch(() => []),
      api.equipmentTimelines?.().catch(() => [])
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

    if (user?.role === "ADMIN") {
      state.users = await api.users().catch(() => []);
    } else {
      state.users = [];
    }

    const historyParams = ["STUDENT", "EVENT_STAFF", "SUPPORT"].includes(user?.role) ? { userId: user.id } : {};
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
  await api.logout();
  session.value = null;
  localStorage.removeItem("portal-session");
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
    @logout="logout"
    @borrow="borrowEquipment"
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
