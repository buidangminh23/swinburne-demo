<script setup>
import { computed, reactive, ref } from "vue";
import {
  Bell,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  History,
  Home,
  Pencil,
  ScrollText,
  UserRound,
  Settings2,
  ShieldCheck,
  HelpCircle
} from "@lucide/vue";
import BorrowPanel from "./BorrowPanel.vue";
import EditBorrowModal from "./EditBorrowModal.vue";
import EquipmentTable from "./EquipmentTable.vue";
import ReturnPanel from "./ReturnPanel.vue";
import StatusPanel from "./StatusPanel.vue";
import SummaryCards from "./SummaryCards.vue";
import HistoryLog from "./HistoryLog.vue";
import SchedulesView from "./SchedulesView.vue";
import swinburneLogo from "../assets/swinburne-vietnam-logo.svg";
import FAQView from "./FAQView.vue";
import RequestListView from "./RequestListView.vue";
import AdminEquipmentView from "./AdminEquipmentView.vue";
import AdminUsersView from "./AdminUsersView.vue";
import ProfileView from "./ProfileView.vue";

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  }
});

const emit = defineEmits([
  "logout", "borrow", "return", "status", "approve", "deny", "extend", "edit", 
  "custody", "remind", "check-out", "fetch-history", "add-equipment", "edit-equipment", "update-user-role"
]);

const profileOpen = ref(false);
const activeTab = ref("dashboard");
const notifOpen = ref(false);
const editingRequest = ref(null);
const custodyTarget = ref(null);
const custodyForm = reactive({ action: "HANDOVER", notes: "" });

function parseCustody(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function openCustody(request) {
  custodyTarget.value = request;
  custodyForm.action = "HANDOVER";
  custodyForm.notes = "";
}

function submitCustody() {
  emit("custody", { id: custodyTarget.value.id, payload: { action: custodyForm.action, notes: custodyForm.notes } });
  custodyTarget.value = null;
}

function submitEdit(event) {
  emit("edit", event);
  editingRequest.value = null;
}

function confirmDeny(id) {
  if (window.confirm("Deny / cancel this request? This action cannot be undone.")) {
    emit("deny", id);
  }
}

const isStudent = computed(() => props.session.user.role === "STUDENT");
const isAdmin = computed(() => props.session.user.role === "ADMIN");
const isSupport = computed(() => props.session.user.role === "SUPPORT");
const isLecturer = computed(() => props.session.user.role === "LECTURER");
const isEventStaff = computed(() => props.session.user.role === "EVENT_STAFF");
const isOperations = computed(() => props.session.user.role === "OPERATIONS");
const displayEmail = computed(() => props.session.user.email);
const displayName = computed(() => props.session.user.name);

const displayRole = computed(() => {
  const role = props.session.user.role;
  if (role === "LECTURER") return "Lecturer";
  if (role === "STUDENT") return "Student";
  if (role === "EVENT_STAFF") return "Event Coordinator";
  if (role === "SUPPORT") return "Support Desk";
  if (role === "OPERATIONS") return "Operations";
  return "Admin";
});

const avatarLetter = computed(() => props.session.user.name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase());

// Dashboard computed lists
const pendingRequests = computed(() => {
  return props.state.requests.filter(r => r.status === "REQUESTED");
});

const overdueRequests = computed(() => {
  const now = new Date();
  let list = props.state.requests.filter(r => r.status === "BORROWED" && new Date(r.dueAt) < now);
  if (props.session.user.role === "LECTURER") {
    const lecturerId = props.session.user.id;
    list = list.filter(r => r.lecturerId === lecturerId || r.lecturer?.lecturerId === lecturerId);
  }
  return list;
});

const nearDueRequests = computed(() => {
  const now = new Date();
  const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
  let list = props.state.requests.filter(r => r.status === "BORROWED" && new Date(r.dueAt) > now && new Date(r.dueAt) < limit);
  if (props.session.user.role === "LECTURER") {
    const lecturerId = props.session.user.id;
    list = list.filter(r => r.lecturerId === lecturerId || r.lecturer?.lecturerId === lecturerId);
  }
  return list;
});

const myActiveRequests = computed(() => {
  return props.state.requests.filter(r => ["REQUESTED", "RESERVED", "BORROWED"].includes(r.status) && r.lecturerId === props.session.user.id);
});

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function getDisplayStatus(req) {
  if (req.status === "BORROWED") {
    const now = new Date();
    const due = new Date(req.dueAt);
    if (due < now) {
      return "OVERDUE";
    }
    const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (due < limit) {
      return "NEAR_DUE";
    }
  }
  return req.status;
}

import { makeTranslator } from "../translate";
const t = makeTranslator(props.session?.user?.email);

const activeTabDisplay = computed(() => {
  if (activeTab.value === 'dashboard') return t('Dashboard');
  if (activeTab.value === 'equipment') return t('All Requests');
  if (activeTab.value === 'pending-approvals') return t('Pending Approvals');
  if (activeTab.value === 'borrow') return t('Borrow Equipment');
  if (activeTab.value === 'history') return t('History Log');
  if (activeTab.value === 'schedules') return t('Schedules');
  if (activeTab.value === 'faq') return t('FAQ');
  if (activeTab.value === 'profile') return t('My Profile');
  return activeTab.value;
});
</script>

<template>
  <div class="portal-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img class="swin-logo" :src="swinburneLogo" alt="Swinburne University of Technology Alliance with FPT Education" />
      </div>
      <nav class="sidebar-nav" aria-label="Portal navigation">
        <a :class="{ active: activeTab === 'dashboard' }" href="#" @click.prevent="activeTab = 'dashboard'"><Home :size="18" /> {{ t('Dashboard') }}</a>
        <span class="nav-group">{{ t('Custom') }}</span>
        
        <!-- Admin views -->
        <a v-if="isAdmin" :class="{ active: activeTab === 'admin-equipment' }" href="#" @click.prevent="activeTab = 'admin-equipment'"><Boxes :size="18" /> Equipment Management</a>
        <a v-if="isAdmin" :class="{ active: activeTab === 'admin-users' }" href="#" @click.prevent="activeTab = 'admin-users'"><UserRound :size="18" /> User Management</a>
        
        <a v-if="isAdmin || isSupport || isLecturer || isOperations" :class="{ active: activeTab === 'equipment' }" href="#" @click.prevent="activeTab = 'equipment'"><Boxes :size="18" /> {{ t('All Requests') }}</a>
        <a v-if="isAdmin || isSupport || isLecturer || isOperations" :class="{ active: activeTab === 'pending-approvals' }" href="#" @click.prevent="activeTab = 'pending-approvals'"><ShieldCheck :size="18" /> {{ t('Pending Approvals') }}</a>
        <a v-if="!isAdmin && session.user.email !== 'vovinamteacher@fpt.edu.vn'" :class="{ active: activeTab === 'borrow' }" href="#" @click.prevent="activeTab = 'borrow'"><ClipboardList :size="18" /> {{ t('Borrow Equipment') }}</a>
        <a :class="{ active: activeTab === 'history' }" href="#" @click.prevent="activeTab = 'history'"><History :size="18" /> {{ t('History Log') }}</a>
        <a :class="{ active: activeTab === 'schedules' }" href="#" @click.prevent="activeTab = 'schedules'"><CalendarDays :size="18" /> {{ t('Schedules') }}</a>
        <a v-if="isSupport || isAdmin || isOperations" :class="{ active: activeTab === 'returns' }" href="#" @click.prevent="activeTab = 'returns'"><CheckCircle2 :size="18" /> Confirm Return</a>
        <a v-if="isAdmin || isSupport || isLecturer || isOperations" :class="{ active: activeTab === 'status' }" href="#" @click.prevent="activeTab = 'status'"><Settings2 :size="18" /> Update Status</a>
        <a :class="{ active: activeTab === 'faq' }" href="#" @click.prevent="activeTab = 'faq'"><HelpCircle :size="18" /> {{ t('FAQ') }}</a>
      </nav>
    </aside>

    <main class="portal-frame">
      <header class="portal-topbar">
        <div class="topbar-actions">
          <div class="notif-wrap">
            <button class="icon-button" aria-label="Notifications" @click="notifOpen = !notifOpen">
              <Bell :size="18" />
              <span v-if="pendingRequests.length > 0">{{ pendingRequests.length }}</span>
              <span v-else>0</span>
            </button>
            <div v-if="notifOpen" class="notif-menu">
              <div class="notif-head">{{ t('Notifications') }}</div>
              <div v-if="state.notifications.length === 0" class="notif-empty">{{ t('No notifications yet.') }}</div>
              <div v-for="n in state.notifications" :key="n.id" class="notif-item">
                <strong>{{ n.subject }}</strong>
                <span>{{ n.message }}</span>
                <small>{{ n.type }} · {{ n.channel }}</small>
              </div>
            </div>
          </div>
          <span>{{ t('Hi, ') }}{{ session.user.name.split(" ").at(-1) }}</span>
          <button class="avatar-button" aria-label="Open profile menu" @click="profileOpen = !profileOpen">
            <span class="avatar">{{ avatarLetter }}</span>
          </button>
          <div v-if="profileOpen" class="profile-menu">
            <div class="profile-menu-hero">
              <div class="profile-menu-avatar">{{ avatarLetter }}</div>
              <div>
                <strong>{{ displayName }}</strong>
                <span>{{ t(displayRole) }}</span>
              </div>
            </div>
            <a href="#" @click.prevent="activeTab = 'profile'; profileOpen = false">
              <UserRound :size="18" />
              {{ t('My Profile') }}
            </a>
            <button class="profile-signout" @click="$emit('logout')">{{ t('Sign Out') }}</button>
          </div>
        </div>
      </header>

      <section class="breadcrumb-bar">
        <div class="breadcrumb">
          <span>Swinburne</span>
          <ChevronLeft :size="12" style="transform: rotate(180deg);" />
          <span>{{ activeTabDisplay }}</span>
        </div>
      </section>

      <section class="portal-main">


        <div v-if="state.message" class="notice success">{{ t(state.message) }}</div>
        <div v-if="state.error" class="notice error">{{ t(state.error) }}</div>

        <!-- Render depending on activeTab -->
        <template v-if="activeTab === 'dashboard'">
          <div class="dashboard-widgets-grid">
            <!-- 1. PENDING APPROVALS (Lecturer/Support/Admin only) -->
            <div v-if="!isStudent" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>{{ t('Pending Approval Requests') }} ({{ pendingRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Requester') }}</th>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('University / Purpose') }}</th>
                      <th>{{ t('Classroom') }}</th>
                      <th>{{ t('Actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in pendingRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td>
                        <span class="program-span">{{ req.program || "-" }}</span>
                        <span class="purpose-span">{{ t(req.purpose) }}</span>
                      </td>
                      <td>{{ req.classroom || "-" }}</td>
                      <td class="action-cell">
                        <button class="widget-btn approve-btn" @click="$emit('approve', req.id)">{{ t('Approve') }}</button>
                        <button class="widget-btn deny-btn" @click="confirmDeny(req.id)">{{ t('Deny') }}</button>
                      </td>
                    </tr>
                    <tr v-if="pendingRequests.length === 0">
                      <td colspan="5" class="empty-widget-text">{{ t('No pending approval requests.') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. OVERDUE RETURNS (Lecturer/Support/Admin only) -->
            <div v-if="!isStudent && overdueRequests.length > 0" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2 class="text-danger">⚠️ {{ t('Overdue Returns') }} ({{ overdueRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Borrower') }}</th>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Action') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in overdueRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td class="overdue-text">
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px; font-weight: normal;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td>
                        <button class="widget-btn remind-btn" @click="$emit('remind', req.id)">{{ t('Email Reminder') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. NEAR DUE BORROWED EQUIPMENT -->
            <div v-if="!isStudent && nearDueRequests.length > 0" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2 class="text-warning">🕒 {{ t('Near Due Borrowed Equipment') }} ({{ nearDueRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Borrower') }}</th>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in nearDueRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td class="warning-text">
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px; font-weight: normal;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td class="action-cell">
                        <button v-if="req.purpose === 'RESEARCH'" class="widget-btn extend-btn" @click="$emit('extend', { id: req.id, payload: {} })">{{ t('Extend 7d') }}</button>
                        <button class="widget-btn remind-btn" @click="$emit('remind', req.id)">{{ t('Send Reminder') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. MY REQUESTS & BORROWS -->
            <div class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>{{ t('My Requests & Borrows') }} ({{ myActiveRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Purpose') }}</th>
                      <th>{{ t('Status') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in myActiveRequests" :key="req.id">
                      <td>{{ req.equipment?.name }}</td>
                      <td><span class="purpose-span">{{ t(req.purpose) }}</span></td>
                      <td><span :class="'status-chip ' + getDisplayStatus(req).toLowerCase().replace('_', '-')">{{ t(getDisplayStatus(req)).replace('_', ' ') }}</span></td>
                      <td>
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td class="action-cell">
                        <button class="widget-btn edit-btn" @click="editingRequest = req"><Pencil :size="12" /> {{ t('Edit') }}</button>
                        <button v-if="req.status === 'BORROWED'" class="widget-btn return-btn" @click="activeTab = 'returns'">{{ t('Return') }}</button>
                        <button v-if="req.status === 'RESERVED' && !isStudent" class="widget-btn approve-btn" @click="$emit('check-out', req.id)">{{ t('Check Out') }}</button>
                        <button v-if="req.status === 'BORROWED' && req.purpose === 'RESEARCH'" class="widget-btn extend-btn" @click="$emit('extend', { id: req.id, payload: {} })">{{ t('Extend 7d') }}</button>
                        <button v-if="req.purpose === 'EVENT'" class="widget-btn custody-btn" @click="openCustody(req)"><ScrollText :size="12" /> {{ t('Custody') }}</button>
                      </td>
                    </tr>
                    <tr v-if="myActiveRequests.length === 0">
                      <td colspan="5" class="empty-widget-text">{{ t('You have no active requests or borrows.') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
        
        <template v-else-if="activeTab === 'equipment'">
          <RequestListView 
            key="equipment"
            :requests="state.requests" 
            :session="session"
            @approve="$emit('approve', $event)"
            @deny="confirmDeny"
            @extend="$emit('extend', $event)"
            @edit="editingRequest = $event"
            @custody="openCustody"
            @remind="$emit('remind', $event)"
            @check-out="$emit('check-out', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'pending-approvals'">
          <RequestListView 
            key="pending"
            :requests="state.requests" 
            :session="session"
            initialStatus="REQUESTED"
            @approve="$emit('approve', $event)"
            @deny="confirmDeny"
            @extend="$emit('extend', $event)"
            @edit="editingRequest = $event"
            @custody="openCustody"
            @remind="$emit('remind', $event)"
            @check-out="$emit('check-out', $event)"
          />
        </template>
        
        <template v-else-if="activeTab === 'borrow'">
          <BorrowPanel :equipment="state.equipment" :is-student="isStudent" :user-role="session.user.role" :session="session" @borrow="$emit('borrow', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'returns'">
          <ReturnPanel :requests="state.requests" @return="$emit('return', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'history'">
          <HistoryLog :historyData="state.historyData" :session="session" @fetch="$emit('fetch-history', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'schedules'">
          <SchedulesView :equipment="state.equipment" :session="session" @borrow="$emit('borrow', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'status'">
          <StatusPanel :equipment="state.equipment" @status="$emit('status', $event)" />
        </template>

        <template v-else-if="activeTab === 'admin-equipment'">
          <AdminEquipmentView 
            :equipment="state.equipment" 
            @add-equipment="$emit('add-equipment', $event)"
            @edit-equipment="$emit('edit-equipment', $event)"
            @status="$emit('status', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'admin-users'">
          <AdminUsersView 
            :users="state.users"
            :currentUser="session.user"
            @update-user-role="$emit('update-user-role', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'faq'">
          <FAQView :session="session" />
        </template>

        <template v-else-if="activeTab === 'profile'">
          <ProfileView :session="session" :state="state" />
        </template>
      </section>
    </main>

    <EditBorrowModal :request="editingRequest" :session="session" @save="submitEdit" @close="editingRequest = null" />

    <div v-if="custodyTarget" class="modal-overlay" @click.self="custodyTarget = null">
      <div class="modal-card">
        <header class="modal-header">
          <h3><ScrollText :size="16" /> {{ t('Chain of custody — ') }}{{ custodyTarget.equipment?.name }}</h3>
          <button type="button" class="close-btn" @click="custodyTarget = null">&times;</button>
        </header>
        <div class="custody-body">
          <ul class="custody-list">
            <li v-for="(entry, i) in parseCustody(custodyTarget.custodyLog)" :key="i" class="custody-entry">
              <div class="custody-entry-head">
                <strong>{{ t(entry.action) }}</strong>
                <small>{{ formatDate(entry.at) }}</small>
              </div>
              <span class="custody-actor">{{ entry.actor }}</span>
              <span v-if="entry.notes" class="custody-notes">{{ entry.notes }}</span>
            </li>
            <li v-if="parseCustody(custodyTarget.custodyLog).length === 0" class="custody-empty">
              {{ t('No custody entries yet.') }}
            </li>
          </ul>
          <form class="custody-form" @submit.prevent="submitCustody">
            <label>
              {{ t('Action') }}
              <select v-model="custodyForm.action">
                <option value="HANDOVER">{{ t('Handover') }}</option>
                <option value="CHECKED_OUT">{{ t('Checked out') }}</option>
                <option value="TRANSFER">{{ t('Transfer') }}</option>
                <option value="INSPECTED">{{ t('Inspected') }}</option>
              </select>
            </label>
            <label>
              {{ t('Notes') }}
              <textarea v-model="custodyForm.notes" rows="2" :placeholder="t('Who holds it now / condition...')"></textarea>
            </label>
            <button type="submit" class="btn-confirm">{{ t('Add custody entry') }}</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-widgets-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
.widget-table-wrap {
  padding: 0 26px 22px;
  overflow-x: auto;
}
.widget-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}
.widget-table th, .widget-table td {
  padding: 10px 8px;
  font-size: 13px;
  border-bottom: 1px solid #eeeeef;
  text-align: left;
}
.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.widget-btn {
  min-height: 28px;
  padding: 0 10px;
  font-size: 11px;
  border-radius: 2px;
  font-weight: 600;
  border: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.approve-btn { background: #e3f8ef; color: #047857; border: 1px solid #a7e9cc; }
.approve-btn:hover { background: #047857; color: white; }
.deny-btn { background: #ffe7ec; color: #d9182f; border: 1px solid #fec0cb; }
.deny-btn:hover { background: #d9182f; color: white; }
.remind-btn { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.remind-btn:hover { background: #1d4ed8; color: white; }
.extend-btn { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
.extend-btn:hover { background: #b45309; color: white; }
.return-btn { background: #e6fcf5; color: #0ca678; border: 1px solid #c3fae8; }
.return-btn:hover { background: #0ca678; color: white; }
.overdue-text { color: #d9182f; font-weight: 700; }
.warning-text { color: #b45309; font-weight: 700; }
.empty-widget-text { text-align: center; padding: 20px; color: #727285; font-style: italic; }

.program-span {
  display: block;
  font-size: 11px;
  color: #727285;
}
.purpose-span {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  background: #e0f2fe;
  color: #0369a1;
  padding: 1px 4px;
  border-radius: 2px;
  margin-top: 2px;
}
.text-danger { color: #d9182f; }
.text-warning { color: #b45309; }
.border-bottom-0 { border-bottom: 0; }

.edit-btn { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
.edit-btn:hover { background: #4338ca; color: white; }
.custody-btn { background: #f3e8ff; color: #7c3aed; border: 1px solid #ddd6fe; }
.custody-btn:hover { background: #7c3aed; color: white; }

.notif-wrap {
  position: relative;
}
.notif-menu {
  position: absolute;
  top: 42px;
  right: 0;
  width: 320px;
  max-height: 420px;
  overflow-y: auto;
  background: #ffffff;
  border: 1px solid #e6e6ee;
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
  z-index: 200;
}
.notif-head {
  padding: 12px 16px;
  font-weight: 800;
  font-size: 13px;
  border-bottom: 1px solid #eeeeef;
  color: #3e3e4a;
}
.notif-empty {
  padding: 18px 16px;
  font-size: 12px;
  color: #727285;
  font-style: italic;
}
.notif-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 16px;
  border-bottom: 1px solid #f2f2f6;
}
.notif-item strong {
  font-size: 12px;
  color: #1f2937;
}
.notif-item span {
  font-size: 11px;
  color: #555562;
}
.notif-item small {
  font-size: 10px;
  color: #9aa0a6;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: #ffffff;
  border-radius: 8px;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f7f5ff;
  border-bottom: 1px solid #eeeeef;
}
.modal-header h3 {
  margin: 0;
  font-size: 15px;
  color: #3e3e4a;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}
.close-btn {
  background: transparent;
  border: 0;
  font-size: 24px;
  line-height: 1;
  color: #a7a7b4;
  cursor: pointer;
  padding: 0;
}
.custody-body {
  padding: 16px 20px;
  overflow-y: auto;
}
.custody-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.custody-entry {
  background: #faf8ff;
  border: 1px solid #ece8fb;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.custody-entry-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.custody-entry-head strong {
  font-size: 12px;
  color: #5b21b6;
}
.custody-entry-head small {
  font-size: 10px;
  color: #9aa0a6;
}
.custody-actor {
  font-size: 12px;
  font-weight: 600;
  color: #3e3e4a;
}
.custody-notes {
  font-size: 11px;
  color: #555562;
}
.custody-empty {
  font-size: 12px;
  color: #727285;
  font-style: italic;
}
.custody-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid #eeeeef;
  padding-top: 14px;
}
.custody-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #474753;
}
.custody-form select,
.custody-form textarea {
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}
.btn-confirm {
  background: #5f63ff;
  color: #ffffff;
  border: 0;
  border-radius: 4px;
  min-height: 38px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}
</style>
