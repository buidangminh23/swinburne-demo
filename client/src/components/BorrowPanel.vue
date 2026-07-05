<script setup>
import { computed, reactive, ref, onMounted, watch } from "vue";
import { ClipboardPlus, Trash2, Plus, Minus, ShoppingCart } from "@lucide/vue";
import { analyzeBorrowRequest } from "../demoOperations";

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
  requests: {
    type: Array,
    default: () => []
  },
  session: {
    type: Object,
    default: null
  },
  units: {
    type: Array,
    default: () => []
  },
  projects: {
    type: Array,
    default: () => []
  },
  managers: {
    type: Array,
    default: () => []
  },
  serverManagers: {
    type: Array,
    default: () => []
  },
  lecturers: {
    type: Array,
    default: () => []
  },
  prefill: {
    type: Object,
    default: null
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
    const status = item.displayStatus ?? item.status;
    const availableNow = item.availableNow ?? 1;
    if (status !== "AVAILABLE" || availableNow <= 0 || cart.some(c => c.id === item.id)) {
      return false;
    }
    const isServer = item.category === "Server";
    return form.purpose === "SERVER" ? isServer : !isServer;
  });
});

const form = reactive({
  program: null,
  purpose: "CLASSROOM",
  unitOrProject: "",
  unitId: null,
  researchProjectId: null,
  assignedManagerId: null,
  eventName: "",
  classroom: "",
  startDate: new Date().toISOString().slice(0, 16),
  dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16),
  recurrence: "NONE",
  handoverNotes: "Collected for classroom session"
});

const showEventOption = computed(() => props.userRole === "EVENT_STAFF");
const isEventStaff = computed(() => props.userRole === "EVENT_STAFF");
const needsApprover = computed(() => ["RESEARCH", "EVENT", "SERVER"].includes(form.purpose));
const approverOptions = computed(() => {
  if (form.purpose === "SERVER") return props.isStudent ? props.lecturers : props.serverManagers;
  if (form.purpose === "RESEARCH" || form.purpose === "EVENT") return props.managers;
  return [];
});
const approverLabel = computed(() => {
  if (form.purpose === "SERVER") return props.isStudent ? "Approver (Lecturer)" : "Approver (Server Manager)";
  return "Approver (Equipment Manager)";
});

onMounted(() => {
  if (props.userRole === "EVENT_STAFF") {
    form.purpose = "EVENT";
    form.handoverNotes = "Collected for event support";
  } else if (props.isStudent) {
    form.purpose = "SERVER";
  }
});

function applyUnit(unitId) {
  const unit = props.units.find((u) => u.id === unitId);
  if (!unit) return;
  form.unitId = unit.id;
  form.unitOrProject = unit.code;
  form.program = unit.code;
  form.classroom = unit.classroom;
  const { start, end } = nextOccurrence(unit.dayOfWeek, unit.startHour, unit.endHour);
  form.startDate = toLocalInput(start);
  form.dueAt = toLocalInput(end);
}

function applyProject(projectId) {
  const project = props.projects.find((p) => p.id === projectId);
  if (!project) return;
  form.researchProjectId = project.id;
  form.unitOrProject = project.name;
  form.program = project.name;
  form.startDate = toLocalInput(new Date());
  const end = project.endDate ? new Date(project.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  form.dueAt = toLocalInput(end);
}

const getDefaultNotes = (purpose) => {
  if (purpose === "CLASSROOM") return "Collected for classroom session";
  if (purpose === "RESEARCH") return "Equipment needed for research project activity";
  if (purpose === "LAB") return "Required for laboratory practical session";
  if (purpose === "EVENT") return "Collected for campus event support";
  return "Equipment request for academic purpose";
};

watch(() => form.purpose, (newVal, oldVal) => {
  const oldDefault = oldVal ? getDefaultNotes(oldVal) : "";
  if (!form.handoverNotes || !form.handoverNotes.trim() || form.handoverNotes === oldDefault) {
    form.handoverNotes = getDefaultNotes(newVal);
  }
  form.unitId = null;
  form.researchProjectId = null;
  if (newVal === "CLASSROOM") {
    form.unitOrProject = "";
    form.classroom = "";
    if (props.units.length > 0) {
      applyUnit(props.units[0].id);
    }
  } else if (newVal === "RESEARCH") {
    form.classroom = "";
    if (props.projects.length > 0) {
      applyProject(props.projects[0].id);
    } else {
      form.unitOrProject = "";
    }
  } else {
    form.unitOrProject = "";
    form.classroom = "";
    form.program = null;
  }
  form.assignedManagerId = ["RESEARCH", "EVENT", "SERVER"].includes(newVal) ? (approverOptions.value[0]?.id ?? null) : null;
});

watch(() => form.unitId, (newVal) => {
  if (form.purpose === "CLASSROOM" && newVal != null) {
    applyUnit(newVal);
  }
});

watch(() => form.researchProjectId, (newVal) => {
  if (form.purpose === "RESEARCH" && newVal != null) {
    applyProject(newVal);
  }
});

watch(() => props.units, (list) => {
  if (form.purpose === "CLASSROOM" && form.unitId == null && list.length > 0) {
    applyUnit(list[0].id);
  }
}, { immediate: true });

watch(() => props.projects, (list) => {
  if (form.purpose === "RESEARCH" && form.researchProjectId == null && list.length > 0) {
    applyProject(list[0].id);
  }
}, { immediate: true });

watch(approverOptions, (list) => {
  if (needsApprover.value && list.length > 0 && (form.assignedManagerId == null || !list.some((m) => m.id === form.assignedManagerId))) {
    form.assignedManagerId = list[0].id;
  }
}, { immediate: true });

const search = ref("");
const cart = reactive([]);
const error = ref("");
const submitting = ref(false);

watch(() => props.prefill, (incoming) => {
  if (!incoming || !incoming.equipmentId) return;
  const item = props.equipment.find((candidate) => candidate.id === incoming.equipmentId);
  if (item && !cart.some((entry) => entry.id === item.id)) {
    cart.push({ ...item, quantity: 1 });
  }
  if (incoming.startDate) form.startDate = toLocalInput(new Date(incoming.startDate));
  if (incoming.dueAt) form.dueAt = toLocalInput(new Date(incoming.dueAt));
}, { immediate: true });

const preflightResults = computed(() => {
  return cart.map((item) => analyzeBorrowRequest({
    equipment: props.equipment,
    requests: props.requests,
    payload: {
      equipmentId: item.id,
      lecturerId: props.session?.user?.id,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      dueAt: new Date(form.dueAt).toISOString(),
      quantity: item.quantity
    },
    requesterId: props.session?.user?.id
  }));
});

const hasBlockingConflict = computed(() => preflightResults.value.some((result) => !result.canSubmit));

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
  if (submitting.value) return;
  error.value = "";

  if (cart.length === 0) {
    error.value = "Please add at least one item to borrow.";
    return;
  }
  if (hasBlockingConflict.value) {
    error.value = "Resolve schedule conflicts before submitting this borrow request.";
    return;
  }

  const dueDate = new Date(form.dueAt);
  if (isNaN(dueDate.getTime())) {
    error.value = "Please provide a valid return date.";
    return;
  }
  if (dueDate.getTime() <= Date.now()) {
    error.value = "Return date must be in the future.";
    return;
  }
  if (form.startDate) {
    const startDate = new Date(form.startDate);
    if (!isNaN(startDate.getTime()) && dueDate.getTime() <= startDate.getTime()) {
      error.value = "Return date must be after the start date.";
      return;
    }
  }

  if (!form.handoverNotes || !form.handoverNotes.trim()) {
    form.handoverNotes = getDefaultNotes(form.purpose);
  }

  if (needsApprover.value && !form.assignedManagerId) {
    error.value = "Please select an approver for this request.";
    return;
  }
  if (form.purpose === "EVENT" && !form.eventName.trim()) {
    error.value = "Please enter the event name.";
    return;
  }

  submitting.value = true;

  const requests = cart.map(item => ({
    equipmentId: item.id,
    assignedManagerId: needsApprover.value ? form.assignedManagerId : null,
    classroom: form.purpose === "CLASSROOM" ? form.classroom : null,
    dueAt: dueDate.toISOString(),
    handoverNotes: form.handoverNotes,
    purpose: form.purpose,
    program: form.purpose === "EVENT" ? null : form.program,
    unitOrProject: form.purpose === "EVENT" ? form.eventName : form.unitOrProject,
    unitId: form.purpose === "CLASSROOM" ? form.unitId : null,
    researchProjectId: form.purpose === "RESEARCH" ? form.researchProjectId : null,
    quantity: item.quantity,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    recurrence: form.purpose === "CLASSROOM" && form.recurrence !== "NONE" ? form.recurrence : null
  }));

  emit("borrow", requests);

  cart.length = 0;
  submitting.value = false;
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
              <option v-if="!props.isStudent && !isEventStaff" value="CLASSROOM">Classroom Use</option>
              <option v-if="!props.isStudent && !isEventStaff" value="LAB">Lab Equipment</option>
              <option v-if="!props.isStudent && !isEventStaff" value="RESEARCH">Research / Project</option>
              <option v-if="showEventOption" value="EVENT">Event Support</option>
              <option v-if="!isEventStaff" value="SERVER">Server Usage</option>
            </select>
          </label>
          <label v-if="form.purpose === 'CLASSROOM'">
            Unit
            <select v-model="form.unitId">
              <option v-for="u in props.units" :key="u.id" :value="u.id">{{ u.code }} - {{ u.name }}</option>
            </select>
          </label>
          <label v-else-if="form.purpose === 'RESEARCH'">
            Research Project
            <select v-model="form.researchProjectId">
              <option v-for="p in props.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label v-if="form.purpose === 'EVENT'">
            Event Name
            <input v-model="form.eventName" type="text" placeholder="e.g. Orientation Day" />
          </label>
          <label v-if="needsApprover">
            {{ approverLabel }}
            <select v-model="form.assignedManagerId">
              <option v-for="m in approverOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- Section 2: Items & Cart -->
      <div class="wizard-section">
        <h3 class="section-title">2. Select Equipment</h3>
        <div class="search-wrap">
          <input v-model="search" type="text" placeholder="Search available items..." class="item-search-input" :aria-label="t('Search available items')" />
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
            <input v-model="form.startDate" type="datetime-local" :readonly="form.purpose === 'CLASSROOM'" />
          </label>
          <label>
            To
            <input v-model="form.dueAt" type="datetime-local" :readonly="form.purpose === 'CLASSROOM'" />
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
            Handover notes / Event Custody Notes (Required)
            <textarea v-model="form.handoverNotes" rows="2" maxlength="240" placeholder="Describe handover details (required)..."></textarea>
          </label>
        </div>
      </div>

      <div v-if="preflightResults.length > 0" class="preflight-panel">
        <h3 class="section-title">Smart Duplicate & Conflict Check</h3>
        <div v-for="(result, index) in preflightResults" :key="cart[index]?.id" :class="['preflight-card', { blocked: !result.canSubmit }]">
          <strong>{{ cart[index]?.assetCode }} - {{ cart[index]?.name }}</strong>
          <span v-if="result.canSubmit" class="preflight-ok">Available for selected time.</span>
          <span v-for="message in result.messages" :key="message" class="preflight-message">{{ message }}</span>
          <span v-if="result.duplicates.length" class="preflight-warning">Possible duplicate request from this lecturer.</span>
          <div v-if="result.replacements.length" class="replacement-list">
            <span>Replacement suggestion:</span>
            <button
              v-for="replacement in result.replacements.slice(0, 3)"
              :key="replacement.id"
              type="button"
              class="replacement-chip"
              @click="addToCart(replacement)"
            >
              {{ replacement.assetCode }} · {{ replacement.availableUnits }} free
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="button" class="submit-wizard-btn" :disabled="cart.length === 0 || hasBlockingConflict || submitting" @click="submit">
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
.preflight-panel {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}
.preflight-card {
  background: #fff;
  border: 1px solid #ececf3;
  border-radius: 4px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 8px;
}
.preflight-card.blocked {
  border-color: #fec0cb;
  background: #fff1f2;
}
.preflight-ok {
  color: #047857;
  font-size: 12px;
  font-weight: 700;
}
.preflight-message,
.preflight-warning {
  color: #b91c1c;
  font-size: 12px;
}
.replacement-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: 12px;
}
.replacement-chip {
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  font-size: 11px;
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
.error {
  color: #b91c1c;
  background: #fff1f2;
  border: 1px solid #fec0cb;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  margin: 0 0 10px;
}
</style>
