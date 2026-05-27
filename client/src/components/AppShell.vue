<script setup>
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
  Home,
  MessageSquare,
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

defineProps({
  session: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  }
});

defineEmits(["logout", "borrow", "return", "status"]);
</script>

<template>
  <div class="portal-shell">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="swin-logo">
          <span>SWIN</span>
          <span>BUR</span>
          <span>NE</span>
        </div>
        <button class="collapse-button" aria-label="Collapse sidebar">
          <ChevronLeft :size="18" />
        </button>
      </div>
      <nav class="sidebar-nav" aria-label="Portal navigation">
        <a class="active" href="#dashboard"><Home :size="18" /> Dashboard</a>
        <span class="nav-group">Custom</span>
        <a href="#notifications"><Bell :size="18" /> Notification</a>
        <a href="#equipment"><Boxes :size="18" /> Equipment</a>
        <a href="#borrow"><ClipboardList :size="18" /> Borrow Equipment</a>
        <a href="#returns"><CheckCircle2 :size="18" /> Confirm Return</a>
        <a href="#status"><Settings2 :size="18" /> Update Status</a>
        <a href="#roadmap"><CalendarDays :size="18" /> Sprint Roadmap</a>
        <a href="#reports"><BookOpen :size="18" /> Reports</a>
        <a href="#users"><Users :size="18" /> Manage Users</a>
        <a href="#fees"><CreditCard :size="18" /> My Financials</a>
        <a href="#feedback"><MessageSquare :size="18" /> Queries/Feedback</a>
        <a href="#support"><FileQuestion :size="18" /> Support</a>
      </nav>
    </aside>

    <main class="portal-frame">
      <header class="portal-topbar">
        <div class="loading-chip">Loading ...</div>
        <div class="topbar-actions">
          <button class="icon-button" aria-label="Notifications">
            <Bell :size="18" />
            <span>0</span>
          </button>
          <span>Hi, {{ session.user.name.split(" ").at(-1) }}</span>
          <div class="avatar">M</div>
        </div>
      </header>

      <section class="breadcrumb-bar">
        <div class="breadcrumb">
          <span>Swinburne</span>
          <Home :size="15" />
          <span>Dashboard</span>
        </div>
      </section>

      <section class="portal-main" id="dashboard">
        <div class="profile-panel">
          <div>
            <div class="profile-title">
              <h1>{{ session.user.name }}</h1>
              <ShieldCheck :size="20" />
            </div>
            <div class="profile-meta">
              <span>lecturer@swin.edu.au</span>
              <span>Classroom Use</span>
              <span>Equipment Portal</span>
              <span>29/5 Sprint 1 demo</span>
            </div>
          </div>
          <div class="profile-progress">
            <span>Progress<br />(4/5)</span>
            <div class="progress-track"><div class="progress-fill"></div></div>
            <strong>80%</strong>
          </div>
          <SummaryCards :summary="state.summary" />
        </div>

        <div v-if="state.message" class="notice success">{{ state.message }}</div>
        <div v-if="state.error" class="notice error">{{ state.error }}</div>

        <section class="portal-grid">
          <div class="main-column">
            <EquipmentTable id="equipment" :equipment="state.equipment" />
            <SprintTimeline id="roadmap" :sprints="state.sprints" />
          </div>
          <div class="side-column">
            <BorrowPanel id="borrow" :equipment="state.equipment" @borrow="$emit('borrow', $event)" />
            <ReturnPanel id="returns" :requests="state.requests" @return="$emit('return', $event)" />
            <StatusPanel id="status" :equipment="state.equipment" @status="$emit('status', $event)" />
            <button class="logout-card" @click="$emit('logout')">
              <DoorOpen :size="18" />
              Logout
            </button>
          </div>
        </section>
      </section>

    </main>
  </div>
</template>
