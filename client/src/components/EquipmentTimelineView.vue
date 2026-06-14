<script setup>
import { computed, ref } from "vue";
import { Clock3, Search, UserRound, Wrench } from "@lucide/vue";

const props = defineProps({
  timelines: { type: Array, default: () => [] }
});

const search = ref("");
const selectedId = ref("ALL");

const filteredTimelines = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return props.timelines
    .filter((timeline) => selectedId.value === "ALL" || timeline.equipment.id === Number(selectedId.value))
    .filter((timeline) => {
      if (!kw) return true;
      const item = timeline.equipment;
      return `${item.name} ${item.assetCode} ${item.category} ${item.location}`.toLowerCase().includes(kw);
    });
});

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}
</script>

<template>
  <section class="timeline-page">
    <div class="panel timeline-header">
      <div>
        <h2><Clock3 :size="20" /> Equipment Detail Timeline</h2>
        <p>Staff-only equipment history with lecturer, class, handover, condition, and audit context.</p>
      </div>
      <div class="timeline-filters">
        <label class="search-box">
          <Search :size="15" />
          <input v-model="search" type="text" placeholder="Search equipment..." />
        </label>
        <select v-model="selectedId">
          <option value="ALL">All equipment</option>
          <option v-for="timeline in timelines" :key="timeline.equipment.id" :value="timeline.equipment.id">
            {{ timeline.equipment.assetCode }} - {{ timeline.equipment.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="timeline-list">
      <article v-for="timeline in filteredTimelines" :key="timeline.equipment.id" class="panel timeline-card">
        <header class="timeline-card-head">
          <div>
            <span class="asset-code">{{ timeline.equipment.assetCode }}</span>
            <h3>{{ timeline.equipment.name }}</h3>
            <p>{{ timeline.equipment.category }} · {{ timeline.equipment.location }}</p>
          </div>
          <span :class="'status-chip ' + timeline.equipment.displayStatus?.toLowerCase()">
            {{ timeline.equipment.displayStatus || timeline.equipment.status }}
          </span>
        </header>

        <ol class="event-list">
          <li v-for="event in timeline.events" :key="event.id" class="event-item">
            <div class="event-marker"><Wrench v-if="event.type === 'AUDIT'" :size="12" /><Clock3 v-else :size="12" /></div>
            <div class="event-body">
              <div class="event-title-row">
                <strong>{{ event.title }}</strong>
                <small>{{ formatDate(event.at) }}</small>
              </div>
              <div v-if="event.lecturer" class="event-person">
                <UserRound :size="13" />
                Lecturer: {{ event.lecturer.name }} · {{ event.lecturer.email }}
                <span v-if="event.lecturer.className"> · {{ event.lecturer.className }}</span>
                <span v-if="event.lecturer.groupName"> · {{ event.lecturer.groupName }}</span>
              </div>
              <div v-if="event.staff" class="event-person staff">
                Staff: {{ event.staff.name || event.staff.email }}<span v-if="event.staff.email"> · {{ event.staff.email }}</span>
              </div>
              <div class="event-details">
                <span v-if="event.details?.purpose">Purpose: {{ event.details.purpose }}</span>
                <span v-if="event.details?.classroom">Room: {{ event.details.classroom }}</span>
                <span v-if="event.details?.quantity">Qty: {{ event.details.quantity }}</span>
                <span v-if="event.details?.remainingQuantity">Remaining: {{ event.details.remainingQuantity }}</span>
                <span v-if="event.details?.conditionAfter">Condition: {{ event.details.conditionAfter }}</span>
                <span v-if="event.details?.receipt?.id || event.details?.id">Receipt: {{ event.details.receipt?.id || event.details.id }}</span>
              </div>
            </div>
          </li>
          <li v-if="timeline.events.length === 0" class="empty-line">No timeline events yet.</li>
        </ol>
      </article>
    </div>
  </section>
</template>

<style scoped>
.timeline-page { display: flex; flex-direction: column; gap: 16px; }
.timeline-header { padding: 20px 24px; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.timeline-header h2 { margin: 0; font-size: 18px; display: flex; align-items: center; gap: 8px; }
.timeline-header p { margin: 4px 0 0; color: #727285; font-size: 12.5px; }
.timeline-filters { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.timeline-filters select, .search-box input { height: 36px; border: 1px solid #d8d8e4; border-radius: 4px; padding: 0 10px; background: #fff; }
.search-box { display: flex; align-items: center; gap: 6px; border: 1px solid #d8d8e4; border-radius: 4px; padding: 0 10px; height: 36px; background: #fff; }
.search-box input { border: 0; padding: 0; height: 30px; outline: none; min-width: 210px; }
.timeline-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.timeline-card { padding: 18px 20px; }
.timeline-card-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #eeeeef; padding-bottom: 12px; }
.timeline-card h3 { margin: 6px 0 2px; font-size: 15px; color: #2d2d3a; }
.timeline-card p { margin: 0; color: #727285; font-size: 12px; }
.asset-code { font-family: monospace; font-size: 11px; font-weight: 800; color: #244ca5; background: #eff6ff; padding: 2px 8px; border-radius: 3px; }
.event-list { list-style: none; padding: 14px 0 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.event-item { display: grid; grid-template-columns: 24px 1fr; gap: 10px; }
.event-marker { width: 24px; height: 24px; border-radius: 999px; background: #eef2ff; color: #4338ca; display: flex; align-items: center; justify-content: center; }
.event-title-row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; }
.event-title-row small { color: #727285; white-space: nowrap; }
.event-person { margin-top: 4px; color: #474753; font-size: 12px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.event-person.staff { color: #047857; }
.event-details { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.event-details span { background: #f7f7fb; border: 1px solid #ececf3; border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #5d5d6f; }
.empty-line { color: #9ca3af; font-style: italic; font-size: 13px; padding: 10px 0; }
</style>
