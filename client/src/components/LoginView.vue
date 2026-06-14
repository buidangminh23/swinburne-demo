<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import swinburneLogo from "../assets/swinburne-vietnam-logo.svg";
import avatarDangMinh from "../assets/avatar-dang-minh.png";
import avatarDinhDung from "../assets/avatar-dinh-dung.png";

defineProps({
  error: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["login"]);

const selectedLocation = ref("");
const step = ref("location"); // "location" or "google"
const showError = ref(false);
const busy = ref(false);

const locations = [
  { value: "HN", label: "Swinburne Hanoi" },
  { value: "HO", label: "Swinburne HO" },
  { value: "HCM", label: "Swinburne HCM" },
  { value: "DN", label: "Swinburne Da Nang" },
  { value: "CT", label: "Swinburne CT" }
];

const accounts = [
  { name: "LECTURER", email: "buidangminh23@fpt.edu.vn", isDemo: true, color: "#4e5b66" },
  { name: "VOVINAM TEACHER", email: "vovinamteacher@fpt.edu.vn", isDemo: true, color: "#10b981" },
  { name: "STUDENT", email: "buidangminh.lh@fpt.edu.vn", isDemo: true, photo: avatarDangMinh },
  { name: "EVENT_STAFF", email: "hiheho911@fpt.edu.vn", isDemo: true, color: "#3f51b5" },
  { name: "SUPPORT", email: "taolaminhanh1@fpt.edu.vn", isDemo: true, color: "#d84315" },
  { name: "Test Account", email: "cacc80077@fpt.edu.vn", isDemo: false, color: "#00796b" },
  { name: "Minh", email: "buidangminhcontentcreator@fpt.edu.vn", isDemo: false, color: "#c62828" },
  { name: "ADMIN", email: "dindungwork@fpt.edu.vn", isDemo: true, photo: avatarDinhDung },
  { name: "SUPPORT", email: "linhnt89_fe@fpt.edu.vn", isDemo: true, color: "#4338ca" },
  { name: "STUDENT 2", email: "student2@fpt.edu.vn", isDemo: true, color: "#0891b2" }
];

const loginError = ref("");
const showCustomInput = ref(false);
const customEmail = ref("");

onMounted(() => {
  // Dynamically load Google Identity Services client script
  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
});

// Watch selectedLocation to automatically hide validation error when choice is made
watch(selectedLocation, (newVal) => {
  if (newVal) {
    showError.value = false;
  }
});

function handleGoogleClick() {
  if (!selectedLocation.value) {
    showError.value = true;
    return;
  }

  showError.value = false;
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (clientId && window.google) {
    busy.value = true;
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (response) => {
          if (response.error) {
            busy.value = false;
            loginError.value = "Google sign-in failed: " + response.error;
            step.value = "google";
            return;
          }

          try {
            await emit("login", {
              accessToken: response.access_token
            });
          } catch (err) {
            loginError.value = err.message;
            step.value = "google";
          } finally {
            busy.value = false;
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (e) {
      console.error("Google OAuth client init failed", e);
      busy.value = false;
      step.value = "google";
    }
  } else {
    // Fallback to simulated account chooser (Step 2)
    step.value = "google";
  }
}

async function selectAccount(account) {
  if (!account.isDemo) {
    loginError.value = "This account has not been granted access to Swinburne Equipment Portal.";
    return;
  }

  loginError.value = "";
  busy.value = true;
  try {
    await emit("login", {
      email: account.email
    });
  } finally {
    busy.value = false;
  }
}

async function submitCustomEmail() {
  if (!customEmail.value) return;
  loginError.value = "";
  busy.value = true;
  try {
    await emit("login", {
      email: customEmail.value
    });
  } catch (err) {
    loginError.value = err.message || "Login failed.";
  } finally {
    busy.value = false;
  }
}

function getInitial(name) {
  return name.charAt(0);
}
</script>

<template>
  <main :class="['login-page-container', { 'google-theme': step === 'google' }]">
    <!-- Background grid dots on the left -->
    <div v-if="step === 'location'" class="dot-grid"></div>

    <!-- Background photo of Swinburne girl on the right -->
    <div v-if="step === 'location'" class="bg-image-container"></div>

    <!-- STEP 1: CHOOSE LOCATION -->
    <section v-if="step === 'location'" class="location-card">
      <img class="logo-img" :src="swinburneLogo" alt="Swinburne Vietnam logo" />

      <div class="dropdown-wrap" :class="{ 'has-error': showError }">
        <select v-model="selectedLocation" class="location-dropdown">
          <option value="" disabled selected>Choose location</option>
          <option v-for="loc in locations" :key="loc.value" :value="loc.value">
            {{ loc.label }}
          </option>
        </select>
        <div class="select-icons">
          <span v-if="showError" class="clear-icon" @click="selectedLocation = ''; showError = false;">&times;</span>
          <span class="arrow-icon">&#9662;</span>
        </div>
      </div>
      <p v-if="showError" class="facility-error-msg">You have not selected the facility</p>

      <button
        type="button"
        class="google-btn-red"
        :disabled="busy"
        @click="handleGoogleClick"
      >
        <svg class="google-icon-white" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 18 18">
          <path fill="#ffffff" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z"/>
          <path fill="#ffffff" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.24c-.8.54-1.83.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.92v2.3C2.4 16.03 5.48 18 9 18z"/>
          <path fill="#ffffff" d="M3.96 10.73A5.41 5.41 0 0 1 3.66 9c0-.6.1-1.19.3-1.73V4.97H.92A8.997 8.997 0 0 0 0 9c0 1.48.36 2.89.92 4.16l3.04-2.43z"/>
          <path fill="#ffffff" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.8 11.43 0 9 0 5.48 0 2.4 1.97.92 4.97l3.04 2.43C4.67 5.16 6.65 3.58 9 3.58z"/>
        </svg>
        <span>Sign In With Google</span>
      </button>
    </section>

    <!-- STEP 2: GOOGLE SIGN-IN chooser (Matches Image 2) -->
    <section v-else class="google-card">
      <header class="google-header">
        <div class="header-content">
          <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Sign in with Google</span>
        </div>
      </header>

      <div class="google-body">
        <!-- Left column -->
        <div class="google-left-col">
          <button type="button" class="back-arrow-btn" :disabled="busy" @click="step = 'location'; selectedLocation = '';" title="Change location">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h1>Choose an account</h1>
          <p>to continue to <span class="accent-link">swin.edu.vn</span></p>
        </div>

        <!-- Right column -->
        <div class="google-right-col">
          <div v-if="!showCustomInput" class="accounts-list">
            <button
              v-for="acc in accounts"
              :key="acc.email"
              type="button"
              class="account-row"
              :disabled="busy"
              @click="selectAccount(acc)"
            >
              <div v-if="acc.photo" class="avatar-circle-img">
                <img :src="acc.photo" :alt="acc.name" class="avatar-photo" />
              </div>
              <div v-else class="avatar-circle" :style="{ backgroundColor: acc.color }">
                <span>{{ getInitial(acc.name) }}</span>
              </div>
              <div class="account-details">
                <span class="account-name">{{ acc.name }}</span>
                <span class="account-email">{{ acc.email }}</span>
              </div>
            </button>

            <!-- Use another account -->
            <button type="button" class="account-row another-account-row" :disabled="busy" @click="showCustomInput = true">
              <div class="avatar-circle another">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div class="account-details">
                <span class="account-name">Use another account</span>
              </div>
            </button>
          </div>

          <div v-else class="custom-email-input-wrap">
            <form class="custom-email-form" @submit.prevent="submitCustomEmail">
              <label class="custom-email-label">
                Email address
                <input v-model="customEmail" type="email" placeholder="username@fpt.edu.vn" required class="custom-email-input" :disabled="busy" />
              </label>
              <div class="custom-email-actions">
                <button type="button" class="custom-email-back-btn" @click="showCustomInput = false" :disabled="busy">Back</button>
                <button type="submit" class="custom-email-submit-btn" :disabled="busy">Sign In</button>
              </div>
            </form>
          </div>

          <p v-if="loginError" class="google-error-msg">{{ loginError }}</p>
          <p v-if="error" class="google-error-msg">{{ error }}</p>
        </div>
      </div>

      <!-- Footer bar for the Google screen -->
      <footer class="google-footer">
        <div class="footer-content">
          <span class="language-dropdown-text">
            English
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" class="dropdown-caret">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </span>
          <div class="footer-links">
            <a href="#" class="footer-link">Help</a>
            <a href="#" class="footer-link">Privacy</a>
            <a href="#" class="footer-link">Terms</a>
          </div>
        </div>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.login-page-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #dddddd;
  overflow: hidden;
  font-family: Roboto, Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  transition: background-color 0.3s ease;
}

.login-page-container.google-theme {
  background: #0f0f0f;
}

/* Background grid dots on the left */
.dot-grid {
  position: absolute;
  left: 60px;
  top: 50%;
  transform: translateY(-50%);
  width: 100px;
  height: 480px;
  background-image: radial-gradient(rgba(0, 0, 0, 0.4) 2px, transparent 2px);
  background-size: 40px 48px;
  opacity: 0.6;
  pointer-events: none;
  z-index: 1;
}

/* Background photo of Swinburne girl on the right */
.bg-image-container {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 50%;
  background-image: url('../assets/login-bg-girl.png');
  background-size: cover;
  background-position: center left;
  pointer-events: none;
  z-index: 1;
}

/* STEP 1 STYLE: LOCATION CARD */
.location-card {
  position: relative;
  background: #ffffff;
  padding: 44px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  z-index: 10;
  text-align: center;
}

.logo-img {
  width: 260px;
  height: auto;
  margin-bottom: 24px;
}

.dropdown-wrap {
  position: relative;
  width: 100%;
  margin-top: 36px;
}

.location-dropdown {
  width: 100%;
  height: 46px;
  border: 1px solid #c3c3d5;
  border-radius: 2px;
  padding: 0 40px 0 16px;
  font-size: 14px;
  outline: none;
  background-color: white;
  cursor: pointer;
  appearance: none;
}

.location-dropdown:focus {
  border-color: #c71f34;
}

.dropdown-wrap.has-error .location-dropdown {
  border-color: #c71f34;
}

.select-icons {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-icon {
  color: #c71f34;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  user-select: none;
}

.arrow-icon {
  color: #727285;
  font-size: 11px;
}

.facility-error-msg {
  color: #c71f34;
  font-size: 12px;
  text-align: left;
  margin: 6px 0 0 2px;
  font-weight: 500;
}

.google-btn-red {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 44px;
  margin-top: 24px;
  background-color: #c71f34;
  border: 0;
  border-radius: 4px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.google-btn-red:hover {
  background-color: #a81a2b;
}

.google-icon-white {
  flex-shrink: 0;
}

/* STEP 2 STYLE: GOOGLE SIGN-IN CARD */
.google-card {
  position: relative;
  background: #131314;
  border-radius: 28px;
  border: 1px solid #3c4043;
  width: 100%;
  max-width: 1040px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
  color: #e3e3e3;
  font-family: Roboto, Arial, sans-serif;
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.google-header {
  border-bottom: 1px solid #303030;
  padding: 24px 40px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #e3e3e3;
  font-weight: 500;
}

.google-icon {
  flex-shrink: 0;
}

.google-body {
  display: grid;
  grid-template-columns: 1fr 1.15fr;
  gap: 48px;
  padding: 40px;
}

.google-left-col {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 10px;
}

.google-left-col h1 {
  font-size: 36px;
  font-weight: 400;
  margin: 0 0 12px;
  color: #ffffff;
  text-align: left;
}

.google-left-col p {
  font-size: 15px;
  color: #c4c7c5;
  margin: 0;
  text-align: left;
}

.accent-link {
  color: #8ab4f8;
  font-weight: 500;
}

.back-arrow-btn {
  background: transparent;
  border: none;
  color: #c4c7c5;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-bottom: 16px;
  transition: background-color 0.2s, color 0.2s;
  padding: 0;
  margin-left: -8px;
}

.back-arrow-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

/* Accounts list */
.google-right-col {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.accounts-list {
  background: transparent;
  border: 0;
  display: flex;
  flex-direction: column;
}

.account-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 16px 12px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #303030;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease;
}

.account-row:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.04);
}

.account-row:last-child {
  border-bottom: 1px solid #303030;
}

.avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}

.avatar-circle-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 14px;
  flex-shrink: 0;
}

.avatar-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-circle.another {
  background: transparent;
  color: #c4c7c5;
  border: 1px solid #444746;
  width: 30px;
  height: 30px;
}

.account-details {
  display: flex;
  flex-direction: column;
}

.account-name {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}

.account-email {
  font-size: 12px;
  color: #c4c7c5;
  margin-top: 2px;
}

.google-error-msg {
  color: #f2b8b5;
  font-size: 13px;
  margin-top: 14px;
  line-height: 1.4;
  text-align: left;
}

/* Footer styles */
.google-footer {
  border-top: 1px solid #303030;
  padding: 20px 40px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #9aa0a6;
}

.language-dropdown-text {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.language-dropdown-text:hover {
  color: #e3e3e3;
}

.dropdown-caret {
  color: #9aa0a6;
}

.footer-links {
  display: flex;
  gap: 16px;
}

.footer-link {
  color: #9aa0a6;
  text-decoration: none;
  transition: color 0.15s;
}

.footer-link:hover {
  color: #e3e3e3;
}

/* Responsive styles */
@media (max-width: 900px) {
  .bg-image-container {
    display: none;
  }
  .dot-grid {
    left: 20px;
  }
}

@media (max-width: 768px) {
  .google-card {
    max-width: 440px;
  }
  .google-body {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px;
  }
  .google-header {
    padding: 20px 24px;
  }
  .google-footer {
    padding: 16px 24px;
  }
  .google-left-col {
    padding-left: 0;
  }
  .google-left-col h1 {
    font-size: 28px;
  }
}

/* Custom email input form styles */
.custom-email-input-wrap {
  padding: 12px;
}
.custom-email-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.custom-email-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: #e3e3e3;
  font-weight: 500;
  text-align: left;
}
.custom-email-input {
  background: #1e1e1e;
  border: 1px solid #444746;
  border-radius: 4px;
  height: 40px;
  padding: 0 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.custom-email-input:focus {
  border-color: #8ab4f8;
}
.custom-email-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.custom-email-back-btn {
  background: transparent;
  border: 1px solid #444746;
  border-radius: 4px;
  color: #c4c7c5;
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}
.custom-email-back-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.04);
}
.custom-email-submit-btn {
  background: #8ab4f8;
  border: none;
  border-radius: 4px;
  color: #0f0f0f;
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}
.custom-email-submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.custom-email-submit-btn:disabled, .custom-email-back-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
