<script setup>
import { computed, reactive, ref, watchEffect } from "vue";
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
import NotificationCenterView from "./NotificationCenterView.vue";

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
  "custody", "remind", "check-out", "fetch-history", "add-equipment", "edit-equipment", "update-user-role",
  "update-notification-preferences", "update-reminder-rules", "mark-notification-read", "navigate",
  "import-schedule"
]);

function goToTab(tabName) {
  activeTab.value = tabName;
  emit("navigate", tabName);
}

const bookingPrefill = ref(null);
function onBookSlot(payload) {
  bookingPrefill.value = { ...payload };
  goToTab("borrow");
}

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

const isExtendMode = ref(false);

function openEditModal(req) {
  isExtendMode.value = false;
  editingRequest.value = req;
}

function openExtendModal(req) {
  isExtendMode.value = true;
  editingRequest.value = req;
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

const currentRole = computed(() => props.session?.user?.role || "");
const isStudent = computed(() => currentRole.value === "STUDENT");
const isAdmin = computed(() => currentRole.value === "ADMIN");
const isSupport = computed(() => currentRole.value === "EQUIPMENT_MANAGER");
const isLecturer = computed(() => currentRole.value === "LECTURER");
const isEventStaff = computed(() => currentRole.value === "EVENT_STAFF");
const isOperations = computed(() => currentRole.value === "SERVER_MANAGER");
const canApprove = computed(() => ["LECTURER", "EQUIPMENT_MANAGER", "SERVER_MANAGER", "ADMIN"].includes(currentRole.value));
const canManageEquipment = computed(() => ["EQUIPMENT_MANAGER", "SERVER_MANAGER", "ADMIN"].includes(currentRole.value));
const canConfirmReturn = computed(() => canManageEquipment.value);
const displayEmail = computed(() => props.session?.user?.email || "");
const displayName = computed(() => props.session?.user?.name || "");

const displayRole = computed(() => {
  const role = currentRole.value;
  if (role === "LECTURER") return "Lecturer";
  if (role === "STUDENT") return "Student";
  if (role === "EVENT_STAFF") return "Event Coordinator";
  if (role === "EQUIPMENT_MANAGER") return "Equipment Manager";
  if (role === "SERVER_MANAGER") return "Server Manager";
  if (role === "ADMIN") return "Admin";
  return "Member";
});

const avatarLetter = computed(() => {
  const name = props.session?.user?.name;
  if (!name || !name.trim()) return "?";
  return name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase();
});

// Dashboard computed lists
const pendingRequests = computed(() => {
  const list = props.state.requests.filter(r => r.status === "REQUESTED");
  if (props.session.user.role === "LECTURER") {
    return list.filter(r => r.assignedManagerId === props.session.user.id || (r.lecturer?.role === "STUDENT" && r.lecturer?.lecturerId === props.session.user.id));
  }
  if (["EQUIPMENT_MANAGER", "SERVER_MANAGER"].includes(props.session.user.role)) {
    return list.filter(r => r.assignedManagerId === props.session.user.id);
  }
  return list;
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
  return props.state.requests.filter(r => ["REQUESTED", "RESERVED", "BORROWED", "RETURNED", "REJECTED"].includes(r.status) && r.lecturerId === props.session.user.id);
});

const pendingTabRequests = computed(() => {
  if (canApprove.value) {
    return props.state.requests;
  }
  return props.state.requests.filter(r => r.lecturerId === props.session.user.id);
});

const isApprovalRequester = computed(() => ["STUDENT", "EVENT_STAFF"].includes(currentRole.value));

const myApprovalStatusRequests = computed(() => {
  return props.state.requests.filter(r => ["REQUESTED", "RESERVED", "BORROWED", "RETURNED", "CANCELLED", "REJECTED"].includes(r.status) && r.lecturerId === props.session.user.id);
});

function canApproveRequest(req) {
  if (currentRole.value === "LECTURER") {
    return req.lecturer?.role === "STUDENT" && req.lecturer?.lecturerId === props.session.user.id;
  }
  return ["EQUIPMENT_MANAGER", "SERVER_MANAGER", "ADMIN"].includes(currentRole.value);
}

const MANAGE_ROLES = ["EQUIPMENT_MANAGER", "SERVER_MANAGER", "ADMIN"];

function isOwner(req) {
  return props.session.user.id === req.lecturerId;
}

function canManageRequest() {
  return MANAGE_ROLES.includes(currentRole.value);
}

function lecturerTeachesOwner(req) {
  return currentRole.value === "LECTURER" && req.lecturer?.lecturerId === props.session.user.id;
}

function canFullyEdit(req) {
  if (canManageRequest()) return true;
  if (lecturerTeachesOwner(req)) return true;
  if (isOwner(req) && req.status === "REQUESTED") return true;
  return false;
}

function canExtend(req) {
  if (!["RESERVED", "BORROWED", "RETURNED"].includes(req.status)) return false;
  if (req.status === "RETURNED" && new Date(req.dueAt) >= new Date()) return false;
  return isOwner(req) || canManageRequest() || lecturerTeachesOwner(req);
}

function canReturn(req) {
  if (req.status !== "BORROWED") return false;
  return isOwner(req) || canManageRequest() || lecturerTeachesOwner(req);
}

function approvalStatusText(req) {
  if (req.status === "REQUESTED") return "Pending Approval";
  if (["RESERVED", "BORROWED"].includes(req.status)) return "Accepted";
  if (req.status === "RETURNED") return "Accepted";
  if (req.status === "CANCELLED") return "Denied";
  if (req.status === "REJECTED") return "Rejected";
  return req.status;
}

function requesterDisplayStatus(req) {
  return ["STUDENT", "EVENT_STAFF"].includes(currentRole.value) ? approvalStatusText(req) : getDisplayStatus(req);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function formatClassroom(val) {
  if (!val) return '-';
  if (val.startsWith('HN-')) {
    const parts = val.split('-');
    parts[1] = 'DT1';
    return parts.join('-');
  }
  return val;
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
  if (req.status === "RETURNED") return "Returned";
  return req.status;
}

import { makeTranslator } from "../translate";
const t = (text) => makeTranslator(props.session?.user?.email)(text);

const activeTabDisplay = computed(() => {
  if (activeTab.value === 'dashboard') return t('Dashboard');
  if (activeTab.value === 'equipment') return t('All Requests');
  if (activeTab.value === 'pending-approvals') return canApprove.value ? t('Pending Approvals') : t('Pending Approval Status');
  if (activeTab.value === 'borrow') return t('Borrow Equipment');
  if (activeTab.value === 'history') return t('History Log');
  if (activeTab.value === 'schedules') return t('Schedules');
  if (activeTab.value === 'notifications') return t('Notification Center');
  if (activeTab.value === 'returns') return t('Confirm Return');
  if (activeTab.value === 'status') return t('Update Status');
  if (activeTab.value === 'faq') return t('FAQ');
  if (activeTab.value === 'profile') return t('My Profile');
  return activeTab.value;
});

const canAccessTab = computed(() => ({
  dashboard: true,
  history: true,
  schedules: true,
  notifications: true,
  faq: true,
  profile: true,
  borrow: isLecturer.value || isEventStaff.value || isStudent.value,
  equipment: canApprove.value,
  "pending-approvals": true,
  status: canApprove.value,
  returns: canConfirmReturn.value,
  "admin-equipment": canManageEquipment.value,
  "admin-users": isAdmin.value
}));

watchEffect(() => {
  if (!canAccessTab.value[activeTab.value]) {
    activeTab.value = "dashboard";
  }
});
</script>

<template>
  <div class="portal-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img class="swin-logo" :src="swinburneLogo" alt="Swinburne University of Technology Alliance with FPT Education" />
      </div>
      <nav class="sidebar-nav" aria-label="Portal navigation">
        <a :class="{ active: activeTab === 'dashboard' }" href="#" @click.prevent="goToTab('dashboard')"><Home :size="18" /> {{ t('Dashboard') }}</a>
        <span class="nav-group">{{ t('Custom') }}</span>

        <!-- Admin views -->
        <a v-if="canManageEquipment" :class="{ active: activeTab === 'admin-equipment' }" href="#" @click.prevent="goToTab('admin-equipment')"><Boxes :size="18" /> {{ t('Equipment Management') }}</a>
        <a v-if="isAdmin" :class="{ active: activeTab === 'admin-users' }" href="#" @click.prevent="goToTab('admin-users')"><UserRound :size="18" /> {{ t('User Management') }}</a>

        <a v-if="canApprove" :class="{ active: activeTab === 'equipment' }" href="#" @click.prevent="goToTab('equipment')"><Boxes :size="18" /> {{ t('All Requests') }}</a>
        <a :class="{ active: activeTab === 'pending-approvals' }" href="#" @click.prevent="goToTab('pending-approvals')"><ShieldCheck :size="18" /> {{ canApprove ? t('Pending Approvals') : t('Pending Approval Status') }}</a>
        <a v-if="isLecturer || isEventStaff || isStudent" :class="{ active: activeTab === 'borrow' }" href="#" @click.prevent="goToTab('borrow')"><ClipboardList :size="18" /> {{ t('Borrow Equipment') }}</a>
        <a :class="{ active: activeTab === 'history' }" href="#" @click.prevent="goToTab('history')"><History :size="18" /> {{ t('History Log') }}</a>
        <a :class="{ active: activeTab === 'schedules' }" href="#" @click.prevent="goToTab('schedules')"><CalendarDays :size="18" /> {{ t('Schedules') }}</a>
        <a :class="{ active: activeTab === 'notifications' }" href="#" @click.prevent="goToTab('notifications')"><Bell :size="18" /> {{ t('Notification Center') }}</a>
        <a v-if="canConfirmReturn" :class="{ active: activeTab === 'returns' }" href="#" @click.prevent="goToTab('returns')"><CheckCircle2 :size="18" /> {{ t('Confirm Return') }}</a>
        <a v-if="canApprove" :class="{ active: activeTab === 'status' }" href="#" @click.prevent="goToTab('status')"><Settings2 :size="18" /> {{ t('Update Status') }}</a>
        <a :class="{ active: activeTab === 'faq' }" href="#" @click.prevent="goToTab('faq')"><HelpCircle :size="18" /> {{ t('FAQ') }}</a>
      </nav>
    </aside>

    <main class="portal-frame">
      <header class="portal-topbar">
        <div class="topbar-actions">
          <div class="notif-wrap">
            <button class="icon-button" aria-label="Notifications" aria-haspopup="true" :aria-expanded="notifOpen" aria-controls="notif-menu" @click="notifOpen = !notifOpen">
              <Bell :size="18" />
              <span v-if="state.notifications.length > 0">{{ state.notifications.length }}</span>
            </button>
            <div v-if="notifOpen" id="notif-menu" class="notif-menu">
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
          <button class="avatar-button" aria-label="Open profile menu" aria-haspopup="true" :aria-expanded="profileOpen" aria-controls="profile-menu" @click="profileOpen = !profileOpen">
            <span class="avatar">{{ avatarLetter }}</span>
          </button>
          <div v-if="profileOpen" id="profile-menu" class="profile-menu">
            <div class="profile-menu-hero">
              <div class="profile-menu-avatar">{{ avatarLetter }}</div>
              <div>
                <strong>{{ displayName }}</strong>
                <span>{{ t(displayRole) }}</span>
              </div>
            </div>
            <a href="#" @click.prevent="goToTab('profile'); profileOpen = false">
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
          <h1 class="breadcrumb-title">{{ activeTabDisplay }}</h1>
        </div>
      </section>

      <section class="portal-main">


        <div v-if="state.message" class="notice success">{{ t(state.message) }}</div>
        <div v-if="state.error" class="notice error">{{ t(state.error) }}</div>

        <!-- Render depending on activeTab -->
        <template v-if="activeTab === 'dashboard'">
          <div class="dashboard-widgets-grid">
            <!-- 1. PENDING APPROVALS (Lecturer/Support/Admin only) -->
            <div v-if="canApprove" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>{{ t('Pending Approval Requests') }} ({{ pendingRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Requester') }}</th>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Classroom') }}</th>
                      <th>{{ t('Unit / Purpose') }}</th>
                      <th>{{ t('Quantity') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in pendingRequests" :key="req.id">
                      <td>
                        <strong class="requester-name" style="display: block; font-weight: 600;">{{ req.lecturer?.name }}</strong>
                        <code class="student-id-code" style="font-size: 13px; text-transform: uppercase; margin-top: 2px; display: inline-block;">{{ (req.lecturer?.studentId || '-').toUpperCase() }}</code>
                      </td>
                      <td>{{ req.equipment?.name }}</td>
                      <td>{{ formatClassroom(req.classroom) }}</td>
                      <td>
                        <span class="program-span" style="display: block; font-size: 12px; color: #4e5b66;">{{ req.program || "-" }}</span>
                        <span class="purpose-span" style="display: inline-block; margin-top: 2px;">{{ t(req.purpose) }}</span>
                        <span v-if="req.handoverNotes" class="handover-notes-inline" style="color: #6b7280; font-size: 11px; margin-left: 4px; font-weight: normal; display: inline-block; vertical-align: middle;">({{ req.handoverNotes }})</span>
                      </td>
                      <td>{{ req.quantity || 1 }}</td>
                      <td>
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td class="action-cell">
                        <template v-if="canApproveRequest(req)">
                          <button class="widget-btn approve-btn" @click="$emit('approve', req.id)">{{ t('Approve') }}</button>
                          <button class="widget-btn deny-btn" @click="confirmDeny(req.id)">{{ t('Deny') }}</button>
                        </template>
                        <span v-else :class="'status-chip ' + approvalStatusText(req).toLowerCase().replace(' ', '-')">{{ t(approvalStatusText(req)) }}</span>
                      </td>
                    </tr>
                    <tr v-if="pendingRequests.length === 0">
                      <td colspan="7" class="empty-widget-text">{{ t('No pending approval requests.') }}</td>
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
                        <button class="widget-btn extend-btn" @click="openExtendModal(req)">{{ t('Extend') }}</button>
                        <button class="widget-btn remind-btn" @click="$emit('remind', req.id)">{{ t('Send Reminder') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 4. PENDING APPROVAL STATUS -->
            <div v-if="isApprovalRequester" class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>{{ t('Pending Approval Status') }} ({{ myApprovalStatusRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Classroom / University') }}</th>
                      <th>{{ t('Unit / Purpose') }}</th>
                      <th>{{ t('Quantity') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Status') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in myApprovalStatusRequests" :key="'approval-status-' + req.id">
                      <td>{{ req.equipment?.name }}</td>
                      <td>{{ formatClassroom(req.classroom) }}</td>
                      <td>
                        <span v-if="req.program" class="program-span">{{ req.program }}</span>
                        <span class="purpose-span">{{ t(req.purpose) }}</span>
                      </td>
                      <td>{{ req.quantity || 1 }}</td>
                      <td>
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td><span :class="'status-chip ' + approvalStatusText(req).toLowerCase().replace(/ /g, '-')">{{ t(approvalStatusText(req)) }}</span></td>
                    </tr>
                    <tr v-if="myApprovalStatusRequests.length === 0">
                      <td colspan="6" class="empty-widget-text">{{ t('No approval status requests yet.') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 5. MY REQUESTS & BORROWS -->
            <div class="dashboard-widget panel">
              <div class="panel-heading compact border-bottom-0">
                <h2>{{ t('My Requests & Borrows') }} ({{ myActiveRequests.length }})</h2>
              </div>
              <div class="widget-table-wrap">
                <table class="widget-table">
                  <thead>
                    <tr>
                      <th>{{ t('Equipment') }}</th>
                      <th>{{ t('Classroom / University') }}</th>
                      <th>{{ t('Unit / Purpose') }}</th>
                      <th>{{ t('Quantity') }}</th>
                      <th>{{ t('Due Date') }}</th>
                      <th>{{ t('Status') }}</th>
                      <th>{{ t('Actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="req in myActiveRequests" :key="req.id">
                      <td>
                        {{ req.equipment?.name }}
                        <small v-if="req.accountDetails" style="display:block; color:#2563eb; font-size:10px; margin-top:2px;">🔑 {{ req.accountDetails }}</small>
                      </td>
                      <td>{{ formatClassroom(req.classroom) }}</td>
                      <td>
                        <span v-if="req.program" class="program-span">{{ req.program }}</span>
                        <span class="purpose-span">{{ t(req.purpose) }}</span>
                      </td>
                      <td>{{ req.quantity || 1 }}</td>
                      <td>
                        <small v-if="req.startDate" style="display: block; color: #727285; font-size: 10px;">{{ t('From') }}: {{ formatDate(req.startDate) }}</small>
                        <span>{{ t('To') }}: {{ formatDate(req.dueAt) }}</span>
                      </td>
                      <td><span :class="'status-chip ' + requesterDisplayStatus(req).toLowerCase().replace(/_/g, '-').replace(/ /g, '-')">{{ t(requesterDisplayStatus(req)).replace(/_/g, ' ') }}</span></td>
                      <td class="action-cell">
                        <button v-if="canFullyEdit(req) || (isStudent && isOwner(req) && ['RESERVED', 'BORROWED'].includes(req.status))" class="widget-btn edit-btn" @click="openEditModal(req)"><Pencil :size="12" /> {{ t('Edit') }}</button>
                        <button v-if="canReturn(req)" class="widget-btn return-btn" @click="$emit('return', { id: req.id, payload: { isStatusOk: true } })">{{ t('Return') }}</button>
                        <button v-if="req.status === 'RESERVED' && !isStudent" class="widget-btn approve-btn" @click="$emit('check-out', req.id)">{{ t('Check Out') }}</button>
                        <button v-if="canExtend(req)" class="widget-btn extend-btn" @click="openExtendModal(req)">{{ t('Extend') }}</button>
                        <button v-if="req.purpose === 'EVENT'" class="widget-btn custody-btn" @click="openCustody(req)"><ScrollText :size="12" /> {{ t('Custody') }}</button>
                      </td>
                    </tr>
                    <tr v-if="myActiveRequests.length === 0">
                      <td colspan="7" class="empty-widget-text">{{ t('You have no active requests or borrows.') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div v-if="canApprove" style="margin-top: 30px;">
            <RequestListView
              key="dashboard-all-requests"
              :requests="state.requests"
              :session="session"
              :timelines="state.equipmentTimelines"
              @approve="$emit('approve', $event)"
              @deny="confirmDeny"
              @extend-modal="openExtendModal"
              @return="$emit('return', $event)"
              @edit="editingRequest = $event"
              @custody="openCustody"
              @remind="$emit('remind', $event)"
              @check-out="$emit('check-out', $event)"
            />
          </div>
        </template>

        <template v-else-if="activeTab === 'equipment' && canApprove">
          <RequestListView
            key="equipment"
            :requests="state.requests"
            :session="session"
            :timelines="state.equipmentTimelines"
            @approve="$emit('approve', $event)"
            @deny="confirmDeny"
            @extend-modal="openExtendModal"
            @return="$emit('return', $event)"
            @edit="editingRequest = $event"
            @custody="openCustody"
            @remind="$emit('remind', $event)"
            @check-out="$emit('check-out', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'pending-approvals'">
          <RequestListView
            key="pending"
            :requests="pendingTabRequests"
            :session="session"
            :timelines="state.equipmentTimelines"
            :initialStatus="canApprove ? 'REQUESTED' : 'ALL'"
            @approve="$emit('approve', $event)"
            @deny="confirmDeny"
            @extend-modal="openExtendModal"
            @return="$emit('return', $event)"
            @edit="editingRequest = $event"
            @custody="openCustody"
            @remind="$emit('remind', $event)"
            @check-out="$emit('check-out', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'borrow' && (isLecturer || isEventStaff || isStudent)">
          <BorrowPanel :equipment="state.equipment" :requests="state.requests" :is-student="isStudent" :user-role="session.user.role" :session="session" :units="state.myUnits || []" :projects="state.myProjects || []" :managers="state.managers || []" :server-managers="state.serverManagers || []" :lecturers="state.lecturers || []" :prefill="bookingPrefill" @borrow="$emit('borrow', $event)" />
        </template>

        <template v-else-if="activeTab === 'returns' && canConfirmReturn">
          <ReturnPanel :requests="state.requests" :session="session" @return="$emit('return', $event)" />
        </template>

        <template v-else-if="activeTab === 'history'">
          <HistoryLog :historyData="state.historyData" :audit-log="state.auditLog" :session="session" @fetch="$emit('fetch-history', $event)" />
        </template>

        <template v-else-if="activeTab === 'schedules'">
          <SchedulesView :equipment="state.equipment" :session="session" @book-slot="onBookSlot" @import-schedule="$emit('import-schedule', $event)" />
        </template>

        <template v-else-if="activeTab === 'notifications'">
          <NotificationCenterView
            :notifications="state.notifications"
            :preferences="state.notificationPreferences"
            :reminder-rules="state.reminderRules"
            @update-preferences="$emit('update-notification-preferences', $event)"
            @update-rules="$emit('update-reminder-rules', $event)"
            @mark-read="$emit('mark-notification-read', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'admin-equipment' && canManageEquipment">
          <AdminEquipmentView
            :equipment="state.equipment"
            @add-equipment="$emit('add-equipment', $event)"
            @edit-equipment="$emit('edit-equipment', $event)"
            @status="$emit('status', $event)"
          />
        </template>

        <template v-else-if="activeTab === 'status' && canApprove">
          <StatusPanel :equipment="state.equipment" :session="session" @status="$emit('status', $event)" />
        </template>

        <template v-else-if="activeTab === 'admin-users' && isAdmin">
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

        <template v-else>
          <div class="notice error">{{ t('View not available.') }}</div>
        </template>
      </section>
    </main>

    <EditBorrowModal :request="editingRequest" :isExtendMode="isExtendMode" :session="session" :units="state.myUnits || []" :projects="state.myProjects || []" @save="submitEdit" @close="editingRequest = null" />

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
