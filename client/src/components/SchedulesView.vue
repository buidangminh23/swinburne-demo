<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { Clock, Calendar } from "@lucide/vue";
import { api } from "../api";
import { makeTranslator } from "../translate";

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  },
  session: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["book-slot"]);
const t = (text) => makeTranslator(props.session?.user?.email)(text);
const canBook = computed(() => ["LECTURER", "EVENT_STAFF"].includes(props.session?.user?.role));

const VISIBLE_HOURS = [8, 10, 12, 14, 16, 18, 20];
const SLOT_HEIGHT = 44;
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const allLocations = computed(() =>
  [...new Set(props.equipment.map((item) => item.location).filter(Boolean))].sort()
);
const selectedLocations = ref([]);

function toggleLocation(location) {
  const index = selectedLocations.value.indexOf(location);
  if (index === -1) {
    selectedLocations.value.push(location);
  } else {
    selectedLocations.value.splice(index, 1);
  }
}

const filteredEquipment = computed(() => {
  if (!selectedLocations.value.length) return props.equipment;
  return props.equipment.filter((item) => selectedLocations.value.includes(item.location));
});

const selectedEquipmentId = ref(null);
const selectedItem = computed(() => props.equipment.find((item) => item.id === selectedEquipmentId.value) ?? null);
const totalUnits = computed(() => selectedItem.value?.totalQuantity ?? 5);

const totalAvailable = computed(() => filteredEquipment.value.reduce((sum, item) => sum + (item.availableNow ?? 0), 0));
const outOfServiceCount = computed(() => filteredEquipment.value.filter((item) => ["MAINTENANCE", "RETIRED"].includes(item.status)).length);

const weekOffset = ref(0);
const bookings = ref([]);

function startOfWeek(offset) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  return monday;
}

const weekDays = computed(() => {
  const start = startOfWeek(weekOffset.value);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
});

const weekLabel = computed(() => `${fmtDay(weekDays.value[0])} - ${fmtDay(weekDays.value[6])}`);

async function fetchSchedule() {
  if (!selectedEquipmentId.value) {
    bookings.value = [];
    return;
  }
  try {
    const result = await api.schedule(selectedEquipmentId.value);
    bookings.value = result.bookings ?? [];
  } catch {
    bookings.value = [];
  }
}

watch(filteredEquipment, (list) => {
  if (!list.some((item) => item.id === selectedEquipmentId.value)) {
    selectedEquipmentId.value = list[0]?.id ?? null;
  }
});
watch(selectedEquipmentId, fetchSchedule);

onMounted(() => {
  selectedEquipmentId.value = filteredEquipment.value[0]?.id ?? null;
  fetchSchedule();
});

function slotRange(dayDate, hour) {
  const start = new Date(dayDate);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 2);
  return { start, end };
}

function bookedUnits(dayDate, hour) {
  const { start, end } = slotRange(dayDate, hour);
  return bookings.value
    .filter((booking) => ["RESERVED", "BORROWED"].includes(booking.status))
    .filter((booking) => new Date(booking.start).getTime() < end.getTime() && new Date(booking.end).getTime() > start.getTime())
    .reduce((sum, booking) => sum + (booking.quantity ?? 1), 0);
}

function slotState(dayDate, hour) {
  const { end } = slotRange(dayDate, hour);
  if (end.getTime() <= Date.now()) return { kind: "past", booked: 0, available: 0 };
  if (selectedItem.value && ["MAINTENANCE", "RETIRED"].includes(selectedItem.value.status)) {
    return { kind: "oos", booked: 0, available: 0 };
  }
  const booked = Math.min(totalUnits.value, bookedUnits(dayDate, hour));
  return { kind: booked > 0 ? "booked" : "open", booked, available: Math.max(0, totalUnits.value - booked) };
}

function daySegments(dayDate) {
  const segments = [];
  for (const hour of VISIBLE_HOURS) {
    const state = slotState(dayDate, hour);
    const previous = segments[segments.length - 1];
    if (previous && previous.kind === state.kind && previous.booked === state.booked && previous.available === state.available) {
      previous.slots += 1;
      previous.endHour = hour + 2;
    } else {
      segments.push({ kind: state.kind, booked: state.booked, available: state.available, slots: 1, startHour: hour, endHour: hour + 2, date: dayDate });
    }
  }
  return segments;
}

const activeSlot = ref(null);

function openSlot(segment) {
  if (segment.kind !== "open" || !canBook.value) return;
  activeSlot.value = segment;
}

function confirmBook() {
  const segment = activeSlot.value;
  if (!segment) return;
  const start = new Date(segment.date);
  start.setHours(segment.startHour, 0, 0, 0);
  const end = new Date(segment.date);
  end.setHours(segment.endHour, 0, 0, 0);
  emit("book-slot", {
    equipmentId: selectedEquipmentId.value,
    startDate: start.toISOString(),
    dueAt: end.toISOString()
  });
  activeSlot.value = null;
}

function fmtHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function fmtDay(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
}

const slotLabel = computed(() => {
  const segment = activeSlot.value;
  if (!segment) return "";
  return `${dayNames[(segment.date.getDay() + 6) % 7]} ${fmtDay(segment.date)} • ${fmtHour(segment.startHour)} - ${fmtHour(segment.endHour)}`;
});
</script>

<template>
  <section class="panel schedules-panel">
    <div class="panel-heading">
      <div>
        <h2>{{ t('Equipment Availability Schedule') }}</h2>
        <p>{{ t('Pick equipment to see open and booked time. Click an open block to book it.') }}</p>
      </div>
    </div>

    <div class="schedule-controls">
      <label class="control">
        {{ t('Equipment') }}
        <select v-model="selectedEquipmentId" class="equipment-select">
          <option v-for="item in filteredEquipment" :key="item.id" :value="item.id">
            {{ item.assetCode }} - {{ item.name }}
          </option>
        </select>
      </label>

      <div v-if="allLocations.length" class="control locations">
        <span class="control-label">{{ t('Location') }}</span>
        <div class="location-chips">
          <button
            v-for="location in allLocations"
            :key="location"
            type="button"
            :class="['location-chip', { active: selectedLocations.includes(location) }]"
            @click="toggleLocation(location)"
          >
            {{ location }}
          </button>
        </div>
      </div>

      <div class="week-nav">
        <button type="button" class="week-btn" @click="weekOffset--">&#8249;</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button type="button" class="week-btn" @click="weekOffset++">&#8250;</button>
      </div>
    </div>

    <div class="legend">
      <span class="legend-item"><span class="dot open"></span>{{ t('Open') }}</span>
      <span class="legend-item"><span class="dot booked"></span>{{ t('Booked') }}</span>
      <span class="legend-item"><span class="dot oos"></span>{{ t('Out of service') }}</span>
    </div>

    <div class="grid-wrap">
      <div class="sched-head">
        <div class="corner"></div>
        <div v-for="(date, index) in weekDays" :key="date.toISOString()" :class="['day-head', { today: isToday(date) }]">
          <span class="day-name">{{ dayNames[index] }}</span>
          <span class="day-date">{{ fmtDay(date) }}</span>
        </div>
      </div>

      <div class="sched-body">
        <div class="time-col">
          <div v-for="hour in VISIBLE_HOURS" :key="hour" class="time-slot">
            <Clock :size="11" /> {{ fmtHour(hour) }}
          </div>
        </div>
        <div v-for="date in weekDays" :key="date.toISOString()" class="day-col">
          <div
            v-for="(segment, sIndex) in daySegments(date)"
            :key="sIndex"
            :class="['seg', segment.kind, { clickable: segment.kind === 'open' && canBook }]"
            :style="{ flexGrow: segment.slots }"
            @click="openSlot(segment)"
          >
            <span v-if="segment.kind === 'booked'" class="seg-label">{{ segment.booked }} {{ t('booked') }}</span>
            <span v-else-if="segment.kind === 'open'" class="seg-label">{{ t('Open') }}</span>
            <span v-else-if="segment.kind === 'oos'" class="seg-label">{{ t('Out') }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="totals">
      <div class="total-card available">
        <span class="total-num">{{ totalAvailable }}</span>
        <span class="total-label">{{ t('units available') }}</span>
      </div>
      <div class="total-card oos">
        <span class="total-num">{{ outOfServiceCount }}</span>
        <span class="total-label">{{ t('out of service') }}</span>
      </div>
    </div>

    <div v-if="activeSlot" class="modal-overlay" @click.self="activeSlot = null">
      <div class="modal-card">
        <header class="modal-header">
          <h3>{{ t('Book') }} {{ selectedItem?.name }}</h3>
          <button type="button" class="close-btn" @click="activeSlot = null">&times;</button>
        </header>
        <div class="modal-body">
          <div class="slot-summary">
            <Calendar :size="16" />
            <span>{{ slotLabel }}</span>
          </div>
          <p class="avail-line">{{ activeSlot.available }} {{ t('of') }} {{ totalUnits }} {{ t('units available for this time') }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="activeSlot = null">{{ t('Cancel') }}</button>
            <button type="button" class="btn-confirm" @click="confirmBook">{{ t('Book') }}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.schedule-controls {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px 28px;
  background: #fafafa;
  border-bottom: 1px solid #eeeeef;
}
.control {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #474753;
}
.control-label {
  font-size: 12px;
  font-weight: 700;
  color: #474753;
}
.equipment-select {
  width: 300px;
  max-width: 100%;
  height: 38px;
}
.location-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.location-chip {
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid #d8d8e4;
  background: #ffffff;
  color: #474753;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.location-chip.active {
  background: #5f63ff;
  border-color: #5f63ff;
  color: #ffffff;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.week-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
  color: #4b5563;
}
.week-btn:hover {
  border-color: #5f63ff;
  color: #5f63ff;
}
.week-label {
  font-size: 13px;
  font-weight: 700;
  color: #3e3e4a;
  min-width: 110px;
  text-align: center;
}
.legend {
  display: flex;
  gap: 18px;
  padding: 12px 28px;
  font-size: 12px;
  font-weight: 600;
  color: #474753;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
.dot.open {
  background: #d1fae5;
  border: 1px solid #6ee7b7;
}
.dot.booked {
  background: #fde9c8;
  border: 1px solid #fbbf24;
}
.dot.oos {
  background: #ffe7ec;
  border: 1px solid #fca5a5;
}

.grid-wrap {
  padding: 0 28px;
  overflow-x: auto;
}
.sched-head {
  display: flex;
  min-width: 760px;
}
.corner {
  width: 64px;
  flex-shrink: 0;
}
.day-head {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  background: #f7f5ff;
  border: 1px solid #eeeeef;
  border-left: 0;
  font-size: 11px;
  font-weight: 800;
  color: #5f63ff;
}
.day-head:first-of-type {
  border-left: 1px solid #eeeeef;
}
.day-head.today {
  background: #e0e7ff;
  border-bottom: 2px solid #5f63ff;
}
.day-date {
  font-size: 10px;
  color: #9aa0a6;
  font-weight: 600;
}
.sched-body {
  display: flex;
  align-items: stretch;
  min-width: 760px;
}
.time-col {
  width: 64px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.time-slot {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  color: #727285;
  background: #fafafa;
  border: 1px solid #eeeeef;
  border-top: 0;
}
.day-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.seg {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eeeeef;
  border-top: 0;
  border-left: 0;
  font-size: 11px;
  font-weight: 700;
  min-height: 0;
}
.day-col:first-of-type .seg {
  border-left: 1px solid #eeeeef;
}
.seg.open {
  background: #d1fae5;
  color: #047857;
}
.seg.booked {
  background: #fde9c8;
  color: #b45309;
}
.seg.oos {
  background: #ffe7ec;
  color: #d9182f;
}
.seg.past {
  background: #f6f6f9;
  color: #cdced8;
}
.seg.clickable {
  cursor: pointer;
  transition: filter 0.15s ease;
}
.seg.clickable:hover {
  filter: brightness(0.95);
}

.totals {
  display: flex;
  gap: 14px;
  padding: 18px 28px 26px;
}
.total-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 18px;
  border-radius: 6px;
  min-width: 130px;
}
.total-card.available {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
}
.total-card.oos {
  background: #fff1f2;
  border: 1px solid #fecdd3;
}
.total-num {
  font-size: 22px;
  font-weight: 800;
  color: #1f2937;
}
.total-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
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
  max-width: 420px;
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
}
.close-btn {
  background: transparent;
  border: 0;
  font-size: 24px;
  line-height: 1;
  color: #a7a7b4;
  cursor: pointer;
}
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.slot-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
}
.avail-line {
  margin: 0;
  font-size: 13px;
  color: #474753;
  font-weight: 600;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.btn-cancel,
.btn-confirm {
  min-height: 38px;
  font-size: 13px;
  font-weight: 700;
  padding: 0 16px;
  border-radius: 4px;
  cursor: pointer;
  border: 0;
}
.btn-cancel {
  background: #f1f1f5;
  color: #474753;
}
.btn-confirm {
  background: #5f63ff;
  color: #ffffff;
}
</style>
