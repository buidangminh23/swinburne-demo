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
  }
});

const emit = defineEmits(["borrow"]);

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
  "EN403",
  "Vovinam Room"
];

const vovinamEquipment = computed(() => {
  return props.equipment.filter((item) => {
    if (item.status !== "AVAILABLE" || cart.some(c => c.id === item.id)) {
      return false;
    }
    return item.assetCode.startsWith("VOV-") || item.category === "Vovinam";
  });
});

const availableEquipment = computed(() => {
  return props.equipment.filter((item) => {
    if (item.status !== "AVAILABLE" || cart.some(c => c.id === item.id)) {
      return false;
    }
    const isVovinam = item.assetCode.startsWith("VOV-") || item.category === "Vovinam";
    
    if (form.purpose === "VOVINAM") {
      // If purpose is Vovinam Room, ONLY return Vovinam items
      return isVovinam;
    }
    return !isVovinam;
  });
});

const form = reactive({
  program: "Swinburne",
  purpose: "CLASSROOM",
  unitOrProject: "Teaching",
  classroom: "ATC 625",
  startDate: new Date().toISOString().slice(0, 16),
  dueAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16), // 3 hours from now
  recurrence: "NONE",
  handoverNotes: "Collected for classroom session"
});

onMounted(() => {
  if (props.userRole === "EVENT_STAFF") {
    form.purpose = "EVENT";
    form.handoverNotes = "Collected for event support";
  }
});

watch(() => form.purpose, (newVal) => {
  if (newVal === "VOVINAM") {
    form.classroom = "Vovinam Room";
    form.unitOrProject = "Study";
  } else if (newVal === "CLASSROOM") {
    form.unitOrProject = "Teaching";
  }
});

const filteredReasonOptions = computed(() => {
  if (form.purpose === "VOVINAM") {
    return ["Study", "Practice", "Group Work"];
  }
  return reasonOptions;
});

const search = ref("");
const cart = reactive([]);

const filteredAvailable = computed(() => {
  return availableEquipment.value.filter(item => 
    item.name.toLowerCase().includes(search.value.toLowerCase()) || 
    item.assetCode.toLowerCase().includes(search.value.toLowerCase())
  );
});

const filteredVovinam = computed(() => {
  return vovinamEquipment.value.filter(item => 
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

  // We emit the borrow event for each item in the cart
  // The parent handles single or array requests. Let's map cart into request objects:
  const requests = cart.map(item => ({
    equipmentId: item.id,
    classroom: form.purpose === "CLASSROOM" || form.purpose === "VOVINAM" ? form.classroom : null,
    dueAt: new Date(form.dueAt).toISOString(),
    handoverNotes: form.handoverNotes,
    purpose: form.purpose === "VOVINAM" ? "CLASSROOM" : form.purpose,
    program: form.program,
    unitOrProject: form.purpose === "CLASSROOM" || form.purpose === "VOVINAM" ? form.unitOrProject : null,
    quantity: item.quantity,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    recurrence: (form.purpose === "CLASSROOM" || form.purpose === "VOVINAM") && form.recurrence !== "NONE" ? form.recurrence : null
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
        <h3 class="section-title">1. University & Purpose</h3>
        <div class="form-grid">
          <label>
            University
            <select v-model="form.program">
              <option value="Swinburne">Swinburne</option>
              <option value="Asia">Asia</option>
              <option value="FPT">FPT</option>
            </select>
          </label>
          <label>
            Purpose
            <select v-model="form.purpose">
              <option value="CLASSROOM">Classroom Use</option>
              <option value="VOVINAM">Vovinam Room</option>
              <option value="LAB">Lab Session</option>
              <option value="RESEARCH">Research Project</option>
              <option value="EVENT">Event Support</option>
            </select>
          </label>
        </div>
        <div v-if="form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM'" style="margin-top: 12px;">
          <label>
            Reason of Use
            <select v-model="form.unitOrProject">
              <option v-for="r in filteredReasonOptions" :key="r" :value="r">{{ r }}</option>
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

        <!-- Additional Vovinam Equipment section for all accounts -->
        <div v-if="(form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM') && form.classroom === 'Vovinam Room'" class="vovinam-equipment-section">
          <h4 class="vovinam-section-title">🥋 Đồ dùng phòng học võ (Martial Arts Equipment)</h4>
          <div class="vovinam-items-list">
            <div v-for="item in filteredVovinam" :key="item.id" class="vovinam-item-row">
              <span class="vovinam-item-name">{{ item.assetCode }} - {{ item.name }}</span>
              <button type="button" class="add-to-vov-btn" @click="addToCart(item)">
                <Plus :size="12" /> Add
              </button>
            </div>
            <div v-if="filteredVovinam.length === 0" class="empty-list-text">
              Không có đồ dùng học võ khả dụng.
            </div>
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

        <div v-if="form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM'" class="classroom-fields">
          <div class="form-grid">
            <label>
              Classroom
              <select v-model="form.classroom" :disabled="form.purpose === 'VOVINAM'">
                <option v-for="c in classroomOptions" :key="c" :value="c">{{ c }}</option>
              </select>
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

.vovinam-equipment-section {
  margin-top: 16px;
  background: #f0f7ff;
  border: 1px solid #cce3f5;
  border-radius: 6px;
  padding: 12px;
}
.vovinam-section-title {
  font-size: 12px;
  font-weight: 800;
  color: #1d4ed8;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.vovinam-items-list {
  max-height: 150px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 4px;
}
.vovinam-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 11.5px;
}
.vovinam-item-row:last-child {
  border-bottom: 0;
}
.vovinam-item-name {
  color: #334155;
  font-weight: 500;
}
.add-to-vov-btn {
  min-height: 22px;
  padding: 0 8px;
  font-size: 10px;
  background: #2563eb;
  color: white;
  border: 0;
  border-radius: 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.add-to-vov-btn:hover {
  background: #1d4ed8;
}
</style>
