<script setup>
import { reactive, ref, watch } from "vue";
import { Pencil } from "@lucide/vue";

const classroomOptions = [
  "HN-DT1-9.1",
  "HN-DT1-9.2",
  "HN-ATC-6.25",
  "HN-ATC-6.28",
  "HN-BA-7.01",
  "HN-EN-4.02",
  "HN-EN-4.03",
  "HN-LIB-DESK",
  "HN-MED-DESK"
];

const props = defineProps({
  request: {
    type: Object,
    default: null
  },
  session: {
    type: Object,
    required: true
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

const emit = defineEmits(["save", "close"]);

import { makeTranslator } from "../translate";
const t = (text) => makeTranslator(props.session?.user?.email)(text);

const form = reactive({
  purpose: "CLASSROOM",
  program: "",
  unitOrProject: "",
  classroom: "",
  dueAt: "",
  startDate: "",
  recurrence: "NONE",
  quantity: 1,
  handoverNotes: ""
});

function toLocalInput(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

watch(
  () => props.request,
  (request) => {
    if (!request) return;
    form.purpose = request.purpose ?? "CLASSROOM";
    form.program = request.program ?? "";
    form.unitOrProject = request.unitOrProject ?? "";
    form.classroom = request.classroom ?? classroomOptions[0];
    form.dueAt = toLocalInput(request.dueAt);
    form.startDate = toLocalInput(request.startDate);
    form.recurrence = request.recurrence ?? "NONE";
    form.quantity = request.quantity ?? 1;
    form.handoverNotes = request.handoverNotes ?? "";
  },
  { immediate: true }
);

const error = ref("");
const submitting = ref(false);

function submit() {
  if (submitting.value) return;
  error.value = "";

  if (!form.dueAt) {
    error.value = t("Please provide a return date.");
    return;
  }
  const dueDate = new Date(form.dueAt);
  if (isNaN(dueDate.getTime())) {
    error.value = t("Please provide a valid return date.");
    return;
  }
  if (dueDate.getTime() <= Date.now()) {
    error.value = t("Return date must be in the future.");
    return;
  }
  if (form.startDate) {
    const startDate = new Date(form.startDate);
    if (!isNaN(startDate.getTime()) && dueDate.getTime() <= startDate.getTime()) {
      error.value = t("Return date must be after the start date.");
      return;
    }
  }

  submitting.value = true;

  const payload = {
    purpose: form.purpose,
    program: form.program || null,
    unitOrProject: form.unitOrProject || null,
    classroom: form.purpose === "CLASSROOM" ? form.classroom || null : null,
    dueAt: dueDate.toISOString(),
    quantity: Math.max(1, Math.floor(Number(form.quantity)) || 1),
    recurrence: form.purpose === "CLASSROOM" && form.recurrence !== "NONE" ? form.recurrence : null,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    handoverNotes: form.handoverNotes || null
  };
  emit("save", { id: props.request.id, payload });

  submitting.value = false;
}
</script>

<template>
  <div v-if="request" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-header">
        <h3><Pencil :size="16" /> {{ t('Modify Borrow Request') }} — {{ request.equipment?.name }}</h3>
        <button type="button" class="close-btn" @click="$emit('close')">&times;</button>
      </header>
      <form class="modal-form" @submit.prevent="submit">
        <label>
          {{ t('Purpose') }}
          <select v-model="form.purpose">
            <option value="CLASSROOM">{{ t('Classroom Instruction') }}</option>
            <option value="RESEARCH">{{ t('Research Work') }}</option>
            <option value="EVENT">{{ t('Swinburne Event') }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'CLASSROOM'">
          {{ t('Classroom') }}
          <select v-model="form.classroom">
            <option v-for="c in classroomOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <div class="form-row">
          <label>
            {{ t('From') }}
            <input v-model="form.startDate" type="datetime-local" />
          </label>
          <label>
            {{ t('To') }}
            <input v-model="form.dueAt" type="datetime-local" />
          </label>
        </div>
        <label v-if="form.purpose === 'CLASSROOM'">
          {{ t('Recurrence') }}
          <select v-model="form.recurrence">
            <option value="NONE">{{ t('Single Session') }}</option>
            <option value="DAILY">{{ t('Repeat Daily') }}</option>
            <option value="WEEKLY">{{ t('Repeat Weekly (Within Semester)') }}</option>
            <option value="BIWEEKLY">{{ t('Repeat Bi-weekly') }}</option>
            <option value="MONTHLY">{{ t('Repeat Monthly') }}</option>
          </select>
        </label>
        <label>
          {{ t('Quantity') }}
          <input v-model="form.quantity" type="number" min="1" step="1" />
        </label>
        <label>
          {{ t('Handover Notes') }}
          <textarea v-model="form.handoverNotes" rows="2" maxlength="240"></textarea>
        </label>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="$emit('close')">{{ t('Cancel') }}</button>
          <button type="submit" class="btn-confirm" :disabled="submitting">{{ t('Save Changes') }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
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
  max-height: 90vh;
  display: flex;
  flex-direction: column;
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
  display: flex;
  align-items: center;
  gap: 8px;
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
  gap: 14px;
  overflow-y: auto;
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
.modal-form select,
.modal-form textarea {
  border: 1px solid #d8d8e4;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 13px;
  outline: none;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 4px;
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
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: #b91c1c;
  background: #fff1f2;
  border: 1px solid #fec0cb;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 600;
  margin: 0;
}
</style>
