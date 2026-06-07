<script setup>
import { Boxes, CalendarClock, CheckCircle2, Medal, Wrench } from "@lucide/vue";

defineProps({
  summary: {
    type: Object,
    default: null
  }
});
</script>

<template>
  <section class="summary-row" aria-label="Portal summary">
    <article class="summary-card">
      <Boxes :size="30" />
      <span>{{ summary?.totalEquipment ?? "0" }} Equipment</span>
      <a href="#equipment">View</a>
    </article>
    <article class="summary-card">
      <Medal :size="30" />
      <span>{{ summary?.available ?? "0" }} Available</span>
      <a href="#borrow">Borrow</a>
    </article>
    <article class="summary-card">
      <CheckCircle2 :size="30" />
      <span>{{ summary?.activeRequests ?? "0" }} Active Request</span>
      <a href="#returns">View</a>
    </article>
    <article class="summary-card">
      <Wrench :size="30" />
      <span>{{ summary?.maintenance ?? "0" }} Maintenance</span>
      <a href="#status">Update</a>
    </article>
    <article class="summary-card meeting">
      <CalendarClock :size="30" />
      <span>{{ summary?.nextMeeting ?? "29/5 Sprint 1 demo" }}</span>
    </article>
  </section>
</template>
