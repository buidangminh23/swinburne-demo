<script setup>
import { reactive, watch, computed } from "vue";
import { Pencil } from "@lucide/vue";

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

const props = defineProps({
  request: {
    type: Object,
    default: null
  },
  session: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(["save", "close"]);

import { makeTranslator } from "../translate";
const t = makeTranslator(props.session?.user?.email);

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
    const isVovinam = request.purpose === "CLASSROOM" && request.classroom === "Vovinam Room";
    form.purpose = isVovinam ? "VOVINAM" : (request.purpose ?? "CLASSROOM");
    form.program = request.program ?? "";
    form.unitOrProject = request.unitOrProject || (isVovinam ? "Study" : "Teaching");
    form.classroom = request.classroom ?? "ATC 625";
    form.dueAt = toLocalInput(request.dueAt);
    form.startDate = toLocalInput(request.startDate);
    form.recurrence = request.recurrence ?? "NONE";
    form.quantity = request.quantity ?? 1;
    form.handoverNotes = request.handoverNotes ?? "";
  },
  { immediate: true }
);

watch(() => form.purpose, (newVal) => {
  if (newVal === "VOVINAM") {
    form.classroom = "Vovinam Room";
    if (!["Study", "Practice", "Group Work"].includes(form.unitOrProject)) {
      form.unitOrProject = "Study";
    }
  } else if (newVal === "CLASSROOM") {
    if (form.classroom === "Vovinam Room") {
      form.classroom = "ATC 625";
    }
    form.unitOrProject = "Teaching";
  }
});

const filteredReasonOptions = computed(() => {
  if (form.purpose === "VOVINAM") {
    return ["Study", "Practice", "Group Work"];
  }
  return reasonOptions;
});

function submit() {
  const isVov = form.purpose === "VOVINAM";
  const payload = {
    purpose: isVov ? "CLASSROOM" : form.purpose,
    program: form.program || null,
    unitOrProject: form.purpose === "CLASSROOM" || isVov ? form.unitOrProject : null,
    classroom: isVov ? "Vovinam Room" : (form.classroom || null),
    dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    quantity: Number(form.quantity) || 1,
    recurrence: (form.purpose === "CLASSROOM" || isVov) && form.recurrence !== "NONE" ? form.recurrence : null,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    handoverNotes: form.handoverNotes || null
  };
  emit("save", { id: props.request.id, payload });
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
            <option value="VOVINAM">{{ t('Vovinam Room') }}</option>
            <option value="LAB">{{ t('Lab Session') }}</option>
            <option value="RESEARCH">{{ t('Research Work') }}</option>
            <option value="EVENT">{{ t('Swinburne Event') }}</option>
          </select>
        </label>
        <label>
          {{ t('University:') }}
          <select v-model="form.program">
            <option value="Swinburne">{{ t('Swinburne') }}</option>
            <option value="Asia">{{ t('Asia') }}</option>
            <option value="FPT">{{ t('FPT') }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM'">
          {{ t('Classroom') }}
          <select v-model="form.classroom" :disabled="form.purpose === 'VOVINAM'">
            <option v-for="c in classroomOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM'">
          {{ t('Reason of Use:') }}
          <select v-model="form.unitOrProject">
            <option v-for="r in filteredReasonOptions" :key="r" :value="r">{{ t(r) }}</option>
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
        <label v-if="form.purpose === 'CLASSROOM' || form.purpose === 'VOVINAM'">
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
          <input v-model="form.quantity" type="number" min="1" />
        </label>
        <label>
          {{ t('Handover Notes') }}
          <textarea v-model="form.handoverNotes" rows="2"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="$emit('close')">{{ t('Cancel') }}</button>
          <button type="submit" class="btn-confirm">{{ t('Save Changes') }}</button>
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
</style>
