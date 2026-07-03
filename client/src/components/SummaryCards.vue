<script setup>
import { ClipboardList, PackageCheck, CheckCircle2, Wrench } from "@lucide/vue";

defineProps({
  summary: {
    type: Object,
    default: null
  }
});
</script>

<template>
  <section class="summary-row" aria-label="Portal summary">
    <!-- Card 1: Pending Requests -->
    <article class="summary-card pending-card">
      <ClipboardList :size="30" class="icon-pending" />
      <span class="card-value">{{ summary?.activeRequests ?? "0" }}</span>
      <span class="card-label">Pending Requests</span>
    </article>

    <!-- Card 2: Current Borrowing -->
    <article class="summary-card borrowing-card">
      <PackageCheck :size="30" class="icon-borrowing" />
      <span class="card-value">{{ summary?.borrowed ?? "0" }}</span>
      <span class="card-label">Current Borrowing</span>
    </article>

    <!-- Card 3: Available -->
    <article class="summary-card available-card">
      <CheckCircle2 :size="30" class="icon-available" />
      <span class="card-value">{{ summary?.available ?? "0" }}</span>
      <span class="card-label">Available</span>
    </article>

    <!-- Card 4: Maintenance -->
    <article class="summary-card maintenance-card">
      <Wrench :size="30" class="icon-maintenance" />
      <span class="card-value">{{ summary?.maintenance ?? "0" }}</span>
      <span class="card-label">Maintenance</span>
    </article>
  </section>
</template>

<style scoped>
.card-value {
  font-size: 18px !important;
  font-weight: 800;
  color: #1d1d2b !important;
  line-height: 1.2;
}

.card-label {
  font-size: 11.5px;
  color: #727285;
  font-weight: 600;
}

.icon-pending {
  color: #5f63ff !important;
}

.icon-borrowing {
  color: #0d9488 !important;
}

.icon-available {
  color: #16a34a !important;
}

.icon-maintenance {
  color: #d9182f !important;
}
</style>
