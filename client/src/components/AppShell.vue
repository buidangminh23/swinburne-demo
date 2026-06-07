<script setup>
import { computed, ref } from "vue";
import {
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileQuestion,
  History,
  Home,
  MessageSquare,
  UserRound,
  Settings2,
  ShieldCheck,
  Users
} from "@lucide/vue";
import BorrowPanel from "./BorrowPanel.vue";
import EquipmentTable from "./EquipmentTable.vue";
import ReturnPanel from "./ReturnPanel.vue";
import SprintTimeline from "./SprintTimeline.vue";
import StatusPanel from "./StatusPanel.vue";
import SummaryCards from "./SummaryCards.vue";
import HistoryLog from "./HistoryLog.vue";
import SchedulesView from "./SchedulesView.vue";
import swinburneLogo from "../assets/swinburne-vietnam-logo.svg";

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

defineEmits(["logout", "borrow", "return", "status", "approve", "deny", "extend", "remind", "fetch-history"]);

const profileOpen = ref(false);
const activeTab = ref("dashboard");

const isStudent = computed(() => props.session.user.role === "STUDENT");
const displayEmail = computed(() => props.session.user.email);
const displayName = computed(() => props.session.user.name);

const displayRole = computed(() => {
  const role = props.session.user.role;
  if (role === "LECTURER") return "Lecturer";
  if (role === "STUDENT") return "Student";
  if (role === "EVENT_STAFF") return "Event Coordinator";
  if (role === "SUPPORT") return "Support Desk";
  return "Admin";
});

const avatarLetter = computed(() => props.session.user.name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase());

// Dashboard computed lists
const pendingRequests = computed(() => {
  return props.state.requests.filter(r => r.status === "REQUESTED");
});

const overdueRequests = computed(() => {
  const now = new Date();
  return props.state.requests.filter(r => r.status === "BORROWED" && new Date(r.dueAt) < now);
});

const nearDueRequests = computed(() => {
  const now = new Date();
  const limit = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return props.state.requests.filter(r => r.status === "BORROWED" && new Date(r.dueAt) > now && new Date(r.dueAt) < limit);
});

const userBorrowedRequests = computed(() => {
  return props.state.requests.filter(r => r.status === "BORROWED" && r.lecturerId === props.session.user.id);
});

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
</script>

<template>
  <div class="portal-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img class="swin-logo" :src="swinburneLogo" alt="Swinburne University of Technology Alliance with FPT Education" />
        <button class="collapse-button" aria-label="Collapse sidebar">
          <ChevronLeft :size="18" />
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Portal navigation">
        <a :class="{ active: activeTab === 'dashboard' }" href="#" @click.prevent="activeTab = 'dashboard'"><Home :size="18" /> Dashboard</a>
        <span class="nav-group">Custom</span>
        <a :class="{ active: activeTab === 'equipment' }" href="#" @click.prevent="activeTab = 'equipment'"><Boxes :size="18" /> Equipment</a>
        <a :class="{ active: activeTab === 'borrow' }" href="#" @click.prevent="activeTab = 'borrow'"><ClipboardList :size="18" /> Borrow Equipment</a>
        <a :class="{ active: activeTab === 'history' }" href="#" @click.prevent="activeTab = 'history'"><History :size="18" /> History Log</a>
        <a :class="{ active: activeTab === 'schedules' }" href="#" @click.prevent="activeTab = 'schedules'"><CalendarDays :size="18" /> Schedules</a>
        <a :class="{ active: activeTab === 'returns' }" href="#" @click.prevent="activeTab = 'returns'"><CheckCircle2 :size="18" /> Confirm Return</a>
        <a :class="{ active: activeTab === 'status' }" href="#" @click.prevent="activeTab = 'status'"><Settings2 :size="18" /> Update Status</a>
        <a :class="{ active: activeTab === 'roadmap' }" href="#" @click.prevent="activeTab = 'roadmap'"><CalendarDays :size="18" /> Sprint Roadmap</a>
      </nav>
    </aside>

    <main class="portal-frame">
      <header class="portal-topbar">
        <div class="topbar-actions">
          <button class="icon-button" aria-label="Notifications">
            <Bell :size="18" />
            <span v-if="pendingRequests.length > 0">{{ pendingRequests.length }}</span>
            <span v-else>0</span>
          </button>
          <span>Hi, {{ session.user.name.split(" ").at(-1) }}</span>
          <button class="avatar-button" aria-label="Open profile menu" @click="profileOpen = !profileOpen">
            <span class="avatar">{{ avatarLetter }}</span>
          </button>
          <div v-if="profileOpen" class="profile-menu">
            <div class="profile-menu-hero">
              <div class="profile-menu-avatar">{{ avatarLetter }}</div>
              <div>
                <strong>{{ displayName }}</strong>
                <span>{{ displayRole }}</span>
              </div>
            </div>
            <a href="#" @click.prevent="activeTab = 'dashboard'; profileOpen = false">
              <UserRound :size="18" />
              My Profile
            </a>
            <a href="#" @click.prevent="activeTab = 'history'; profileOpen = false">
              <History :size="18" />
              Borrow history
            </a>
            <button class="profile-signout" @click="$emit('logout')">Sign Out</button>
          </div>
        </div>
      </header>

      <section class="breadcrumb-bar">
        <div class="breadcrumb">
          <span>Swinburne</span>
          <ChevronLeft :size="12" style="transform: rotate(180deg);" />
          <span style="text-transform: capitalize;">{{ activeTab }}</span>
        </div>
      </section>

      <section class="portal-main">
        <div class="profile-panel">
          <div>
            <div class="profile-title">
              <h1>{{ session.user.name }}</h1>
              <ShieldCheck :size="20" />
            </div>
            <div class="profile-meta">
              <span>{{ displayEmail }}</span>
              <span>Role: <strong>{{ displayRole }}</strong></span>
              <span>29/5 Sprint 1 demo</span>
            </div>
          </div>
          <SummaryCards :summary="state.summary" />
        </div>

        <div v-if="state.message" class="notice success">{{ state.message }}</div>
        <div v-if="state.error" class="notice error">{{ state.error }}</div>

        <!-- Render depending on activeTab -->
        <template v-if="activeTab === 'dashboard'">
          <div class="dashboard-widgets-grid">
            <!-- 1. PENDING APPROVALS (Lecturer/Support/Admin only) -->
            <div v-if="!isStudent && pendingRequests.length > 0" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>Pending Approval Requests ({{ pendingRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>Requester</th>
                      <th>Equipment</th>
                      <th>Program / Purpose</th>
                      <th>Classroom</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in pendingRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td>
                        <span class="program-span">{{ req.program || "-" }}</span>
                        <span class="purpose-span">{{ req.purpose }}</span>
                      </td>
                      <td>{{ req.classroom || "-" }}</td>
                      <td class="action-cell">
                        <button class="widget-btn approve-btn" @click="$emit('approve', req.id)">Approve</button>
                        <button class="widget-btn deny-btn" @click="$emit('deny', req.id)">Deny</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 2. OVERDUE RETURNS (Lecturer/Support/Admin only) -->
            <div v-if="!isStudent && overdueRequests.length > 0" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2 class="text-danger">⚠️ Overdue Returns ({{ overdueRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Equipment</th>
                      <th>Due Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in overdueRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td class="overdue-text">{{ formatDate(req.dueAt) }}</td>
                      <td>
                        <button class="widget-btn remind-btn" @click="$emit('remind', req.id)">Email Reminder</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 3. NEAR DUE BORROWED EQUIPMENT -->
            <div v-if="!isStudent && nearDueRequests.length > 0" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2 class="text-warning">🕒 Near Due Borrowed Equipment ({{ nearDueRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>Borrower</th>
                      <th>Equipment</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in nearDueRequests" :key="req.id">
                      <td>{{ req.lecturer?.name }}</td>
                      <td>{{ req.equipment?.name }}</td>
                      <td class="warning-text">{{ formatDate(req.dueAt) }}</td>
                      <td class="action-cell">
                        <button class="widget-btn extend-btn" @click="$emit('extend', { id: req.id, payload: {} })">Extend 7d</button>
                        <button class="widget-btn remind-btn" @click="$emit('remind', req.id)">Send Reminder</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. CURRENTLY BORROWED BY ME -->
            <div class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>My Current Borrows ({{ userBorrowedRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>Equipment</th>
                      <th>Purpose</th>
                      <th>Due Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in userBorrowedRequests" :key="req.id">
                      <td>{{ req.equipment?.name }}</td>
                      <td><span class="purpose-span">{{ req.purpose }}</span></td>
                      <td>{{ formatDate(req.dueAt) }}</td>
                      <td class="action-cell">
                        <button class="widget-btn return-btn" @click="activeTab = 'returns'">Return</button>
                        <button class="widget-btn extend-btn" @click="$emit('extend', { id: req.id, payload: {} })">Extend 7d</button>
                      </td>
                    </tr>
                    <tr v-if="userBorrowedRequests.length === 0">
                      <td colspan="4" class="empty-widget-text">You have no active borrowed equipment.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </template>
        
        <template v-else-if="activeTab === 'equipment'">
          <EquipmentTable :equipment="state.equipment" />
        </template>
        
        <template v-else-if="activeTab === 'borrow'">
          <BorrowPanel :equipment="state.equipment" @borrow="$emit('borrow', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'returns'">
          <ReturnPanel :requests="state.requests" @return="$emit('return', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'history'">
          <HistoryLog :historyData="state.historyData" :session="session" @fetch="$emit('fetch-history', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'schedules'">
          <SchedulesView :equipment="state.equipment" @borrow="$emit('borrow', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'status'">
          <StatusPanel :equipment="state.equipment" @status="$emit('status', $event)" />
        </template>
        
        <template v-else-if="activeTab === 'roadmap'">
          <SprintTimeline :sprints="state.sprints" />
        </template>
      </section>
    </main>
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
</style>
