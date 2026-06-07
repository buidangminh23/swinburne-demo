<script setup>
import { ref, computed } from "vue";
import { Calendar, Clock, CheckCircle, AlertTriangle } from "@lucide/vue";

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["borrow"]);

const selectedEquipmentId = ref(props.equipment[0]?.id ?? 1);
const selectedItem = computed(() => props.equipment.find(e => e.id === selectedEquipmentId.value));

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "18:00 - 20:00"
];

// State for Booking Modal
const isModalOpen = ref(false);
const bookingForm = ref({
  classroom: "EN402",
  purpose: "CLASSROOM",
  program: "Swinburne Alliance",
  unitOrProject: "COS30043",
  day: "",
  slot: ""
});
const submitting = ref(false);

// Mock busy slots based on item ID to show different schedules
function getSlotStatus(day, slot) {
  const hash = (selectedEquipmentId.value + day.length + slot.length) % 7;
  if (hash === 2) return "RESERVED";
  if (hash === 4 && selectedItem.value?.status === "MAINTENANCE") return "MAINTENANCE";
  if (hash === 0 && selectedItem.value?.status === "BORROWED") return "RESERVED";
  return "AVAILABLE";
}

function cellClass(day, slot) {
  const status = getSlotStatus(day, slot);
  return `schedule-cell ${status.toLowerCase()}`;
}

// Calculate the next calendar date matching a given weekday
function getNextWeekdayDateStr(dayName, timeSlotStr) {
  const dayIndex = days.indexOf(dayName); // Monday=0, Sunday=6
  const targetDayOfWeek = dayIndex === 6 ? 0 : dayIndex + 1; // JS Date Sunday=0, Monday=1
  
  const resultDate = new Date();
  const currentDayOfWeek = resultDate.getDay();
  
  let distance = targetDayOfWeek - currentDayOfWeek;
  if (distance <= 0) {
    distance += 7; // Choose next week's occurrence
  }
  resultDate.setDate(resultDate.getDate() + distance);
  
  // Extract hour
  const startHourStr = timeSlotStr.split(" - ")[0].split(":")[0];
  const startHour = parseInt(startHourStr, 10);
  resultDate.setHours(startHour, 0, 0, 0);
  
  return resultDate.toISOString();
}

function openBookingModal(day, slot) {
  if (getSlotStatus(day, slot) !== "AVAILABLE") return;
  bookingForm.value = {
    classroom: "EN402",
    purpose: "CLASSROOM",
    program: "Swinburne Alliance",
    unitOrProject: "COS30043",
    day,
    slot
  };
  isModalOpen.value = true;
}

async function confirmBooking() {
  submitting.value = true;
  try {
    const startIso = getNextWeekdayDateStr(bookingForm.value.day, bookingForm.value.slot);
    const dueAtDate = new Date(startIso);
    dueAtDate.setHours(dueAtDate.getHours() + 2); // default 2 hours slots duration
    
    const payload = {
      equipmentId: selectedEquipmentId.value,
      classroom: bookingForm.value.classroom,
      purpose: bookingForm.value.purpose,
      program: bookingForm.value.program,
      unitOrProject: bookingForm.value.unitOrProject,
      dueAt: dueAtDate.toISOString(),
      startDate: startIso
    };
    
    await emit("borrow", payload);
    isModalOpen.value = false;
  } catch (error) {
    console.error("Calendar booking failed:", error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="panel schedules-panel">
    <div class="panel-heading">
      <div>
        <h2>Equipment Availability Schedule</h2>
        <p>View 24h/7d availability calendar for each individual item. Click on any green cell to instantly reserve.</p>
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
      
      <div v-if="selectedItem" class="item-status-summary">
        <span class="status-indicator">
          Current Status: 
          <span :class="'status-chip ' + selectedItem.status.toLowerCase()">
            {{ selectedItem.status }}
          </span>
        </span>
        <span class="location-indicator">Location: <strong>{{ selectedItem.location }}</strong></span>
      </div>
    </div>

    <!-- Calendar Legend -->
    <div class="calendar-legend">
      <div class="legend-item"><span class="legend-color available"></span> Available (Click to book)</div>
      <div class="legend-item"><span class="legend-color reserved"></span> Reserved / Borrowed</div>
      <div class="legend-item"><span class="legend-color maintenance"></span> Maintenance</div>
    </div>

    <!-- 7-Day Grid -->
    <div class="grid-wrap">
      <div class="schedule-grid">
        <!-- Header Row (Days) -->
        <div class="grid-header-cell empty"></div>
        <div v-for="day in days" :key="day" class="grid-header-cell">{{ day }}</div>

        <!-- Time Slots Rows -->
        <template v-for="slot in timeSlots" :key="slot">
          <div class="grid-time-cell">
            <Clock :size="14" />
            <span>{{ slot }}</span>
          </div>
          <div 
            v-for="day in days" 
            :key="day + slot" 
            :class="[cellClass(day, slot), { 'clickable': getSlotStatus(day, slot) === 'AVAILABLE' }]"
            @click="openBookingModal(day, slot)"
          >
            <div class="cell-content">
              <span v-if="getSlotStatus(day, slot) === 'AVAILABLE'" class="available-text">Available</span>
              <span v-else-if="getSlotStatus(day, slot) === 'RESERVED'" class="reserved-text">Booked</span>
              <span v-else class="maintenance-text">Out of Service</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Booking Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <header class="modal-header">
          <h3>Reserve {{ selectedItem?.name }}</h3>
          <button type="button" class="close-btn" @click="isModalOpen = false">&times;</button>
        </header>
        <form @submit.prevent="confirmBooking" class="modal-form">
          <div class="booking-details-summary">
            <Calendar :size="16" />
            <span>{{ bookingForm.day }}, Slot <strong>{{ bookingForm.slot }}</strong></span>
          </div>
          
          <label>
            Classroom:
            <input v-model="bookingForm.classroom" type="text" required placeholder="e.g. EN402" />
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
          
          <label>
            Program:
            <input v-model="bookingForm.program" type="text" placeholder="e.g. Swinburne Alliance" />
          </label>

          <label>
            Unit or Project Name:
            <input v-model="bookingForm.unitOrProject" type="text" placeholder="e.g. COS30043" />
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
.item-status-summary {
  display: flex;
  gap: 18px;
  font-size: 13px;
}
.calendar-legend {
  display: flex;
  gap: 16px;
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

.grid-wrap {
  padding: 0 28px 30px;
  overflow-x: auto;
}
.schedule-grid {
  display: grid;
  grid-template-columns: 140px repeat(7, 1fr);
  min-width: 900px;
  border: 1px solid #eeeeef;
  border-radius: 3px;
}
.grid-header-cell, .grid-time-cell, .schedule-cell {
  padding: 12px;
  border-bottom: 1px solid #eeeeef;
  border-right: 1px solid #eeeeef;
  display: flex;
  align-items: center;
  justify-content: center;
}
.grid-header-cell {
  background: #f7f5ff;
  font-weight: 800;
  font-size: 12px;
  color: #5f63ff;
  text-transform: uppercase;
}
.grid-header-cell.empty {
  background: #ffffff;
}
.grid-time-cell {
  background: #fafafa;
  font-weight: 700;
  font-size: 11px;
  color: #727285;
  gap: 6px;
}
.schedule-cell {
  font-size: 11px;
  font-weight: 600;
}
.schedule-cell.available { background: #e3f8ef; color: #047857; }
.schedule-cell.reserved { background: #fff1d6; color: #c66b00; }
.schedule-cell.maintenance { background: #ffe7ec; color: #d9182f; }

.schedule-cell.available.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.schedule-cell.available.clickable:hover {
  background: #c2f3dc;
  border-color: #37b495;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  z-index: 2;
}

.cell-content {
  text-align: center;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.modal-card {
  background: #ffffff;
  border-radius: 8px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: slideUp 0.2s ease-out;
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

.close-btn:hover {
  color: #3e3e4a;
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
  background-color: white;
}

.modal-form input:focus,
.modal-form select:focus {
  border-color: #5f63ff;
  box-shadow: 0 0 0 3px rgba(95, 99, 255, 0.15);
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

.btn-cancel:hover {
  background: #e2e2e9;
}

.btn-confirm {
  background: #5f63ff;
  color: #ffffff;
}

.btn-confirm:hover:not(:disabled) {
  background: #4b4ffa;
}

.btn-confirm:disabled {
  opacity: 0.7;
  cursor: wait;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(10px); }
  to { transform: translateY(0); }
}
</style>
