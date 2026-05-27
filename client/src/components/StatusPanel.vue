<script setup>
import { reactive } from "vue";
import { SlidersHorizontal } from "@lucide/vue";

defineProps({
  equipment: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(["status"]);
const form = reactive({
  id: "",
  status: "AVAILABLE",
  conditionNotes: "Checked and ready for classroom use"
});

function submit() {
  if (!form.id) {
    return;
  }
  emit("status", {
    ...form,
    id: Number(form.id)
  });
}
</script>

<template>
  <section class="panel action-panel">
    <div class="panel-heading compact">
      <SlidersHorizontal :size="20" />
      <div>
        <h2>Update status</h2>
        <p>Keep inventory state accurate.</p>
      </div>
    </div>
    <form class="stacked-form" @submit.prevent="submit">
      <label>
        Equipment
        <select v-model="form.id">
          <option value="">Select item</option>
          <option v-for="item in equipment" :key="item.id" :value="item.id">
            {{ item.assetCode }} - {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        Status
        <select v-model="form.status">
          <option value="AVAILABLE">Available</option>
          <option value="BORROWED">Borrowed</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RETIRED">Retired</option>
        </select>
      </label>
      <label>
        Notes
        <textarea v-model="form.conditionNotes" rows="3"></textarea>
      </label>
      <button type="submit">Update equipment status</button>
    </form>
  </section>
</template>
