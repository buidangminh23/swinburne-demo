<script setup>
import { computed, reactive } from "vue";
import { ClipboardPlus } from "@lucide/vue";

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["borrow"]);
const availableEquipment = computed(() => props.equipment.filter((item) => item.status === "AVAILABLE"));
const form = reactive({
  equipmentId: "",
  classroom: "ATC 625",
  dueAt: "2026-05-29T10:30:00.000Z",
  handoverNotes: "Collected for classroom session"
});

function submit() {
  if (!form.equipmentId) {
    return;
  }
  emit("borrow", {
    ...form,
    equipmentId: Number(form.equipmentId)
  });
}
</script>

<template>
  <section class="panel action-panel">
    <div class="panel-heading compact">
      <ClipboardPlus :size="20" />
      <div>
        <h2>Borrow equipment</h2>
        <p>Record lecturer classroom use.</p>
      </div>
    </div>
    <form class="stacked-form" @submit.prevent="submit">
      <label>
        Equipment
        <select v-model="form.equipmentId">
          <option value="">Select available item</option>
          <option v-for="item in availableEquipment" :key="item.id" :value="item.id">
            {{ item.assetCode }} - {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        Classroom
        <input v-model="form.classroom" />
      </label>
      <label>
        Due time
        <input v-model="form.dueAt" />
      </label>
      <label>
        Handover notes
        <textarea v-model="form.handoverNotes" rows="3"></textarea>
      </label>
      <button type="submit">Borrow</button>
    </form>
  </section>
</template>
