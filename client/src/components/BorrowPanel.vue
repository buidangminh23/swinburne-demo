<script setup>
import { computed, reactive, ref, onMounted, watch } from "vue";
import { ClipboardPlus, Trash2, Plus, Minus, ShoppingCart } from "@lucide/vue";

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  },
  isStudent: {
    type: Boolean,
    default: false
  },
  userRole: {
    type: String,
    default: ""
  },
  units: {
    type: Array,
    default: () => []
  },
  projects: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["borrow"]);

function nextOccurrence(dayOfWeek, startHour, endHour) {
  const now = new Date();
  const result = new Date(now);
  result.setHours(startHour, 0, 0, 0);
  let delta = (dayOfWeek - now.getDay() + 7) % 7;
  if (delta === 0 && result.getTime() <= now.getTime()) delta = 7;
  result.setDate(now.getDate() + delta);
  const end = new Date(result);
  end.setHours(endHour, 0, 0, 0);
  return { start: result, end };
}

function toLocalInput(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const availableEquipment = computed(() => {
  return props.equipment.filter((item) => {
    if (cart.some(c => c.id === item.id)) {
      return false;
    }
    return (item.displayStatus ?? item.status) === "AVAILABLE" && (item.availableNow ?? 1) > 0;
  });
});

const form = reactive({
  program: null,
  purpose: "CLASSROOM",
  unitOrProject: "",
  unitId: null,
  researchProjectId: null,
  classroom: "",
  startDate: new Date().toISOString().slice(0, 16),
  dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
  recurrence: "NONE",
  handoverNotes: "Collected for classroom session"
});

const showEventOption = computed(() => props.userRole === "EVENT_STAFF");

onMounted(() => {
  if (props.userRole === "EVENT_STAFF") {
    form.purpose = "EVENT";
    form.handoverNotes = "Collected for event support";
  } else if (form.purpose === "CLASSROOM" && props.units.length) {
    form.unitId = props.units[0].id;
    applyUnit(props.units[0]);
  }
});

watch(() => props.units, (list) => {
  if (form.purpose === "CLASSROOM" && form.unitId == null && list.length) {
    form.unitId = list[0].id;
    applyUnit(list[0]);
  }
});

watch(() => props.projects, (list) => {
  if (form.purpose === "RESEARCH" && form.researchProjectId == null && list.length) {
    form.researchProjectId = list[0].id;
    applyProject(list[0]);
  }
});

function applyUnit(unit) {
  if (!unit) return;
  const { start, end } = nextOccurrence(unit.dayOfWeek, unit.startHour, unit.endHour);
  form.classroom = unit.classroom;
  form.unitOrProject = unit.code;
  form.unitId = unit.id;
  form.program = unit.code;
  form.startDate = toLocalInput(start);
  form.dueAt = toLocalInput(end);
}

function applyProject(project) {
  if (!project) return;
  form.unitOrProject = project.name;
  form.researchProjectId = project.id;
  form.program = project.name;
  form.startDate = new Date().toISOString().slice(0, 16);
  const fallback = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const end = project.endDate ? new Date(project.endDate) : fallback;
  form.dueAt = toLocalInput(end);
}

function onUnitChange() {
  const unit = props.units.find((u) => u.id === form.unitId);
  applyUnit(unit);
}

function onProjectChange() {
  const project = props.projects.find((p) => p.id === form.researchProjectId);
  applyProject(project);
}

watch(() => form.purpose, (newVal) => {
  if (newVal === "CLASSROOM") {
    form.researchProjectId = null;
    const unit = props.units.find((u) => u.id === form.unitId) ?? props.units[0];
    if (unit) {
      form.unitId = unit.id;
      applyUnit(unit);
    } else {
      form.unitOrProject = "";
      form.classroom = "";
      form.program = null;
    }
  } else if (newVal === "RESEARCH") {
    form.unitId = null;
    form.classroom = "";
    const project = props.projects.find((p) => p.id === form.researchProjectId) ?? props.projects[0];
    if (project) {
      form.researchProjectId = project.id;
      applyProject(project);
    } else {
      form.unitOrProject = "";
      form.program = null;
    }
  } else {
    form.unitId = null;
    form.researchProjectId = null;
    form.classroom = "";
    form.unitOrProject = "";
    form.program = null;
  }
});

const search = ref("");
const cart = reactive([]);

const filteredAvailable = computed(() => {
  return availableEquipment.value.filter(item =>
    item.name.toLowerCase().includes(search.value.toLowerCase()) ||
    item.assetCode.toLowerCase().includes(search.value.toLowerCase())
  );
});

function addToCart(item) {
  cart.push({
    ...item,
    quantity: 1
  });
}

function removeFromCart(index) {
  cart.splice(index, 1);
}

function adjustQty(item, amount) {
  item.quantity = Math.max(1, item.quantity + amount);
}

function submit() {
  if (cart.length === 0) {
    alert("Please add at least one item to borrow.");
    return;
  }

  const requests = cart.map(item => ({
    equipmentId: item.id,
    classroom: form.purpose === "CLASSROOM" ? form.classroom : null,
    dueAt: new Date(form.dueAt).toISOString(),
    handoverNotes: form.handoverNotes,
    purpose: form.purpose,
    program: form.program,
    unitOrProject: form.purpose === "CLASSROOM" || form.purpose === "RESEARCH" ? form.unitOrProject : null,
    unitId: form.purpose === "CLASSROOM" ? form.unitId : null,
    researchProjectId: form.purpose === "RESEARCH" ? form.researchProjectId : null,
    quantity: item.quantity,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    recurrence: form.purpose === "CLASSROOM" && form.recurrence !== "NONE" ? form.recurrence : null
  }));

  // Emit either first request or all of them depending on parent capability
  emit("borrow", requests);
  
  // Clear cart
  cart.length = 0;
}
</script>

<template>
  <section class="panel action-panel borrow-panel-wizard">
    <div class="panel-heading compact">
      <ClipboardPlus :size="20" />
      <div>
        <h2>Borrow Equipment</h2>
        <p>Record classroom/research borrowing request.</p>
      </div>
    </div>
    
    <div class="stacked-form">
      <!-- Section 1: Details -->
      <div class="wizard-section">
        <h3 class="section-title">1. Unit & Purpose</h3>
        <div class="form-grid">
          <label>
            Purpose
            <select v-model="form.purpose">
              <option v-if="props.userRole !== 'EVENT_STAFF'" value="CLASSROOM">Classroom Use</option>
              <option v-if="props.userRole !== 'EVENT_STAFF'" value="RESEARCH">Research / Project</option>
              <option v-if="showEventOption" value="EVENT">Event Support</option>
            </select>
          </label>
          <label v-if="form.purpose === 'CLASSROOM'">
            Unit
            <select v-model="form.unitId" @change="onUnitChange">
              <option v-for="u in units" :key="u.id" :value="u.id">{{ u.code }} — {{ u.name }}</option>
            </select>
          </label>
          <label v-else-if="form.purpose === 'RESEARCH'">
            Research Project
            <select v-model="form.researchProjectId" @change="onProjectChange">
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Section 2: Items & Cart -->
      <div class="wizard-section">
        <h3 class="section-title">2. Select Equipment</h3>
        <div class="search-wrap">
          <input v-model="search" type="text" placeholder="Search available items..." class="item-search-input" />
        </div>
        
        <div class="available-items-list">
          <div v-for="item in filteredAvailable" :key="item.id" class="available-item-row">
            <span class="item-name">{{ item.assetCode }} - {{ item.name }}</span>
            <button type="button" class="add-to-cart-btn" @click="addToCart(item)">
              <Plus :size="12" /> Add
            </button>
          </div>
          <div v-if="filteredAvailable.length === 0" class="empty-list-text">
            No matching available equipment.
          </div>
        </div>

        <!-- Cart View -->
        <div class="cart-section">
          <div class="cart-header">
            <ShoppingCart :size="16" />
            <span>Borrowing List ({{ cart.length }})</span>
          </div>
          <div v-if="cart.length === 0" class="empty-cart-text">
            Cart is empty. Add equipment above.
          </div>
          <div v-else class="cart-items-list">
            <div v-for="(item, idx) in cart" :key="item.id" class="cart-item-row">
              <div class="cart-item-info">
                <strong>{{ item.assetCode }}</strong>
                <span>{{ item.name }}</span>
              </div>
              <div class="cart-item-qty">
                <button type="button" class="qty-btn" @click="adjustQty(item, -1)"><Minus :size="10" /></button>
                <span class="qty-num">{{ item.quantity }}</span>
                <button type="button" class="qty-btn" @click="adjustQty(item, 1)"><Plus :size="10" /></button>
              </div>
              <button type="button" class="remove-cart-btn" @click="removeFromCart(idx)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Section 3: Schedule details -->
      <div class="wizard-section">
        <h3 class="section-title">3. Schedule & Notes</h3>
        
        <div class="form-grid" style="margin-bottom: 12px;">
          <label>
            From
            <input v-model="form.startDate" type="datetime-local" />
          </label>
          <label>
            To
            <input v-model="form.dueAt" type="datetime-local" />
          </label>
        </div>

        <div v-if="form.purpose === 'CLASSROOM'" class="classroom-fields">
          <div class="form-grid">
            <label>
              Classroom
              <input v-model="form.classroom" type="text" readonly />
            </label>
            <label>
              Recurrence
              <select v-model="form.recurrence">
                <option value="NONE">Single Session</option>
                <option value="DAILY">Repeat Daily</option>
                <option value="WEEKLY">Repeat Weekly (Within Semester)</option>
                <option value="BIWEEKLY">Repeat Bi-weekly</option>
                <option value="MONTHLY">Repeat Monthly</option>
              </select>
            </label>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <p v-if="form.purpose === 'EVENT'" class="custody-hint">
            Event borrowing starts a chain-of-custody log. Record the initial custodian below.
          </p>
          <label>
            Handover notes / Event Custody Notes
            <textarea v-model="form.handoverNotes" rows="2" placeholder="Describe handover details..."></textarea>
          </label>
        </div>
      </div>

      <button type="button" class="submit-wizard-btn" :disabled="cart.length === 0" @click="submit">
        {{ isStudent ? "Submit Request" : "Submit Borrow Request" }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.borrow-panel-wizard {
  padding-bottom: 24px;
}
.wizard-section {
  border-bottom: 1px solid #eeeeef;
  padding-bottom: 16px;
  margin-bottom: 16px;
}
.section-title {
  font-size: 13px;
  text-transform: uppercase;
  color: #727285;
  margin: 0 0 12px;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.search-wrap {
  margin-bottom: 10px;
}
.item-search-input {
  width: 100%;
  min-height: 34px;
  font-size: 12px;
}
.available-items-list {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #eeeeef;
  border-radius: 3px;
  padding: 4px;
  background: #fafafa;
}
.available-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px;
  border-bottom: 1px solid #eeeeef;
  font-size: 11px;
}
.add-to-cart-btn {
  min-height: 22px;
  padding: 0 8px;
  font-size: 10px;
  background: #5f63ff;
}
.cart-section {
  margin-top: 14px;
  background: #f7f5ff;
  border: 1px solid #dcd8fc;
  border-radius: 3px;
  padding: 10px;
}
.cart-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #5f63ff;
  margin-bottom: 8px;
}
.cart-items-list {
  display: grid;
  gap: 6px;
}
.cart-item-row {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #eeeeef;
  border-radius: 3px;
  padding: 6px 8px;
}
.cart-item-info {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.cart-item-info strong {
  font-size: 11px;
  color: #244ca5;
}
.cart-item-info span {
  font-size: 11px;
  color: #3e3e4a;
}
.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-right: 10px;
}
.qty-btn {
  min-height: 20px;
  padding: 0;
  width: 20px;
  background: #eeeeef;
  color: #3e3e4a;
}
.qty-num {
  font-size: 11px;
  font-weight: 700;
  min-width: 14px;
  text-align: center;
}
.remove-cart-btn {
  background: transparent;
  color: #ef4444;
  padding: 0;
  min-height: auto;
}
.empty-list-text, .empty-cart-text {
  text-align: center;
  font-size: 11px;
  color: #727285;
  padding: 10px;
}
.submit-wizard-btn {
  width: 100%;
  margin-top: 10px;
}
.custody-hint {
  font-size: 11px;
  color: #7c3aed;
  background: #f3e8ff;
  border: 1px solid #ddd6fe;
  border-radius: 4px;
  padding: 6px 8px;
  margin: 0 0 8px;
}
</style>
