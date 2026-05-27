<script setup>
import { Boxes, CheckCircle2, ClipboardList, DoorOpen, LayoutDashboard, Settings2 } from "@lucide/vue";
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
      <div class="sidebar-brand">
        <span class="brand-mark small">S</span>
        <span>Swinburne<br />Equipment</span>
      </div>
      <nav class="sidebar-nav" aria-label="Portal navigation">
        <a class="active" href="#dashboard"><LayoutDashboard :size="18" /> Dashboard</a>
        <a href="#equipment"><Boxes :size="18" /> Equipment</a>
        <a href="#borrow"><ClipboardList :size="18" /> Borrow</a>
        <a href="#returns"><CheckCircle2 :size="18" /> Returns</a>
        <a href="#status"><Settings2 :size="18" /> Status</a>
      </nav>
    </aside>

    <main class="portal-main">
      <header class="topbar">
        <div>
          <h1>Classroom Use</h1>
          <p>Lecturer portal for Sprint 1 demo on 29/5</p>
        </div>
        <div class="user-block">
          <span>{{ session.user.name }}</span>
          <button class="ghost-button" @click="$emit('logout')">
            <DoorOpen :size="17" />
            Logout
          </button>
        </div>
      </header>

      <div v-if="state.message" class="notice success">{{ state.message }}</div>
      <div v-if="state.error" class="notice error">{{ state.error }}</div>

      <SummaryCards :summary="state.summary" />

      <section class="portal-grid">
        <div class="main-column">
          <EquipmentTable id="equipment" :equipment="state.equipment" />
          <SprintTimeline :sprints="state.sprints" />
        </div>
        <div class="side-column">
          <BorrowPanel id="borrow" :equipment="state.equipment" @borrow="$emit('borrow', $event)" />
          <ReturnPanel id="returns" :requests="state.requests" @return="$emit('return', $event)" />
          <StatusPanel id="status" :equipment="state.equipment" @status="$emit('status', $event)" />
        </div>
      </section>
    </main>
  </div>
</template>
