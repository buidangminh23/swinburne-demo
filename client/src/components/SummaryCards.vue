<script setup>
import { Boxes, CalendarClock, CheckCircle2, Wrench } from "@lucide/vue";

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
      <Boxes :size="20" />
      <span>Total equipment</span>
      <strong>{{ summary?.totalEquipment ?? "0" }}</strong>
    </article>
    <article class="summary-card">
      <CheckCircle2 :size="20" />
      <span>Available</span>
      <strong>{{ summary?.available ?? "0" }}</strong>
    </article>
    <article class="summary-card">
      <Wrench :size="20" />
      <span>Maintenance</span>
      <strong>{{ summary?.maintenance ?? "0" }}</strong>
    </article>
    <article class="summary-card meeting">
      <CalendarClock :size="20" />
      <span>Next meeting</span>
      <strong>{{ summary?.nextMeeting ?? "29/5 Sprint 1 demo" }}</strong>
    </article>
  </section>
</template>
