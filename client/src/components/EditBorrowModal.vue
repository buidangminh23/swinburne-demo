<script setup>
import { reactive, watch, computed } from "vue";
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
  },
  isExtendMode: {
    type: Boolean,
    default: false
  }
});

const showEventOption = computed(() => props.session?.user?.role === "EVENT_STAFF" || props.request?.purpose === "EVENT");

const emit = defineEmits(["save", "close"]);

import { makeTranslator } from "../translate";
const t = makeTranslator(props.session?.user?.email);

const form = reactive({
  purpose: "CLASSROOM",
  program: "",
  unitOrProject: "",
  unitId: null,
  researchProjectId: null,
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

const dueAtInput = ref(null);

watch(
  () => props.request,
  (request) => {
    if (!request) return;
    form.purpose = request.purpose === "LAB" ? "RESEARCH" : (request.purpose ?? "CLASSROOM");
    form.program = request.program ?? "";
    form.unitOrProject = request.unitOrProject ?? "";
    form.unitId = request.unitId ?? null;
    form.researchProjectId = request.researchProjectId ?? null;
    form.classroom = request.classroom ?? classroomOptions[0];
    form.dueAt = toLocalInput(request.dueAt);
    form.startDate = toLocalInput(request.startDate);
    form.recurrence = request.recurrence ?? "NONE";
    form.quantity = request.quantity ?? 1;
    form.handoverNotes = request.handoverNotes ?? "";
    if (props.isExtendMode) {
      setTimeout(() => {
        dueAtInput.value?.focus();
        dueAtInput.value?.select?.();
      }, 100);
    }
  },
  { immediate: true }
);

watch(() => form.purpose, (newVal) => {
  if (newVal === "RESEARCH") {
    form.classroom = "";
    form.unitId = null;
  } else if (newVal === "EVENT") {
    form.classroom = "";
    form.unitId = null;
    form.researchProjectId = null;
  } else if (newVal === "CLASSROOM") {
    form.researchProjectId = null;
    if (!classroomOptions.includes(form.classroom)) {
      form.classroom = classroomOptions[0];
    }
  }
});

function submit() {
  if (props.isExtendMode && form.dueAt) {
    const origStart = props.request.startDate ?? props.request.createdAt;
    const baseDateString = new Date(origStart).toDateString();
    const dueDate = new Date(form.dueAt);
    if (dueDate.toDateString() !== baseDateString) {
      alert(t("Extension is only allowed within the same day."));
      return;
    }
  }
  const payload = {
    purpose: form.purpose,
    program: form.program || null,
    unitOrProject: form.purpose === "CLASSROOM" || form.purpose === "RESEARCH" ? form.unitOrProject : null,
    unitId: form.purpose === "CLASSROOM" ? form.unitId : null,
    researchProjectId: form.purpose === "RESEARCH" ? form.researchProjectId : null,
    classroom: form.purpose === "CLASSROOM" ? (form.classroom || null) : null,
    dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    quantity: Number(form.quantity) || 1,
    recurrence: form.purpose === "CLASSROOM" && form.recurrence !== "NONE" ? form.recurrence : null,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    handoverNotes: form.handoverNotes || null,
    isExtendMode: props.isExtendMode
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
          <select v-model="form.purpose" :disabled="props.isExtendMode">
            <option v-if="props.session?.user?.role !== 'EVENT_STAFF'" value="CLASSROOM">{{ t('Classroom Instruction') }}</option>
            <option v-if="props.session?.user?.role !== 'EVENT_STAFF'" value="RESEARCH">{{ t('Research Work') }}</option>
            <option v-if="showEventOption" value="EVENT">{{ t('Swinburne Event') }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'CLASSROOM' && units.length">
          {{ t('Unit') }}
          <select v-model="form.unitId" :disabled="props.isExtendMode">
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.code }} — {{ u.name }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'CLASSROOM'">
          {{ t('Classroom') }}
          <select v-model="form.classroom" :disabled="props.isExtendMode">
            <option v-for="c in classroomOptions" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>

        <label v-if="form.purpose === 'RESEARCH' && projects.length">
          {{ t('Research Project') }}
          <select v-model="form.researchProjectId" :disabled="props.isExtendMode">
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </label>
        <div class="form-row">
          <label>
            {{ t('From') }}
            <input v-model="form.startDate" type="datetime-local" />
          </label>
          <label>
            {{ t('To') }}
            <input ref="dueAtInput" v-model="form.dueAt" type="datetime-local" />
          </label>
        </div>
        <label v-if="form.purpose === 'CLASSROOM'">
          {{ t('Recurrence') }}
          <select v-model="form.recurrence" :disabled="props.isExtendMode">
            <option value="NONE">{{ t('Single Session') }}</option>
            <option value="DAILY">{{ t('Repeat Daily') }}</option>
            <option value="WEEKLY">{{ t('Repeat Weekly (Within Semester)') }}</option>
            <option value="BIWEEKLY">{{ t('Repeat Bi-weekly') }}</option>
            <option value="MONTHLY">{{ t('Repeat Monthly') }}</option>
          </select>
        </label>
        <label>
          {{ t('Quantity') }}
          <input v-model="form.quantity" type="number" min="1" :disabled="props.isExtendMode" />
        </label>
        <label>
          {{ t('Handover Notes') }}
          <textarea v-model="form.handoverNotes" rows="2" :disabled="props.isExtendMode"></textarea>
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
