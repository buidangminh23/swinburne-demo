<script setup>
import { reactive, watch } from "vue";
import { Pencil } from "@lucide/vue";

const unitOptions = [
  "COS20031.1",
  "COS20007",
  "COS30043",
  "COS30049",
  "INF20025",
  "Research Project A",
  "Open Day Event"
];

const props = defineProps({
  request: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(["save", "close"]);

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
    form.classroom = request.classroom ?? "";
    form.dueAt = toLocalInput(request.dueAt);
    form.startDate = toLocalInput(request.startDate);
    form.recurrence = request.recurrence ?? "NONE";
    form.quantity = request.quantity ?? 1;
    form.handoverNotes = request.handoverNotes ?? "";
  },
  { immediate: true }
);

function submit() {
  const payload = {
    purpose: form.purpose,
    program: form.program || null,
    unitOrProject: form.unitOrProject || null,
    classroom: form.classroom || null,
    dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
    quantity: Number(form.quantity) || 1,
    recurrence: form.purpose === "CLASSROOM" && form.recurrence !== "NONE" ? form.recurrence : null,
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
        <h3><Pencil :size="16" /> Edit borrowing — {{ request.equipment?.name }}</h3>
        <button type="button" class="close-btn" @click="$emit('close')">&times;</button>
      </header>
      <form class="modal-form" @submit.prevent="submit">
        <label>
          Purpose
          <select v-model="form.purpose">
            <option value="CLASSROOM">Classroom Use</option>
            <option value="LAB">Lab Session</option>
            <option value="RESEARCH">Research Project</option>
            <option value="EVENT">Event Support</option>
          </select>
        </label>
        <label>
          University
          <select v-model="form.program">
            <option value="Swinburne">Swinburne</option>
            <option value="Asia">Asia</option>
            <option value="FPT">FPT</option>
          </select>
        </label>
        <label>
          Unit or Project
          <select v-model="form.unitOrProject">
            <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </label>
        <label v-if="form.purpose === 'CLASSROOM'">
          Classroom
          <input v-model="form.classroom" type="text" />
        </label>
        <div class="form-row">
          <label>
            From
            <input v-model="form.startDate" type="datetime-local" />
          </label>
          <label>
            To
            <input v-model="form.dueAt" type="datetime-local" />
          </label>
        </div>
        <label v-if="form.purpose === 'CLASSROOM'">
          Recurrence
          <select v-model="form.recurrence">
            <option value="NONE">Single Session</option>
            <option value="WEEKLY">Repeat Weekly (Within Semester)</option>
          </select>
        </label>
        <label>
          Quantity
          <input v-model="form.quantity" type="number" min="1" />
        </label>
        <label>
          Handover Notes
          <textarea v-model="form.handoverNotes" rows="2"></textarea>
        </label>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn-confirm">Save changes</button>
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
