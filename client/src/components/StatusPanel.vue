<script setup>
import { reactive } from "vue";
import { SlidersHorizontal } from "@lucide/vue";

import { makeTranslator } from "../translate";

const props = defineProps({
  equipment: {
    type: Array,
    default: () => []
  },
  session: {
    type: Object,
    required: true
  }
});

const t = (text) => makeTranslator(props.session?.user?.email)(text);

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
  if (!form.conditionNotes || form.conditionNotes.trim().length < 2) {
    alert("Please enter a condition note (at least 2 characters).");
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
        <h2>{{ t('Update Status') }}</h2>
        <p>{{ t('Keep inventory state accurate.') }}</p>
      </div>
    </div>
    <form class="stacked-form" @submit.prevent="submit">
      <label>
        {{ t('Equipment') }}
        <select v-model="form.id">
          <option value="">{{ t('Select item') }}</option>
          <option v-for="item in equipment" :key="item.id" :value="item.id">
            {{ item.assetCode }} - {{ item.name }}
          </option>
        </select>
      </label>
      <label>
        {{ t('Status') }}
        <select v-model="form.status">
          <option value="AVAILABLE">{{ t('Available') }}</option>
          <option value="BORROWED">{{ t('Borrowed') }}</option>
          <option value="MAINTENANCE">{{ t('Maintenance') }}</option>
          <option value="RETIRED">{{ t('Retired') }}</option>
        </select>
      </label>
      <label>
        {{ t('Notes') }}
        <textarea v-model="form.conditionNotes" rows="3" required minlength="2"></textarea>
      </label>
      <button type="submit">{{ t('Update equipment status') }}</button>
    </form>
  </section>
</template>
