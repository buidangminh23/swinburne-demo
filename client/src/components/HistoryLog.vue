<script setup>
import { reactive, ref, watch, onMounted, computed } from "vue";
import { Search, Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight } from "@lucide/vue";
import AuditLogView from "./AuditLogView.vue";

const props = defineProps({
  historyData: {
    type: Object,
    required: true
  },
  auditLog: {
    type: Array,
    default: () => []
  },
  session: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["fetch"]);

const DERIVED_FILTERS = ["NEAR_DUE", "OVERDUE"];

const filters = reactive({
  search: "",
  status: "",
  purpose: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
});

const derivedFilter = ref("");
const loading = ref(false);
let fetchTimer = null;

watch(derivedFilter, (value) => {
  filters.status = DERIVED_FILTERS.includes(value) ? "" : value;
});

watch(() => filters.search, () => {
  if (fetchTimer) {
    clearTimeout(fetchTimer);
  }
  fetchTimer = setTimeout(() => {
    emitFetch();
  }, 300);
});

watch(
  () => [filters.status, filters.purpose, filters.sortBy, filters.sortOrder, filters.page, filters.limit],
  () => {
    emitFetch();
  }
);

watch(() => props.historyData, () => {
  loading.value = false;
}, { deep: true });

watch(() => props.historyData.total, () => {
  const pageCount = Math.ceil(props.historyData.total / filters.limit) || 1;
  filters.page = Math.min(filters.page, pageCount);
});

function emitFetch() {
  loading.value = true;
  emit("fetch", { ...filters });
}

const rows = computed(() => {
  const list = props.historyData.data ?? [];
  if (!DERIVED_FILTERS.includes(derivedFilter.value)) {
    return list;
  }
  return list.filter((request) => getDisplayStatus(request) === derivedFilter.value);
});

function prevPage() {
  if (filters.page > 1) {
    filters.page--;
  }
}

function nextPage() {
  const totalPages = Math.ceil(props.historyData.total / filters.limit);
  if (filters.page < totalPages) {
    filters.page++;
  }
}

function changePage(p) {
  if (p !== "...") {
    filters.page = p;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

function getDisplayStatus(request) {
  if (request.status === "BORROWED") {
    const now = new Date();
    const due = new Date(request.dueAt);
    if (due < now) {
      return "OVERDUE";
    }
    const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (due < limit) {
      return "NEAR_DUE";
    }
  }
  return request.status;
}

function statusClass(status) {
  return `status-chip ${status.toLowerCase().replace('_', '-')}`;
}

const totalPages = computed(() => Math.ceil(props.historyData.total / filters.limit) || 1);

const canViewAuditLog = computed(() => {
  return ["ADMIN", "EQUIPMENT_MANAGER", "SERVER_MANAGER", "LECTURER", "EVENT_STAFF"].includes(props.session.user.role);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = filters.page;
  const pages = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (current > 3) {
      pages.push("...");
    }
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) {
      pages.push("...");
    }
    pages.push(total);
  }
  return pages;
});

onMounted(() => {
  if (["STUDENT", "EVENT_STAFF", "EQUIPMENT_MANAGER"].includes(props.session.user.role)) {
    filters.userId = props.session.user.id;
  }
  emitFetch();
});

import { makeTranslator } from "../translate";
const t = (text) => makeTranslator(props.session?.user?.email)(text);
</script>

<template>
  <div class="history-log-stack">
    <section class="panel history-log-panel">
      <div class="panel-heading">
        <div>
          <h2>{{ t('Borrowing History Log') }}</h2>
          <p>{{ t('Search, filter, and view past and active borrow requests.') }}</p>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="filters-bar">
        <div class="filter-group search-box">
          <Search :size="16" class="filter-icon" />
          <label for="history-search" class="sr-only">{{ t('Search history') }}</label>
          <input
            id="history-search"
            v-model="filters.search"
            type="text"
            :placeholder="t('Search items, users, classroom...')"
            class="filter-input"
            :aria-label="t('Search history')"
          />
        </div>

        <div class="filter-group">
          <Filter :size="16" class="filter-icon" />
          <label for="history-status-filter" class="sr-only">{{ t('Filter by status') }}</label>
          <select id="history-status-filter" v-model="derivedFilter" class="filter-select" :aria-label="t('Filter by status')">
            <option value="">{{ t('All Statuses') }}</option>
            <option value="REQUESTED">{{ t('Requested') }}</option>
            <option value="RESERVED">{{ t('Reserved') }}</option>
            <option value="BORROWED">{{ t('Borrowed') }}</option>
            <option value="NEAR_DUE">{{ t('Near Due Date') }}</option>
            <option value="OVERDUE">{{ t('Overdue') }}</option>
            <option value="RETURNED">{{ t('Returned') }}</option>
            <option value="CANCELLED">{{ t('Cancelled') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="history-purpose-filter" class="sr-only">{{ t('Filter by purpose') }}</label>
          <select id="history-purpose-filter" v-model="filters.purpose" class="filter-select" :aria-label="t('Filter by purpose')">
            <option value="">{{ t('All Purposes') }}</option>
            <option value="CLASSROOM">{{ t('Classroom') }}</option>
            <option value="RESEARCH">{{ t('Research / Project') }}</option>
            <option value="EVENT">{{ t('Event') }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label for="history-sort-by" class="sr-only">{{ t('Sort by') }}</label>
          <select id="history-sort-by" v-model="filters.sortBy" class="filter-select" :aria-label="t('Sort by')">
            <option value="createdAt">{{ t('Date Created') }}</option>
            <option value="dueAt">{{ t('Due Date') }}</option>
            <option value="returnedAt">{{ t('Returned Date') }}</option>
          </select>
        </div>

        <div class="filter-group toggle-sort">
          <button
            type="button"
            class="sort-toggle-btn"
            @click="filters.sortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc'"
          >
            <SortAsc v-if="filters.sortOrder === 'asc'" :size="16" />
            <SortDesc v-else :size="16" />
            {{ filters.sortOrder === 'asc' ? t('Ascending') : t('Descending') }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width: 60px;">{{ t('No.') }}</th>
              <th>{{ t('User') }}</th>
              <th>{{ t('Equipment') }}</th>
              <th>{{ t('Purpose') }}</th>
              <th>{{ t('Classroom / Unit') }}</th>
              <th>{{ t('Borrowed At') }}</th>
              <th>{{ t('Due At') }}</th>
              <th>{{ t('Returned At') }}</th>
              <th>{{ t('Status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(request, index) in rows" :key="request.id">
              <td style="color: #6e6e81; font-weight: 600;">
                {{ (filters.page - 1) * filters.limit + index + 1 }}
              </td>
              <td>
                <strong>{{ request.lecturer?.name }}</strong>
                <span class="user-sub">{{ request.lecturer?.email }}</span>
              </td>
              <td>
                <strong>{{ request.equipment?.name }}</strong>
                <span class="asset-sub">{{ request.equipment?.assetCode }}</span>
              </td>
              <td>
                <span class="purpose-badge">{{ t(request.purpose) }}</span>
              </td>
              <td>
                <span v-if="request.classroom">Room: {{ request.classroom.startsWith('HN-') ? 'HN-DT1-' + request.classroom.split('-').slice(2).join('-') : request.classroom }}</span>
                <span v-if="request.program" class="program-sub">{{ request.program }}</span>
              </td>
              <td>{{ formatDateTime(request.createdAt) }}</td>
              <td>{{ formatDateTime(request.dueAt) }}</td>
              <td>{{ request.returnedAt ? formatDateTime(request.returnedAt) : "-" }}</td>
              <td>
                <span :class="statusClass(getDisplayStatus(request))">{{ t(getDisplayStatus(request)).replace('_', ' ') }}</span>
              </td>
            </tr>
            <tr v-if="!loading && rows.length === 0">
              <td colspan="9" class="empty-row-text">{{ t('No borrow history records match filters.') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="pagination-footer">
        <div class="pagination-info">
          {{ t('Showing ') }}{{ rows.length }}{{ t(' of ') }}{{ historyData.total }}{{ t(' records') }}
        </div>
        <div class="pagination-actions">
          <button
            type="button"
            class="pagination-btn"
            :disabled="filters.page <= 1"
            @click="prevPage"
          >
            <ChevronLeft :size="16" /> {{ t('Previous') }}
          </button>
          <div class="page-numbers">
            <button
              v-for="(p, idx) in visiblePages"
              :key="idx"
              type="button"
              :class="['page-num-btn', { active: p === filters.page, ellipsis: p === '...' }]"
              :disabled="p === '...'"
              @click="changePage(p)"
            >
              {{ p }}
            </button>
          </div>
          <button
            type="button"
            class="pagination-btn"
            :disabled="filters.page >= totalPages"
            @click="nextPage"
          >
            {{ t('Next') }} <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </section>

    <AuditLogView v-if="canViewAuditLog" :entries="auditLog" :session="session" />
  </div>
</template>

<style scoped>
.history-log-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 26px;
  background: #fafafa;
  border-bottom: 1px solid #eeeeef;
}
.filter-group {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #d8d8e4;
  border-radius: 3px;
  padding: 0 8px;
  min-height: 38px;
}
.search-box {
  flex-grow: 1;
  min-width: 200px;
}
.filter-icon {
  color: #6e6e81;
  margin-right: 6px;
}
.filter-input {
  border: 0;
  outline: none;
  font-size: 13px;
  width: 100%;
  height: 100%;
}
.filter-select {
  border: 0;
  outline: none;
  font-size: 13px;
  background: transparent;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.sort-toggle-btn {
  background: transparent;
  color: #3e3e4a;
  border: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  min-height: auto;
  cursor: pointer;
}
.user-sub, .asset-sub, .program-sub {
  display: block;
  font-size: 11px;
  color: #6e6e81;
  margin-top: 2px;
}
.purpose-badge {
  font-size: 11px;
  font-weight: 700;
  background: #e0f2fe;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 3px;
}
.empty-row-text {
  text-align: center;
  color: #6e6e81;
  padding: 40px;
  font-style: italic;
}
.pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 26px;
  border-top: 1px solid #eeeeef;
}
.pagination-info {
  font-size: 13px;
  color: #6e6e81;
}
.pagination-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pagination-btn {
  background: #ffffff;
  border: 1px solid #d8d8e4;
  color: #3e3e4a;
  min-height: 32px;
  padding: 0 10px;
  font-weight: 600;
  cursor: pointer;
}
.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-num-btn {
  background: #ffffff;
  border: 1px solid #d8d8e4;
  color: #3e3e4a;
  min-height: 32px;
  min-width: 32px;
  padding: 0 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  transition: all 0.2s ease;
}
.page-num-btn:hover:not(:disabled):not(.ellipsis) {
  background: #fafafa;
  border-color: #b5b5c9;
}
.page-num-btn.active {
  background: #5f63ff;
  border-color: #5f63ff;
  color: #ffffff;
}
.page-num-btn.ellipsis {
  border: 0;
  background: transparent;
  cursor: default;
}
</style>
