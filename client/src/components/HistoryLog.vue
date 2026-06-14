<script setup>
import { reactive, watch, onMounted } from "vue";
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

function statusClass(status) {
  return `status-chip ${status.toLowerCase()}`;
}

onMounted(() => {
  if (["STUDENT", "EVENT_STAFF", "SUPPORT"].includes(props.session.user.role)) {
    filters.userId = props.session.user.id;
  }
  emitFetch();
});
</script>

<template>
  <section class="panel history-log-panel">
    <div class="panel-heading">
      <div>
        <h2>Borrowing History Log</h2>
        <p>Search, filter, and view past and active borrow requests.</p>
      </div>
    </div>

    <!-- Filters Toolbar -->
    <div class="filters-bar">
      <div class="filter-group search-box">
        <Search :size="16" class="filter-icon" />
        <input 
          v-model="filters.search" 
          type="text" 
          placeholder="Search items, users, classroom..." 
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <Filter :size="16" class="filter-icon" />
        <select v-model="filters.status" class="filter-select">
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="BORROWED">Borrowed</option>
          <option value="RETURNED">Returned</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div class="filter-group">
        <select v-model="filters.purpose" class="filter-select">
          <option value="">All Purposes</option>
          <option value="CLASSROOM">Classroom</option>
          <option value="LAB">Lab</option>
          <option value="RESEARCH">Research</option>
          <option value="EVENT">Event</option>
        </select>
      </div>

      <div class="filter-group">
        <select v-model="filters.sortBy" class="filter-select">
          <option value="createdAt">Date Created</option>
          <option value="dueAt">Due Date</option>
          <option value="returnedAt">Returned Date</option>
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
          {{ filters.sortOrder === 'asc' ? 'Ascending' : 'Descending' }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Equipment</th>
            <th>Purpose</th>
            <th>Classroom / Program</th>
            <th>Borrowed At</th>
            <th>Due At</th>
            <th>Returned At</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="request in historyData.data" :key="request.id">
            <td>
              <strong>{{ request.lecturer?.name }}</strong>
              <span class="user-sub">{{ request.lecturer?.email }}</span>
            </td>
            <td>
              <strong>{{ request.equipment?.name }}</strong>
              <span class="asset-sub">{{ request.equipment?.assetCode }}</span>
            </td>
            <td>
              <span class="purpose-badge">{{ request.purpose }}</span>
            </td>
            <td>
              <span v-if="request.classroom">Room: {{ request.classroom }}</span>
              <span v-if="request.program" class="program-sub">{{ request.program }}</span>
            </td>
            <td>{{ formatDateTime(request.createdAt) }}</td>
            <td>{{ formatDateTime(request.dueAt) }}</td>
            <td>{{ request.returnedAt ? formatDateTime(request.returnedAt) : "-" }}</td>
            <td>
              <span :class="statusClass(request.status)">{{ request.status }}</span>
            </td>
          </tr>
          <tr v-if="historyData.data.length === 0">
            <td colspan="8" class="empty-row-text">No borrow history records match filters.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Footer -->
    <div class="pagination-footer">
      <div class="pagination-info">
        Showing {{ historyData.data.length }} of {{ historyData.total }} records
      </div>
      <div class="pagination-actions">
        <button 
          type="button" 
          class="pagination-btn"
          :disabled="filters.page <= 1"
          @click="prevPage"
        >
          <ChevronLeft :size="16" /> Previous
        </button>
        <span class="page-indicator">Page {{ filters.page }} of {{ Math.ceil(historyData.total / filters.limit) || 1 }}</span>
        <button 
          type="button" 
          class="pagination-btn"
          :disabled="filters.page >= Math.ceil(historyData.total / filters.limit)"
          @click="nextPage"
        >
          Next <ChevronRight :size="16" />
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
.page-indicator {
  font-size: 13px;
  font-weight: 600;
  color: #3e3e4a;
}
</style>
