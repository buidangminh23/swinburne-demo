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
  sprints: []
});

const isLoggedIn = computed(() => Boolean(session.value?.token));

async function loadPortal() {
  state.loading = true;
  state.error = "";
  try {
    const user = session.value?.user;
    const [summary, equipment, requests, sprints] = await Promise.all([
      api.summary(),
      api.equipment(),
      api.borrowRequests(),
      api.sprints()
    ]);
    state.summary = summary;
    state.equipment = equipment;
    state.requests = requests;
    state.sprints = sprints;
    state.borrowHistory = user?.role === "STUDENT" ? await api.borrowHistory(user.id) : [];
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
  }
}

async function login(payload) {
  state.error = "";
  const result = await api.login(payload);
  session.value = result;
  localStorage.setItem("portal-session", JSON.stringify(result));
  await loadPortal();
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
    await api.borrow({ ...payload, lecturerId: session.value.user.id });
    await loadPortal();
    state.message = "Borrow request recorded and equipment marked as borrowed.";
  } catch (error) {
    state.error = error.message;
  }
}

async function confirmReturn(id) {
  state.message = "";
  state.error = "";
  try {
    await api.confirmReturn(id);
    await loadPortal();
    state.message = "Return confirmed and equipment is available again.";
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
  />
</template>
