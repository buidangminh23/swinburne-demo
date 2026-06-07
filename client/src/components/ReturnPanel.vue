<script setup>
import { ref, reactive, watch, computed } from "vue";
import { CheckCircle2, AlertTriangle, Check, X } from "@lucide/vue";

const props = defineProps({
  requests: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["return"]);

const selectedRequestId = ref("");

const returnableRequests = computed(() =>
  props.requests.filter((request) => request.status === "BORROWED")
);

const form = reactive({
  returnedQuantity: 1,
  isStatusOk: true,
  damageReport: ""
});

// Watch selected request to update default returned quantity
watch(selectedRequestId, (newVal) => {
  const req = returnableRequests.value.find(r => r.id === Number(newVal));
  if (req) {
    form.returnedQuantity = req.quantity ?? 1;
    form.isStatusOk = true;
    form.damageReport = "";
  }
});

function submit() {
  if (!selectedRequestId.value) return;
  
  emit("return", {
    id: Number(selectedRequestId.value),
    payload: {
      returnedQuantity: Number(form.returnedQuantity),
      isStatusOk: form.isStatusOk,
      damageReport: form.isStatusOk ? "" : form.damageReport
    }
  });

  // Reset selection
  selectedRequestId.value = "";
}
</script>

<template>
  <section class="panel action-panel return-checklist-panel">
    <div class="panel-heading compact">
      <CheckCircle2 :size="20" />
      <div>
        <h2>Confirm return</h2>
        <p>Close active borrowed items with checklist verification.</p>
      </div>
    </div>

    <div v-if="returnableRequests.length === 0" class="return-list">
      <p class="empty-state">No borrowed items pending return.</p>
    </div>

    <div v-else class="return-flow-wrap">
      <!-- Select request -->
      <label class="form-field">
        Select Borrow Record:
        <select v-model="selectedRequestId" class="select-request-dropdown">
          <option value="">Choose item to return</option>
          <option v-for="request in returnableRequests" :key="request.id" :value="request.id">
            {{ request.equipment?.assetCode }} - {{ request.equipment?.name }} ({{ request.lecturer?.name }})
          </option>
        </select>
      </label>

      <!-- Checklist details -->
      <form v-if="selectedRequestId" class="stacked-form return-form" @submit.prevent="submit">
        <div class="checklist-grid">
          <label>
            Quantity Returned:
            <input 
              v-model="form.returnedQuantity" 
              type="number" 
              min="1" 
              class="qty-input"
            />
          </label>

          <div class="status-verify-wrap">
            <span class="verify-label">Status OK?</span>
            <div class="verify-buttons">
              <button 
                type="button" 
                :class="['verify-btn yes', { active: form.isStatusOk }]"
                @click="form.isStatusOk = true"
              >
                <Check :size="14" /> Yes
              </button>
              <button 
                type="button" 
                :class="['verify-btn no', { active: !form.isStatusOk }]"
                @click="form.isStatusOk = false"
              >
                <X :size="14" /> No
              </button>
            </div>
          </div>
        </div>

        <!-- Damage Report Form -->
        <div v-if="!form.isStatusOk" class="damage-report-wrap">
          <label class="danger-alert-label">
            <AlertTriangle :size="14" /> Damage/Incident Report:
            <textarea 
              v-model="form.damageReport" 
              rows="3" 
              placeholder="Describe damage, missing accessories, or issues..."
              required
            ></textarea>
          </label>
        </div>

        <button type="submit" class="submit-return-btn">
          Confirm Return
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.return-flow-wrap {
  padding: 18px 28px 24px;
}
.form-field {
  display: block;
  margin-bottom: 16px;
}
.select-request-dropdown {
  width: 100%;
  margin-top: 6px;
}
.return-form {
  border-top: 1px solid #eeeeef;
  padding-top: 16px;
  gap: 14px;
}
.checklist-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: end;
}
.qty-input {
  width: 100%;
}
.status-verify-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.verify-label {
  font-size: 12px;
  font-weight: 700;
  color: #474753;
}
.verify-buttons {
  display: flex;
  gap: 8px;
}
.verify-btn {
  flex-grow: 1;
  min-height: 38px;
  background: #ffffff;
  border: 1px solid #d8d8e4;
  color: #3e3e4a;
  border-radius: 3px;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.verify-btn.yes.active {
  background: #ecfdf3;
  color: #047857;
  border-color: #a7e9cc;
}
.verify-btn.no.active {
  background: #fff1f2;
  color: #b91c1c;
  border-color: #fec0cb;
}
.damage-report-wrap {
  background: #fff1f2;
  border: 1px solid #fec0cb;
  border-radius: 3px;
  padding: 10px;
}
.danger-alert-label {
  color: #b91c1c;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.danger-alert-label textarea {
  border-color: #fec0cb;
}
.submit-return-btn {
  width: 100%;
  background: #10b981;
}
.submit-return-btn:hover {
  background: #0ca678;
}
.empty-state {
  padding: 0 28px 24px;
  color: #727285;
}
</style>
