<script setup>
import { reactive, ref } from "vue";
import { KeyRound } from "@lucide/vue";
import swinburneLogo from "../assets/swinburne-vietnam-logo.svg";

defineProps({
  error: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["login"]);
const form = reactive({
  email: "lecturer@swin.edu.au",
  password: "demo"
});
const busy = ref(false);

async function submit() {
  busy.value = true;
  try {
    await emit("login", { ...form });
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <img class="login-logo" :src="swinburneLogo" alt="Swinburne Vietnam Alliance Program" />
      <h1>Swinburne Equipment Portal</h1>
      <p>Classroom borrowing workflow for lecturer demo on 29/5.</p>
      <form class="login-form" @submit.prevent="submit">
        <label>
          Email
          <input v-model="form.email" type="email" autocomplete="email" />
        </label>
        <label>
          Password
          <input v-model="form.password" type="password" autocomplete="current-password" />
        </label>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button type="submit" :disabled="busy">
          <KeyRound :size="18" />
          {{ busy ? "Signing in" : "Login" }}
        </button>
      </form>
    </section>
  </main>
</template>
