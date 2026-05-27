<script setup>
defineProps({
  sprints: {
    type: Array,
    default: () => []
  }
});
</script>

<template>
  <section class="panel sprint-panel">
    <div class="panel-heading">
      <div>
        <h2>Four sprint roadmap</h2>
        <p>Each sprint lasts two weeks. Sprint 1 is prepared for the 29/5 meeting.</p>
      </div>
    </div>
    <div class="sprint-grid">
      <article v-for="sprint in sprints" :key="sprint.id" :class="['sprint-card', sprint.status]">
        <span>{{ sprint.dates }}</span>
        <strong>{{ sprint.name }}</strong>
        <p>{{ sprint.focus }}</p>
        <ul>
          <li v-for="item in sprint.items" :key="item">{{ item }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

