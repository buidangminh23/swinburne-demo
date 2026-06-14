<script setup>
import { computed, ref } from "vue";
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Pencil, 
  ScrollText, 
  ChevronRight,
  Mail
} from "@lucide/vue";

const props = defineProps({
  requests: {
    type: Array,
    required: true
  },
  session: {
    type: Object,
    required: true
  },
  initialStatus: {
    type: String,
    default: "ALL"
  }
});

const emit = defineEmits(["approve", "deny", "extend", "edit", "custody", "remind", "check-out"]);

const searchText = ref("");
const statusFilter = ref(props.initialStatus || "ALL");
const purposeFilter = ref("ALL");

const isStudent = computed(() => props.session.user.role === "STUDENT");
const isSupportOrAdmin = computed(() => ["SUPPORT", "ADMIN"].includes(props.session.user.role));

function canActOn(req) {
  const role = props.session.user.role;
  if (role === "LECTURER") {
    return req.lecturer?.role === "STUDENT" && req.lecturer?.lecturerId === props.session.user.id;
  }
  return ["SUPPORT", "ADMIN"].includes(role);
}

function getPriorityScore(req) {
  const now = new Date();
  if (req.status === "REQUESTED") return 1;
  if (req.status === "RESERVED") return 4;
  if (req.status === "BORROWED") {
    const due = new Date(req.dueAt);
    if (due < now) return 2; // Overdue
    const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (due < limit) return 3; // Near due (within 24 hours)
    return 4; // Normal borrowed
  }
  if (req.status === "RETURNED") return 5;
  if (req.status === "CANCELLED") return 6;
  return 7;
}

const filteredRequests = computed(() => {
  let list = [...props.requests];

  // Search keyword filter
  if (searchText.value.trim()) {
    const kw = searchText.value.toLowerCase().trim();
    list = list.filter(r => {
      const equipName = r.equipment?.name?.toLowerCase() || "";
      const assetCode = r.equipment?.assetCode?.toLowerCase() || "";
      const reqName = r.lecturer?.name?.toLowerCase() || "";
      const reqEmail = r.lecturer?.email?.toLowerCase() || "";
      const classroom = r.classroom?.toLowerCase() || "";
      const purpose = r.purpose?.toLowerCase() || "";
      const program = r.program?.toLowerCase() || "";
      const unit = r.unitOrProject?.toLowerCase() || "";
      
      return equipName.includes(kw) || 
             assetCode.includes(kw) || 
             reqName.includes(kw) || 
             reqEmail.includes(kw) || 
             classroom.includes(kw) ||
             purpose.includes(kw) ||
             program.includes(kw) ||
             unit.includes(kw);
    });
  }

  // Status Filter
  if (statusFilter.value !== "ALL") {
    if (statusFilter.value === "OVERDUE") {
      const now = new Date();
      list = list.filter(r => r.status === "BORROWED" && new Date(r.dueAt) < now);
    } else if (statusFilter.value === "NEAR_DUE") {
      list = list.filter(r => isNearDue(r));
    } else {
      list = list.filter(r => r.status === statusFilter.value);
    }
  }

  // Purpose Filter
  if (purposeFilter.value !== "ALL") {
    if (purposeFilter.value === "VOVINAM") {
      list = list.filter(r => r.classroom === "Vovinam Room");
    } else {
      list = list.filter(r => r.purpose === purposeFilter.value);
    }
  }



  // Priority Sorting
  list.sort((a, b) => {
    const scoreA = getPriorityScore(a);
    const scoreB = getPriorityScore(b);
    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }
    // Secondary sort: due date or creation date
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return list;
});

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function isOverdue(req) {
  return req.status === "BORROWED" && new Date(req.dueAt) < new Date();
}

function isNearDue(req) {
  const now = new Date();
  const due = new Date(req.dueAt);
  const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return req.status === "BORROWED" && due > now && due < limit;
}

function getDisplayStatus(req) {
  if (isOverdue(req)) return "OVERDUE";
  if (isNearDue(req)) return "NEAR_DUE";
  return req.status;
}

import { makeTranslator } from "../translate";
const t = makeTranslator(props.session?.user?.email);
</script>

<template>
  <section class="panel table-panel list-panel">
    <div class="panel-heading compact border-bottom-0 flex-column md-flex-row">
      <div class="panel-title-area">
        <h2>{{ t('All Requests & Borrows') }}</h2>
        <p>{{ t('Prioritized request lifecycle view with advanced search and filters.') }}</p>
      </div>

      <!-- Filters & Search Bar -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <Search :size="16" class="search-icon" />
          <input 
            v-model="searchText" 
            type="text" 
            :placeholder="t('Search by equipment, requester, location...')" 
            class="search-input"
          />
        </div>

        <div class="filters-select-wrap">
          <select v-model="statusFilter" class="filter-select">
            <option value="ALL">{{ t('All Statuses') }}</option>
            <option value="REQUESTED">{{ t('Pending Approval') }}</option>
            <option value="RESERVED">{{ t('Reserved') }}</option>
            <option value="BORROWED">{{ t('Borrowed') }}</option>
            <option value="NEAR_DUE">⏰ {{ t('Near Due Date') }}</option>
            <option value="OVERDUE">⚠️ {{ t('OVERDUE') }}</option>
            <option value="RETURNED">{{ t('Returned') }}</option>
            <option value="CANCELLED">{{ t('Cancelled') }}</option>
          </select>

          <select v-model="purposeFilter" class="filter-select">
            <option value="ALL">{{ t('All Purposes') }}</option>
            <option value="CLASSROOM">{{ t('Classroom') }}</option>
            <option value="VOVINAM">{{ t('Vovinam Room') }}</option>
            <option value="LAB">{{ t('Lab') }}</option>
            <option value="RESEARCH">{{ t('Research') }}</option>
            <option value="EVENT">{{ t('Event') }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="table-wrap">
      <table class="requests-table">
        <thead>
          <tr>
            <th>{{ t('Priority & Status') }}</th>
            <th>{{ t('Requester') }}</th>
            <th>{{ t('Equipment') }}</th>
            <th>{{ t('Purpose & Details') }}</th>
            <th>{{ t('Classroom/Location') }}</th>
            <th>{{ t('Due Date') }}</th>
            <th>{{ t('Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="req in filteredRequests" 
            :key="req.id" 
            :class="{ 
              'row-requested': req.status === 'REQUESTED',
              'row-overdue': isOverdue(req),
              'row-neardue': isNearDue(req)
            }"
          >
            <!-- Status Badge -->
            <td class="status-cell">
              <div class="status-indicator-wrap">
                <span :class="'status-chip ' + getDisplayStatus(req).toLowerCase().replace('_', '-')">
                  {{ t(getDisplayStatus(req)).replace('_', ' ') }}
                </span>
              </div>
            </td>

            <!-- Requester -->
            <td>
              <div class="user-cell">
                <strong class="user-name">{{ req.lecturer?.name }}</strong>
                <span class="user-role-sub">{{ t(req.lecturer?.role) }}</span>
                <span class="user-email-sub">{{ req.lecturer?.email }}</span>
              </div>
            </td>

            <!-- Equipment -->
            <td>
              <div class="equip-cell">
                <strong class="equip-name">{{ req.equipment?.name }}</strong>
                <span class="asset-code">{{ req.equipment?.assetCode }}</span>
                <span class="qty-sub">{{ t('Quantity: ') }}{{ req.quantity }}</span>
              </div>
            </td>

            <!-- Purpose & Details -->
            <td>
              <div class="details-cell">
                <span class="purpose-tag" :class="req.purpose.toLowerCase()">{{ t(req.purpose) }}</span>
                <span v-if="req.program" class="program-sub">{{ req.program }}</span>
                <span v-if="req.unitOrProject" class="unit-sub">{{ t('Unit: ') }}{{ req.unitOrProject }}</span>
              </div>
            </td>

            <!-- Classroom/Location -->
            <td>
              <div class="location-cell">
                <strong>{{ req.classroom || "-" }}</strong>
                <span class="location-sub">{{ req.equipment?.location }}</span>
              </div>
            </td>

            <!-- Due Date -->
            <td>
              <div class="due-cell" :class="{ 'overdue-text': isOverdue(req), 'warning-text': isNearDue(req) }">
                <span v-if="req.startDate" style="color: #727285; font-size: 11px;">{{ t('From') }}: {{ formatDate(req.startDate) }}</span>
                <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                <span v-if="req.returnedAt" class="returned-sub">{{ t('Returned: ') }}{{ formatDate(req.returnedAt) }}</span>
              </div>
            </td>

            <!-- Actions Column -->
            <td class="action-cell">
              <div class="actions-wrapper">
                 <!-- Approval Actions (Support/Admin/Lecturers) -->
                <template v-if="req.status === 'REQUESTED' && canActOn(req)">
                  <button 
                    class="action-btn approve" 
                    @click="emit('approve', req.id)"
                    :title="t('Approve')"
                  >
                    {{ t('Approve') }}
                  </button>
                  <button 
                    class="action-btn deny" 
                    @click="emit('deny', req.id)"
                    :title="t('Deny')"
                  >
                    {{ t('Deny') }}
                  </button>
                </template>

                <!-- General actions -->
                <button 
                  v-if="['REQUESTED', 'BORROWED'].includes(req.status) && (session.user.id === req.lecturerId || isSupportOrAdmin)"
                  class="action-btn edit" 
                  @click="emit('edit', req)"
                  :title="t('Edit')"
                >
                  <Pencil :size="12" /> {{ t('Edit') }}
                </button>

                <!-- Check out a reserved booking -->
                <button
                  v-if="req.status === 'RESERVED' && !isStudent"
                  class="action-btn approve"
                  @click="emit('check-out', req.id)"
                  :title="t('Check out reserved equipment')"
                >
                  {{ t('Check Out') }}
                </button>

                <!-- Extend action for RESEARCH purposes -->
                <button 
                  v-if="req.status === 'BORROWED' && req.purpose === 'RESEARCH'"
                  class="action-btn extend"
                  @click="emit('extend', { id: req.id, payload: {} })"
                  :title="t('Extend borrowing by 7 days')"
                >
                  {{ t('Extend 7d') }}
                </button>

                <!-- Custody action for EVENT purposes -->
                <button 
                  v-if="req.purpose === 'EVENT'"
                  class="action-btn custody"
                  @click="emit('custody', req)"
                  :title="t('View or update chain of custody')"
                >
                  <ScrollText :size="12" /> {{ t('Custody') }}
                </button>

                <!-- Reminder email action (Staff only, for overdue or near due) -->
                <button 
                  v-if="req.status === 'BORROWED' && !isStudent && (isOverdue(req) || isNearDue(req))"
                  class="action-btn remind"
                  @click="emit('remind', req.id)"
                  :title="t('Send email reminder to borrower')"
                >
                  <Mail :size="12" /> {{ t('Remind') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredRequests.length === 0">
            <td colspan="7" class="empty-state-cell">
              {{ t('No requests matching your filters were found.') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.list-panel {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.flex-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (min-width: 900px) {
  .md-flex-row {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.panel-title-area {
  flex: 1;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  width: 100%;
  max-width: 650px;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #a7a7b4;
}

.search-input {
  width: 100%;
  height: 38px;
  padding-left: 36px;
  font-size: 13px;
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  outline: none;
}

.search-input:focus {
  border-color: #5f63ff;
  box-shadow: 0 0 0 3px rgba(95, 99, 255, 0.12);
}

.filters-select-wrap {
  display: flex;
  gap: 8px;
}

.filter-select {
  height: 38px;
  padding: 0 12px;
  font-size: 12.5px;
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  background-color: #ffffff;
  outline: none;
  cursor: pointer;
}

.filter-select:focus {
  border-color: #5f63ff;
}

.requests-table {
  width: 100%;
  min-width: 900px !important;
}

/* Custom Row Styles based on Priority */
.row-requested {
  background-color: #faf9ff;
}

.row-requested:hover {
  background-color: #f5f3ff;
}

.row-overdue {
  background-color: #fffafb;
}

.row-overdue:hover {
  background-color: #fff3f5;
}

.row-neardue {
  background-color: #fffdf9;
}

.row-neardue:hover {
  background-color: #fff8eb;
}

.status-indicator-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}

.badge-tag {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 3px;
  letter-spacing: 0.3px;
  display: inline-block;
}

.badge-tag.overdue {
  background: #ffe5e9;
  color: #b91c1c;
}

.badge-tag.neardue {
  background: #fef3c7;
  color: #d97706;
}

.user-cell, .equip-cell, .details-cell, .location-cell, .due-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-name {
  color: #3e3e4a;
  font-size: 13.5px;
}

.user-role-sub {
  font-size: 10.5px;
  font-weight: 800;
  color: #6d55ff;
}

.user-email-sub, .qty-sub, .location-sub, .returned-sub, .program-sub, .unit-sub {
  font-size: 11px;
  color: #727285;
}

.equip-name {
  color: #3e3e4a;
  font-size: 13.5px;
}

.purpose-tag {
  display: inline-block;
  align-self: flex-start;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
}

.purpose-tag.classroom { background: #e0f2fe; color: #0369a1; }
.purpose-tag.lab { background: #dcfce7; color: #15803d; }
.purpose-tag.research { background: #fef3c7; color: #b45309; }
.purpose-tag.event { background: #f3e8ff; color: #6d28d9; }

.overdue-text {
  color: #b91c1c;
  font-weight: 700;
}

.warning-text {
  color: #b45309;
  font-weight: 700;
}

.actions-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-btn {
  min-height: 28px;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 3px;
  border: 1px solid transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: white;
}

.action-btn.approve {
  background: #ecfdf5;
  color: #047857;
  border-color: #a7f3d0;
}

.action-btn.approve:hover {
  background: #047857;
  color: white;
}

.action-btn.deny {
  background: #fef2f2;
  color: #b91c1c;
  border-color: #fca5a5;
}

.action-btn.deny:hover {
  background: #b91c1c;
  color: white;
}

.action-btn.edit {
  background: #f0fdfa;
  color: #0d9488;
  border-color: #99f6e4;
}

.action-btn.edit:hover {
  background: #0d9488;
  color: white;
}

.action-btn.extend {
  background: #fffbeb;
  color: #d97706;
  border-color: #fde68a;
}

.action-btn.extend:hover {
  background: #d97706;
  color: white;
}

.action-btn.custody {
  background: #faf5ff;
  color: #7c3aed;
  border-color: #e9d5ff;
}

.action-btn.custody:hover {
  background: #7c3aed;
  color: white;
}

.action-btn.remind {
  background: #f0f9ff;
  color: #0284c7;
  border-color: #bae6fd;
}

.action-btn.remind:hover {
  background: #0284c7;
  color: white;
}

.empty-state-cell {
  text-align: center;
  padding: 36px 0;
  color: #727285;
  font-style: italic;
  font-size: 13.5px;
}
</style>
