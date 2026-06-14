<script setup>
import { reactive, watch, onMounted, computed } from "vue";
import { Search, Filter, SortAsc, SortDesc, ChevronLeft, ChevronRight } from "@lucide/vue";

const props = defineProps({
  historyData: {
    type: Object,
    required: true
  },
  session: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["fetch"]);

const filters = reactive({
  search: "",
  status: "",
  purpose: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10
});

watch(filters, () => {
  emitFetch();
}, { deep: true });

watch(() => props.historyData.total, () => {
  const pageCount = Math.ceil(props.historyData.total / filters.limit) || 1;
  if (filters.page > pageCount) {
    filters.page = 1;
  }
});

function emitFetch() {
  emit("fetch", { ...filters });
}

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
  if (["STUDENT", "EVENT_STAFF", "SUPPORT"].includes(props.session.user.role)) {
    filters.userId = props.session.user.id;
  }
  emitFetch();
});

import { makeTranslator } from "../translate";
const t = makeTranslator(props.session?.user?.email);
</script>

<template>
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
        <input 
          v-model="filters.search" 
          type="text" 
          :placeholder="t('Search items, users, classroom...')" 
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <Filter :size="16" class="filter-icon" />
        <select v-model="filters.status" class="filter-select">
          <option value="">{{ t('All Statuses') }}</option>
          <option value="REQUESTED">{{ t('Requested') }}</option>
          <option value="APPROVED">{{ t('Approved') }}</option>
          <option value="BORROWED">{{ t('Borrowed') }}</option>
          <option value="NEAR_DUE">{{ t('Near Due Date') }}</option>
          <option value="OVERDUE">{{ t('Overdue') }}</option>
          <option value="RETURNED">{{ t('Returned') }}</option>
          <option value="CANCELLED">{{ t('Cancelled') }}</option>
        </select>
      </div>

      <div class="filter-group">
        <select v-model="filters.purpose" class="filter-select">
          <option value="">{{ t('All Purposes') }}</option>
          <option value="CLASSROOM">{{ t('Classroom') }}</option>
          <option value="VOVINAM">{{ t('Vovinam Room') }}</option>
          <option value="LAB">{{ t('Lab') }}</option>
          <option value="RESEARCH">{{ t('Research') }}</option>
          <option value="EVENT">{{ t('Event') }}</option>
        </select>
      </div>

      <div class="filter-group">
        <select v-model="filters.sortBy" class="filter-select">
          <option value="createdAt">{{ t('Date Created') }}</option>
          <option value="startDate">{{ t('Start Date') }}</option>
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
            <th>{{ t('Classroom / University') }}</th>
            <th>{{ t('Borrowed At') }}</th>
            <th>{{ t('Due At') }}</th>
            <th>{{ t('Returned At') }}</th>
            <th>{{ t('Status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(request, index) in historyData.data" :key="request.id">
            <td style="color: #727285; font-weight: 600;">
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
              <span v-if="request.classroom">Room: {{ request.classroom }}</span>
              <span v-if="request.program" class="program-sub">{{ request.program }}</span>
            </td>
            <td>{{ formatDateTime(request.createdAt) }}</td>
            <td>{{ formatDateTime(request.dueAt) }}</td>
            <td>{{ request.returnedAt ? formatDateTime(request.returnedAt) : "-" }}</td>
            <td>
              <span :class="statusClass(getDisplayStatus(request))">{{ t(getDisplayStatus(request)).replace('_', ' ') }}</span>
            </td>
          </tr>
          <tr v-if="historyData.data.length === 0">
            <td colspan="9" class="empty-row-text">{{ t('No borrow history records match filters.') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div class="pagination-footer">
      <div class="pagination-info">
        {{ t('Showing ') }}{{ historyData.data.length }}{{ t(' of ') }}{{ historyData.total }}{{ t(' records') }}
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
</template>

<style scoped>
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
  color: #727285;
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
  color: #727285;
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
  color: #727285;
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
  color: #727285;
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
