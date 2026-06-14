<script setup>
import { ref, reactive, watch, computed } from "vue";
import { CheckCircle2, AlertTriangle, Check, X } from "@lucide/vue";

import { makeTranslator } from "../translate";

const props = defineProps({
  requests: {
    type: Array,
    default: () => []
  },
  session: {
    type: Object,
    required: true
  }
});

const t = makeTranslator(props.session?.user?.email);

const emit = defineEmits(["return"]);

const selectedRequestId = ref("");

const returnableRequests = computed(() =>
  props.requests.filter((request) => request.status === "BORROWED")
);

const selectedRequest = computed(() =>
  returnableRequests.value.find((request) => request.id === Number(selectedRequestId.value)) ?? null
);

const form = reactive({
  returnedQuantity: 1,
  isStatusOk: true,
  damageReport: "",
  conditionBefore: "",
  conditionAfter: "",
  photoBeforeUrl: "",
  photoAfterUrl: "",
  accessoryChecks: {}
});

const expectedAccessories = computed(() => selectedRequest.value?.equipment?.accessories ?? []);

const selectedRemainingQuantity = computed(() => {
  const req = selectedRequest.value;
  if (!req) return 1;
  return req.remainingQuantity ?? Math.max(1, (req.quantity ?? 1) - (req.returnedQuantity ?? 0));
});

// Watch selected request to update default returned quantity
watch(selectedRequestId, (newVal) => {
  const req = returnableRequests.value.find(r => r.id === Number(newVal));
  if (req) {
    form.returnedQuantity = selectedRemainingQuantity.value;
    form.isStatusOk = true;
    form.damageReport = "";
    form.conditionBefore = req.equipment?.conditionNotes ?? "";
    form.conditionAfter = "";
    form.photoBeforeUrl = req.photoBeforeUrl ?? "";
    form.photoAfterUrl = "";
    form.accessoryChecks = {};
    for (const accessory of req.equipment?.accessories ?? []) {
      form.accessoryChecks[accessory] = true;
    }
  }
});

function submit() {
  if (!selectedRequestId.value) return;

  emit("return", {
    id: Number(selectedRequestId.value),
    payload: {
      returnedQuantity: Number(form.returnedQuantity),
      isStatusOk: form.isStatusOk,
      damageReport: form.isStatusOk ? "" : form.damageReport,
      conditionBefore: form.conditionBefore,
      conditionAfter: form.conditionAfter,
      photoBeforeUrl: form.photoBeforeUrl,
      photoAfterUrl: form.photoAfterUrl,
      accessoriesReturned: expectedAccessories.value.filter((item) => form.accessoryChecks[item]),
      accessoriesMissing: expectedAccessories.value.filter((item) => !form.accessoryChecks[item])
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
        <h2>{{ t('Confirm Return') }}</h2>
        <p>{{ t('Close active borrowed items with checklist verification.') }}</p>
      </div>
    </div>

    <div v-if="returnableRequests.length === 0" class="return-list">
      <p class="empty-state">{{ t('No borrowed items pending return.') }}</p>
    </div>

    <div v-else class="return-flow-wrap">
      <!-- Select request -->
      <label class="form-field">
        {{ t('Select Borrow Record:') }}
        <select v-model="selectedRequestId" class="select-request-dropdown">
          <option value="">{{ t('Choose item to return') }}</option>
          <option v-for="request in returnableRequests" :key="request.id" :value="request.id">
            {{ request.equipment?.assetCode }} - {{ request.equipment?.name }} ({{ request.lecturer?.name }})
          </option>
        </select>
      </label>

      <!-- Checklist details -->
      <form v-if="selectedRequestId" class="stacked-form return-form" @submit.prevent="submit">
        <div class="checklist-grid">
          <label>
            {{ t('Quantity Returned:') }}
            <input
              v-model="form.returnedQuantity"
              type="number"
              min="1"
              :max="selectedRemainingQuantity"
              class="qty-input"
            />
            <small class="field-hint">{{ t('Remaining: ') }}{{ selectedRemainingQuantity }} / {{ t('original ') }}{{ selectedRequest?.quantity ?? 1 }}</small>
          </label>

          <div class="status-verify-wrap">
            <span class="verify-label">{{ t('Status OK?') }}</span>
            <div class="verify-buttons">
              <button
                type="button"
                :class="['verify-btn yes', { active: form.isStatusOk }]"
                @click="form.isStatusOk = true"
              >
                <Check :size="14" /> {{ t('Yes') }}
              </button>
              <button
                type="button"
                :class="['verify-btn no', { active: !form.isStatusOk }]"
                @click="form.isStatusOk = false"
              >
                <X :size="14" /> {{ t('No') }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="expectedAccessories.length" class="accessory-checklist">
          <span class="verify-label">{{ t('Accessory Checklist') }}</span>
          <label v-for="accessory in expectedAccessories" :key="accessory" class="accessory-row">
            <input v-model="form.accessoryChecks[accessory]" type="checkbox" />
            <span>{{ accessory }}</span>
          </label>
        </div>

        <div class="condition-grid">
          <label>
            {{ t('Condition Before') }}
            <textarea v-model="form.conditionBefore" rows="2" :placeholder="t('Condition before handover...')"></textarea>
          </label>
          <label>
            {{ t('Condition After') }}
            <textarea v-model="form.conditionAfter" rows="2" :placeholder="t('Condition after return...')"></textarea>
          </label>
          <label>
            {{ t('Before Photo URL') }}
            <input v-model="form.photoBeforeUrl" type="url" placeholder="https://..." />
          </label>
          <label>
            {{ t('After Photo URL') }}
            <input v-model="form.photoAfterUrl" type="url" placeholder="https://..." />
          </label>
        </div>

        <!-- Damage Report Form -->
        <div v-if="!form.isStatusOk" class="damage-report-wrap">
          <label class="danger-alert-label">
            <AlertTriangle :size="14" /> {{ t('Damage/Incident Report:') }}
            <textarea
              v-model="form.damageReport"
              rows="3"
              :placeholder="t('Describe damage, missing accessories, or issues...')"
              required
            ></textarea>
          </label>
        </div>

        <button type="submit" class="submit-return-btn">
          {{ t('Confirm Return') }}
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
.field-hint {
  color: #727285;
  font-size: 11px;
  margin-top: 4px;
  display: block;
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
.accessory-checklist {
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  padding: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.accessory-checklist .verify-label {
  grid-column: 1 / -1;
}
.accessory-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #474753;
}
.condition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.condition-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #474753;
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
