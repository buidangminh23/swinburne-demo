<script setup>
import { ref, reactive, computed, watch, onMounted } from "vue";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "@lucide/vue";
import { api } from "../api";

const reasonOptions = [
  "Teaching",
  "Student Presentation",
  "Exam/Quiz",
  "Seminar/Workshop",
  "Lab Session",
  "Club Activity",
  "Other"
];

const classroomOptions = [
  "ATC 625",
  "ATC 628",
  "BA 701",
  "LIB DESK",
  "MED DESK",
  "EN402",
  "EN403"
];

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["borrow"]);

const selectedEquipmentId = ref(props.equipment[0]?.id ?? null);
const selectedItem = computed(() => props.equipment.find((item) => item.id === selectedEquipmentId.value) ?? null);

const weekOffset = ref(0);
const bookings = ref([]);
const loading = ref(false);

const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const slotHours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];

const showWorkingHoursOnly = ref(true);
const filteredSlotHours = computed(() => {
  if (showWorkingHoursOnly.value) {
    return [8, 10, 12, 14, 16, 18, 20, 22];
  }
  return slotHours;
});

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

const weekLabel = computed(() => {
  const days = weekDays.value;
  return `${fmtDay(days[0])} - ${fmtDay(days[6])}`;
});

async function fetchSchedule() {
  if (!selectedEquipmentId.value) return;
  loading.value = true;
  try {
    const result = await api.schedule(selectedEquipmentId.value);
    bookings.value = result.bookings ?? [];
  } catch {
    bookings.value = [];
  } finally {
    loading.value = false;
  }
}

watch(selectedEquipmentId, fetchSchedule);
watch(
  () => props.equipment,
  () => {
    if (!selectedEquipmentId.value && props.equipment.length) {
      selectedEquipmentId.value = props.equipment[0].id;
    }
    fetchSchedule();
  }
);

onMounted(() => {
  if (!selectedEquipmentId.value && props.equipment.length) {
    selectedEquipmentId.value = props.equipment[0].id;
  }
  fetchSchedule();
});

function cellRange(dayDate, hour) {
  const start = new Date(dayDate);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 2);
  return { start, end };
}

function bookingFor(dayDate, hour) {
  const { start, end } = cellRange(dayDate, hour);
  return (
    bookings.value.find((booking) => {
      const bookingStart = new Date(booking.start).getTime();
      const bookingEnd = new Date(booking.end).getTime();
      return bookingStart < end.getTime() && bookingEnd > start.getTime();
    }) ?? null
  );
}

function cellStatus(dayDate, hour) {
  const item = selectedItem.value;
  if (item && ["MAINTENANCE", "RETIRED"].includes(item.status)) {
    return "MAINTENANCE";
  }
  const { end } = cellRange(dayDate, hour);
  if (end.getTime() <= Date.now()) {
    return "PAST";
  }
  return bookingFor(dayDate, hour) ? "RESERVED" : "AVAILABLE";
}

const isModalOpen = ref(false);
const submitting = ref(false);
const bookingForm = reactive({
  classroom: "ATC 625",
  purpose: "CLASSROOM",
  program: "Swinburne",
  unitOrProject: "Teaching",
  start: null,
  end: null,
  label: ""
});

function openBooking(dayDate, hour) {
  if (cellStatus(dayDate, hour) !== "AVAILABLE") return;
  const { start, end } = cellRange(dayDate, hour);
  bookingForm.start = start.toISOString();
  bookingForm.end = end.toISOString();
  bookingForm.label = `${fmtDay(start)} • ${fmtHour(hour)} - ${fmtHour(hour + 2)}`;
  isModalOpen.value = true;
}

async function confirmBooking() {
  submitting.value = true;
  try {
    emit("borrow", {
      equipmentId: selectedEquipmentId.value,
      classroom: bookingForm.classroom,
      purpose: bookingForm.purpose,
      program: bookingForm.program,
      unitOrProject: bookingForm.purpose === "CLASSROOM" ? bookingForm.unitOrProject : null,
      startDate: bookingForm.start,
      dueAt: bookingForm.end
    });
    isModalOpen.value = false;
  } finally {
    submitting.value = false;
  }
}

function fmtHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function fmtDay(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isToday(date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

function isCurrentSlot(date, hour) {
  if (!isToday(date)) return false;
  const currentHour = new Date().getHours();
  return currentHour >= hour && currentHour < hour + 2;
}

const activeBookingNow = computed(() => {
  if (!bookings.value.length) return null;
  const now = new Date();
  return bookings.value.find(b => {
    const start = new Date(b.start);
    const end = new Date(b.end);
    return now >= start && now <= end;
  });
});

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}
</script>

<template>
  <section class="panel schedules-panel">
    <div class="panel-heading">
      <div>
        <h2>Equipment Availability Schedule</h2>
        <p>Live 24h × 7-day availability per item from real bookings. Click a green slot to reserve at that exact time.</p>
      </div>
    </div>

    <div class="schedule-selector">
      <label>
        Select Equipment:
        <select v-model="selectedEquipmentId" class="equipment-select">
          <option v-for="item in equipment" :key="item.id" :value="item.id">
            {{ item.assetCode }} - {{ item.name }}
          </option>
        </select>
      </label>

      <div class="week-nav">
        <button type="button" class="week-btn" @click="weekOffset--">&#8249;</button>
        <span class="week-label">{{ weekLabel }}</span>
        <button type="button" class="week-btn" @click="weekOffset++">&#8250;</button>
        
        <label class="toggle-hours-label">
          <input v-model="showWorkingHoursOnly" type="checkbox" />
          <span>Working Hours (08:00 - 22:00)</span>
        </label>
      </div>

      <div v-if="selectedItem" class="item-status-summary">
        <div class="status-meta">
          <span class="status-indicator">
            Current Status:
            <span :class="'status-chip ' + selectedItem.status.toLowerCase()">{{ selectedItem.status }}</span>
          </span>
          <span class="location-indicator">Location: <strong>{{ selectedItem.location }}</strong></span>
        </div>
        <div v-if="activeBookingNow" class="active-booking-details">
          Currently borrowed by <strong>{{ activeBookingNow.borrower }}</strong> ({{ activeBookingNow.purpose }}) until {{ formatDateTime(activeBookingNow.end) }}
        </div>
      </div>
    </div>

    <div class="calendar-legend">
      <div class="legend-item"><span class="legend-color available"></span> Available (Click to book)</div>
      <div class="legend-item"><span class="legend-color reserved"></span> Reserved / Borrowed</div>
      <div class="legend-item"><span class="legend-color maintenance"></span> Out of service</div>
      <div class="legend-item"><span class="legend-color past"></span> Past</div>
    </div>

    <div class="grid-wrap">
      <div class="schedule-grid">
        <div class="grid-header-cell empty"></div>
        <div v-for="(date, index) in weekDays" :key="index" :class="['grid-header-cell', { today: isToday(date) }]">
          <span class="day-name">{{ dayNames[index] }}</span>
          <span class="day-date">{{ fmtDay(date) }}</span>
          <span v-if="isToday(date)" class="today-badge">Today</span>
        </div>

        <template v-for="hour in filteredSlotHours" :key="hour">
          <div class="grid-time-cell">
            <Clock :size="12" />
            <span>{{ fmtHour(hour) }}</span>
          </div>
          <div
            v-for="(date, index) in weekDays"
            :key="index + '-' + hour"
            :class="[
              'schedule-cell', 
              cellStatus(date, hour).toLowerCase(), 
              { 
                clickable: cellStatus(date, hour) === 'AVAILABLE',
                'today-column': isToday(date),
                'current-slot': isCurrentSlot(date, hour)
              }
            ]"
            :title="bookingFor(date, hour) ? `Booked by ${bookingFor(date, hour).borrower || 'user'} (${bookingFor(date, hour).purpose})` : ''"
            @click="openBooking(date, hour)"
          >
            <span v-if="cellStatus(date, hour) === 'AVAILABLE'" class="cell-text available-text">Open</span>
            <span v-else-if="cellStatus(date, hour) === 'RESERVED'" class="cell-text reserved-text">Booked</span>
            <span v-else-if="cellStatus(date, hour) === 'MAINTENANCE'" class="cell-text maintenance-text">Out</span>
            <span v-else class="cell-text past-text">—</span>
          </div>
        </template>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <header class="modal-header">
          <h3>Reserve {{ selectedItem?.name }}</h3>
          <button type="button" class="close-btn" @click="isModalOpen = false">&times;</button>
        </header>
        <form class="modal-form" @submit.prevent="confirmBooking">
          <div class="booking-details-summary">
            <Calendar :size="16" />
            <span>{{ bookingForm.label }}</span>
          </div>
          <label>
            Classroom:
            <select v-model="bookingForm.classroom">
              <option v-for="c in classroomOptions" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <label>
            Purpose:
            <select v-model="bookingForm.purpose">
              <option value="CLASSROOM">Classroom Instruction</option>
              <option value="LAB">Lab Session</option>
              <option value="RESEARCH">Research Work</option>
              <option value="EVENT">Swinburne Event</option>
            </select>
          </label>
          <label v-if="bookingForm.purpose === 'CLASSROOM'">
            Reason of Use:
            <select v-model="bookingForm.unitOrProject">
              <option v-for="r in reasonOptions" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <label>
            University:
            <select v-model="bookingForm.program">
              <option value="Swinburne">Swinburne</option>
              <option value="Asia">Asia</option>
              <option value="FPT">FPT</option>
            </select>
          </label>

          <div class="modal-actions">
            <button type="button" class="btn-cancel" @click="isModalOpen = false">Cancel</button>
            <button type="submit" class="btn-confirm" :disabled="submitting">
              {{ submitting ? "Reserving..." : "Confirm Reservation" }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.schedule-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px 28px;
  background: #fafafa;
  border-bottom: 1px solid #eeeeef;
}
.equipment-select {
  margin-top: 6px;
  width: 320px;
  max-width: 100%;
}
.week-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.week-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4b5563;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
  padding-bottom: 2px;
  transition: all 0.2s ease;
}
.week-btn:hover {
  background: #fafafa;
  border-color: #5f63ff;
  color: #5f63ff;
  box-shadow: 0 2px 8px rgba(95, 99, 255, 0.15);
}
.week-label {
  font-size: 13px;
  font-weight: 700;
  color: #3e3e4a;
  min-width: 110px;
  text-align: center;
}
.item-status-summary {
  display: flex;
  gap: 18px;
  font-size: 13px;
}
.calendar-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 28px;
  font-size: 12px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.legend-color.available { background: #e3f8ef; border: 1px solid #a7e9cc; }
.legend-color.reserved { background: #fff1d6; border: 1px solid #fedb9b; }
.legend-color.maintenance { background: #ffe7ec; border: 1px solid #fec0cb; }
.legend-color.past { background: #f1f1f5; border: 1px solid #d8d8e4; }

.grid-wrap {
  padding: 0 28px 30px;
  overflow-x: auto;
}
.schedule-grid {
  display: grid;
  grid-template-columns: 84px repeat(7, 1fr);
  min-width: 880px;
  border: 1px solid #eeeeef;
  border-radius: 3px;
}
.grid-header-cell,
.grid-time-cell,
.schedule-cell {
  padding: 8px;
  border-bottom: 1px solid #eeeeef;
  border-right: 1px solid #eeeeef;
  display: flex;
  align-items: center;
  justify-content: center;
}
.grid-header-cell {
  flex-direction: column;
  background: #f7f5ff;
  font-weight: 800;
  font-size: 11px;
  color: #5f63ff;
  gap: 2px;
}
.grid-header-cell.empty {
  background: #ffffff;
}
.day-date {
  font-size: 10px;
  color: #9aa0a6;
  font-weight: 600;
}
.grid-time-cell {
  background: #fafafa;
  font-weight: 700;
  font-size: 10px;
  color: #727285;
  gap: 4px;
}
.schedule-cell {
  font-size: 10px;
  font-weight: 600;
  min-height: 34px;
}
.schedule-cell.available { background: #e3f8ef; color: #047857; }
.schedule-cell.reserved { background: #fff1d6; color: #c66b00; }
.schedule-cell.maintenance { background: #ffe7ec; color: #d9182f; }
.schedule-cell.past { background: #f6f6f9; color: #b8b8c4; }
.schedule-cell.available.clickable {
  cursor: pointer;
  transition: all 0.15s ease;
}
.schedule-cell.available.clickable:hover {
  background: #c2f3dc;
  transform: scale(1.04);
  z-index: 2;
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
  max-width: 460px;
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
  font-size: 16px;
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
  padding: 0;
}
.modal-form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}
.booking-details-summary {
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
.modal-form label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #474753;
}
.modal-form input,
.modal-form select {
  height: 38px;
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
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
.btn-confirm:disabled {
  opacity: 0.7;
  cursor: wait;
}

.toggle-hours-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  font-weight: 600;
  color: #727285;
  margin-left: 14px;
}
.toggle-hours-label input {
  cursor: pointer;
}
.item-status-summary {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.status-meta {
  display: flex;
  gap: 18px;
}
.active-booking-details {
  font-size: 12px;
  font-weight: 600;
  color: #c66b00;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  padding: 6px 12px;
  border-radius: 4px;
  width: 100%;
}
.grid-header-cell.today {
  background: #e0e7ff;
  border-bottom: 2px solid #5f63ff;
  position: relative;
}
.today-badge {
  font-size: 9px;
  font-weight: 800;
  background: #5f63ff;
  color: #ffffff;
  padding: 1px 4px;
  border-radius: 2px;
  text-transform: uppercase;
  margin-top: 2px;
}
.schedule-cell.today-column {
  background: #fdfdff;
}
.schedule-cell.today-column.available {
  background: #ecfdf5;
}
.schedule-cell.today-column.available.clickable:hover {
  background: #d1fae5;
}
.schedule-cell.current-slot {
  box-shadow: inset 0 0 0 2px #5f63ff;
  position: relative;
  z-index: 1;
}
</style>
