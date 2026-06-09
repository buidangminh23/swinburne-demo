<script setup>
import { ClipboardList, PackageCheck, Hourglass } from "@lucide/vue";

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
      <span class="card-value">{{ summary?.pendingRequests ?? "0" }}</span>
      <span class="card-label">Pending Requests</span>
    </article>

    <!-- Card 2: Current Borrowing -->
    <article class="summary-card borrowing-card">
      <PackageCheck :size="30" class="icon-borrowing" />
      <span class="card-value">{{ summary?.currentBorrowing ?? "0" }}</span>
      <span class="card-label">Current Borrowing</span>
    </article>

    <!-- Card 3: Updating... Placeholder -->
    <article class="summary-card placeholder-card">
      <Hourglass :size="30" class="icon-placeholder" />
      <span class="card-value text-muted">Updating...</span>
      <span class="card-label">Coming Soon</span>
    </article>

    <!-- Card 4: Updating... Placeholder -->
    <article class="summary-card placeholder-card">
      <Hourglass :size="30" class="icon-placeholder" />
      <span class="card-value text-muted">Updating...</span>
      <span class="card-label">Coming Soon</span>
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

.icon-placeholder {
  color: #a7a7b4 !important;
  animation: spin 8s linear infinite;
}

.text-muted {
  color: #a7a7b4 !important;
  font-weight: 600 !important;
  font-size: 14px !important;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
