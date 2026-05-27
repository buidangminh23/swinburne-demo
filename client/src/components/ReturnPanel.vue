<script setup>
import { RotateCcw } from "@lucide/vue";

defineProps({
  requests: {
    type: Array,
    default: () => []
  }
});

defineEmits(["return"]);
</script>

<template>
  <section class="panel action-panel">
    <div class="panel-heading compact">
      <RotateCcw :size="20" />
      <div>
        <h2>Confirm return</h2>
        <p>Close active borrowed items.</p>
      </div>
    </div>
    <div class="return-list">
      <article v-for="request in requests" :key="request.id" class="return-row">
        <div>
          <strong>{{ request.equipment?.name }}</strong>
          <span>{{ request.classroom }} · due {{ new Date(request.dueAt).toLocaleDateString() }}</span>
        </div>
        <button class="secondary-button" @click="$emit('return', request.id)">Confirm</button>
      </article>
      <p v-if="requests.length === 0" class="empty-state">No borrowed equipment waiting for return.</p>
    </div>
  </section>
</template>
