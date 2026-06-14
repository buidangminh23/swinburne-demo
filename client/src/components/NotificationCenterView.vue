<script setup>
import { computed, ref, watch } from "vue";
import { Bell, Check, Filter } from "@lucide/vue";

const props = defineProps({
  notifications: { type: Array, default: () => [] },
  preferences: { type: Object, default: null },
  reminderRules: { type: Array, default: () => [] }
});

const emit = defineEmits(["update-preferences", "update-rules", "mark-read"]);

const typeFilter = ref("ALL");
const statusFilter = ref("all");
const search = ref("");
const enabledTypes = ref([]);
const rulesDraft = ref([]);

const availableTypes = computed(() => {
  const fromNotifications = props.notifications.map((item) => item.type);
  return [...new Set([...fromNotifications, "BORROW_REQUEST", "REQUEST_APPROVED", "OVERDUE_REMINDER", "RETURN_DUE_SOON", "MAINTENANCE_ALERT"])];
});

watch(
  () => props.preferences,
  (value) => {
    enabledTypes.value = [...(value?.enabledTypes ?? availableTypes.value)];
  },
  { immediate: true }
);

watch(
  () => props.reminderRules,
  (value) => {
    rulesDraft.value = value.map((rule) => ({ ...rule }));
  },
  { immediate: true }
);

const filteredNotifications = computed(() => {
  return props.notifications.filter((notification) => {
    if (typeFilter.value !== "ALL" && notification.type !== typeFilter.value) return false;
    if (statusFilter.value === "unread" && notification.readAt) return false;
    if (statusFilter.value === "read" && !notification.readAt) return false;
    if (search.value.trim()) {
      const kw = search.value.trim().toLowerCase();
      return `${notification.subject ?? ""} ${notification.message ?? ""}`.toLowerCase().includes(kw);
    }
    return true;
  });
});

function toggleType(type) {
  enabledTypes.value = enabledTypes.value.includes(type)
    ? enabledTypes.value.filter((item) => item !== type)
    : [...enabledTypes.value, type];
}

function savePreferences() {
  emit("update-preferences", { enabledTypes: enabledTypes.value, channels: ["inApp"] });
}

function saveRules() {
  emit("update-rules", rulesDraft.value);
}
</script>

<template>
  <section class="notification-page">
    <div class="panel notification-header">
      <div>
        <h2><Bell :size="20" /> Notification Center</h2>
        <p>Filter notifications, tune preferences, and control demo auto reminder rules.</p>
      </div>
      <div class="notification-filters">
        <input v-model="search" type="text" placeholder="Search notifications..." />
        <select v-model="typeFilter">
          <option value="ALL">All types</option>
          <option v-for="type in availableTypes" :key="type" :value="type">{{ type }}</option>
        </select>
        <select v-model="statusFilter">
          <option value="all">All status</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
      </div>
    </div>

    <div class="notification-grid">
      <article class="panel notification-list">
        <header><h3><Filter :size="16" /> Notifications</h3></header>
        <div v-if="filteredNotifications.length === 0" class="empty-state">No notifications match the filters.</div>
        <div v-for="item in filteredNotifications" :key="item.id" class="notification-row" :class="{ unread: !item.readAt }">
          <div>
            <strong>{{ item.subject }}</strong>
            <p>{{ item.message }}</p>
            <small>{{ item.type }} · {{ item.channel }} · {{ item.readAt ? "Read" : "Unread" }}</small>
          </div>
          <button v-if="!item.readAt" type="button" class="mark-btn" @click="$emit('mark-read', item.id)">
            <Check :size="13" /> Read
          </button>
        </div>
      </article>

      <aside class="panel preferences-panel">
        <h3>Notification Preferences</h3>
        <div class="type-list">
          <label v-for="type in availableTypes" :key="type" class="type-toggle">
            <input type="checkbox" :checked="enabledTypes.includes(type)" @change="toggleType(type)" />
            <span>{{ type }}</span>
          </label>
        </div>
        <button type="button" class="save-btn" @click="savePreferences">Save Preferences</button>

        <h3 class="rules-title">Auto Reminder Rules</h3>
        <div class="rule-list">
          <label v-for="rule in rulesDraft" :key="rule.id" class="rule-row">
            <input v-model="rule.enabled" type="checkbox" />
            <span>{{ rule.type }} · {{ rule.offsetHours }}h</span>
          </label>
        </div>
        <button type="button" class="save-btn secondary" @click="saveRules">Save Rules</button>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.notification-page { display: flex; flex-direction: column; gap: 16px; }
.notification-header { padding: 20px 24px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.notification-header h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 18px; }
.notification-header p { margin: 4px 0 0; color: #727285; font-size: 12.5px; }
.notification-filters { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.notification-filters input, .notification-filters select { height: 36px; border: 1px solid #d8d8e4; border-radius: 4px; padding: 0 10px; background: #fff; }
.notification-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; }
.notification-list, .preferences-panel { padding: 18px 20px; }
.notification-list h3, .preferences-panel h3 { margin: 0 0 12px; font-size: 15px; display: flex; gap: 8px; align-items: center; }
.notification-row { border: 1px solid #ececf3; border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; gap: 12px; margin-bottom: 10px; background: #fff; }
.notification-row.unread { border-color: #bfdbfe; background: #eff6ff; }
.notification-row strong { display: block; font-size: 13px; color: #2d2d3a; }
.notification-row p { margin: 4px 0; color: #5d5d6f; font-size: 12px; }
.notification-row small { color: #727285; font-size: 11px; }
.mark-btn, .save-btn { min-height: 30px; padding: 0 10px; border-radius: 4px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px; }
.mark-btn { background: #fff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.save-btn { width: 100%; justify-content: center; background: #5f63ff; color: #fff; margin-top: 10px; }
.save-btn.secondary { background: #047857; }
.type-list, .rule-list { display: flex; flex-direction: column; gap: 8px; }
.type-toggle, .rule-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #474753; }
.rules-title { margin-top: 22px !important; }
.empty-state { color: #9ca3af; font-style: italic; font-size: 13px; padding: 18px 0; }
@media (max-width: 900px) {
  .notification-grid { grid-template-columns: 1fr; }
}
</style>
