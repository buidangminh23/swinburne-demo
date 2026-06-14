<script setup>
import { computed, ref } from "vue";
import { Search, ScrollText } from "@lucide/vue";

const props = defineProps({
  entries: { type: Array, default: () => [] }
});

const search = ref("");
const actionFilter = ref("ALL");

const actions = computed(() => [...new Set(props.entries.map((entry) => entry.action))]);

const filteredEntries = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return props.entries.filter((entry) => {
    if (actionFilter.value !== "ALL" && entry.action !== actionFilter.value) return false;
    if (!kw) return true;
    return `${entry.action} ${entry.actorName ?? ""} ${entry.entityType} ${entry.entityId}`.toLowerCase().includes(kw);
  });
});

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
</script>

<template>
  <section class="audit-page">
    <div class="panel audit-header">
      <div>
        <h2><ScrollText :size="20" /> System Audit Log</h2>
        <p>Toan he thong: request, return, status, equipment, user, and notification changes.</p>
      </div>
      <div class="audit-filters">
        <label class="search-box">
          <Search :size="15" />
          <input v-model="search" type="text" placeholder="Search audit log..." />
        </label>
        <select v-model="actionFilter">
          <option value="ALL">All actions</option>
          <option v-for="action in actions" :key="action" :value="action">{{ action }}</option>
        </select>
      </div>
    </div>

    <div class="panel audit-table-panel">
      <table class="audit-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Entity</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in filteredEntries" :key="entry.id">
            <td>{{ formatDate(entry.createdAt) }}</td>
            <td><span class="action-badge">{{ entry.action }}</span></td>
            <td>{{ entry.actor?.email || entry.actorName || "System" }}</td>
            <td>{{ entry.entityType }} #{{ entry.entityId }}</td>
            <td class="details-cell">{{ JSON.stringify(entry.details ?? {}) }}</td>
          </tr>
          <tr v-if="filteredEntries.length === 0">
            <td colspan="5" class="empty-state">No audit entries match the filters.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.audit-page { display: flex; flex-direction: column; gap: 16px; }
.audit-header { padding: 20px 24px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.audit-header h2 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 18px; }
.audit-header p { margin: 4px 0 0; color: #727285; font-size: 12.5px; }
.audit-filters { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.audit-filters select, .search-box input { height: 36px; border: 1px solid #d8d8e4; border-radius: 4px; padding: 0 10px; background: #fff; }
.search-box { display: flex; align-items: center; gap: 6px; border: 1px solid #d8d8e4; border-radius: 4px; padding: 0 10px; height: 36px; background: #fff; }
.search-box input { border: 0; padding: 0; height: 30px; outline: none; min-width: 210px; }
.audit-table-panel { padding: 0; overflow: hidden; }
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th, .audit-table td { padding: 12px 16px; border-bottom: 1px solid #ececf3; font-size: 12.5px; text-align: left; vertical-align: top; }
.audit-table th { background: #f9f9fb; color: #5f5a85; text-transform: uppercase; font-size: 11px; }
.action-badge { display: inline-flex; background: #eef2ff; color: #4338ca; border-radius: 4px; padding: 2px 7px; font-weight: 800; font-size: 11px; }
.details-cell { max-width: 420px; color: #727285; font-family: monospace; font-size: 11px; word-break: break-word; }
.empty-state { text-align: center; color: #9ca3af; font-style: italic; padding: 24px !important; }
</style>
