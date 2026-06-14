<script setup>
import { computed } from "vue";
import { UserRound, Mail, ShieldCheck, Calendar, Activity, CheckCircle2, Clock, FileText } from "@lucide/vue";

const props = defineProps({
  session: {
    type: Object,
    required: true
  },
  state: {
    type: Object,
    required: true
  }
});

// Helper formatting functions
function formatSimpleDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const displayRole = computed(() => {
  const role = props.session.user.role;
  if (role === "LECTURER") return t("Lecturer");
  if (role === "STUDENT") return t("Student");
  if (role === "EVENT_STAFF") return t("Event Coordinator");
  if (role === "SUPPORT") return t("Support Desk");
  return t("Admin");
});

const avatarLetter = computed(() => {
  if (!props.session.user.name) return "?";
  return props.session.user.name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase();
});

// User Statistics
const myRequests = computed(() => {
  return props.state.requests.filter(r => r.lecturerId === props.session.user.id);
});

const activeBorrowsCount = computed(() => {
  return myRequests.value.filter(r => r.status === "BORROWED").length;
});

const pendingRequestsCount = computed(() => {
  return myRequests.value.filter(r => r.status === "REQUESTED").length;
});

const myHistory = computed(() => {
  // state.borrowHistory contains all history from the database, or filtered history for students.
  // We filter by lecturerId (requester's ID) to ensure only the logged-in user's requests are shown.
  return props.state.borrowHistory.filter(h => h.lecturerId === props.session.user.id);
});

const totalHistoryCount = computed(() => {
  // If student, state.historyData.total represents their personal total
  // Otherwise, we use myHistory count.
  if (props.session.user.role === "STUDENT") {
    return props.state.historyData?.total || myHistory.value.length;
  }
  return myHistory.value.length;
});

const recentActivities = computed(() => {
  return myHistory.value.slice(0, 5);
});

import { makeTranslator } from "../translate";
const t = (text) => makeTranslator(props.session?.user?.email)(text);
</script>

<template>
  <div class="profile-container">
    <div class="profile-panel">
      <!-- Left side: User details & Statistics -->
      <div class="profile-details-column">
        <div class="profile-card">
          <div class="profile-header-glow"></div>
          <div class="profile-avatar-large">{{ avatarLetter }}</div>
          <h2 class="profile-name">{{ session.user.name }}</h2>
          <div class="profile-email">
            <Mail :size="14" /> {{ session.user.email }}
          </div>

          <div class="profile-info-grid">
            <div class="profile-info-item">
              <span class="info-label">{{ t('Role') }}</span>
              <span class="role-badge" :class="session.user.role.toLowerCase().replace('_', '-')">
                <ShieldCheck :size="14" /> {{ displayRole }}
              </span>
            </div>
            <div class="profile-info-item">
              <span class="info-label">{{ t('User ID') }}</span>
              <span class="info-value">#{{ session.user.id }}</span>
            </div>
            <div class="profile-info-item">
              <span class="info-label">{{ t('Joined Date') }}</span>
              <span class="info-value">
                <Calendar :size="14" /> {{ formatSimpleDate(session.user.createdAt) }}
              </span>
            </div>
            <div v-if="session.user.lecturer" class="profile-info-item">
              <span class="info-label">{{ t('Supervisor / Lecturer') }}</span>
              <span class="info-value">{{ session.user.lecturer.name }}</span>
            </div>
          </div>
        </div>

        <div class="profile-stats-grid">
          <div class="stat-card active-borrows">
            <div class="stat-icon-wrap">
              <CheckCircle2 :size="20" />
            </div>
            <div class="stat-details">
              <h3>{{ t('Active Borrows') }}</h3>
              <span class="stat-number">{{ activeBorrowsCount }}</span>
            </div>
          </div>

          <div class="stat-card pending-requests">
            <div class="stat-icon-wrap">
              <Clock :size="20" />
            </div>
            <div class="stat-details">
              <h3>{{ t('Pending Approval') }}</h3>
              <span class="stat-number">{{ pendingRequestsCount }}</span>
            </div>
          </div>

          <div class="stat-card total-transactions">
            <div class="stat-icon-wrap">
              <Activity :size="20" />
            </div>
            <div class="stat-details">
              <h3>{{ t('Total History') }}</h3>
              <span class="stat-number">{{ totalHistoryCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right side: Recent History -->
      <div class="profile-history-column panel">
        <div class="panel-heading compact border-bottom-0">
          <h2><FileText :size="18" /> {{ t('Recent Borrow Activity') }}</h2>
        </div>
        <div class="widget-table-wrap">
          <table class="widget-table">
            <thead>
              <tr>
                <th>{{ t('Equipment') }}</th>
                <th>{{ t('Due Date') }}</th>
                <th>{{ t('Status') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="req in recentActivities" :key="req.id">
                <td>
                  <strong style="display:block; color: #464650;">{{ req.equipment?.name }}</strong>
                  <small style="color: #727285;">{{ t('Asset: ') }}{{ req.equipment?.assetCode }}</small>
                </td>
                <td>
                  <span style="font-size: 12px; color: #464650;">{{ formatSimpleDate(req.dueAt) }}</span>
                </td>
                <td>
                  <span :class="'status-chip ' + req.status.toLowerCase()">{{ t(req.status) }}</span>
                </td>
              </tr>
              <tr v-if="recentActivities.length === 0">
                <td colspan="3" class="empty-table-text">{{ t('No borrow activity found.') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
}

.profile-panel {
  display: grid;
  gap: 28px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 20px;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.profile-details-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  background: #ffffff;
  border: 1px solid #eeeeef;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  padding: 36px 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.profile-header-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #5f63ff, #37b495);
}

.profile-avatar-large {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, #5f63ff, #4c4fb1);
  color: #ffffff;
  font-size: 36px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  box-shadow: 0 6px 16px rgba(95, 99, 255, 0.2);
}

.profile-name {
  color: #34343f;
  font-size: 24px;
  font-weight: 800;
  margin-bottom: 6px;
}

.profile-email {
  color: #727285;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 28px;
}

.profile-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  text-align: left;
  border-top: 1px solid #f0f0f5;
  padding-top: 24px;
}

.profile-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  padding: 4px 0;
}

.info-label {
  color: #727285;
  font-weight: 500;
}

.info-value {
  color: #464650;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
}

.role-badge.student {
  background: #e0f2fe;
  color: #0369a1;
}

.role-badge.lecturer {
  background: #fef3c7;
  color: #d97706;
}

.role-badge.support {
  background: #e0f2fe;
  color: #0284c7;
}

.role-badge.admin {
  background: #fce7f3;
  color: #db2777;
}

.role-badge.event-staff {
  background: #f3e8ff;
  color: #7e22ce;
}

.profile-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #eeeeef;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04);
}

.stat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.active-borrows .stat-icon-wrap {
  background: #ecfdf5;
  color: #059669;
}

.pending-requests .stat-icon-wrap {
  background: #fffbeb;
  color: #d97706;
}

.total-transactions .stat-icon-wrap {
  background: #e0e7ff;
  color: #4f46e5;
}

.stat-details h3 {
  font-size: 12px;
  color: #727285;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.stat-number {
  font-size: 24px;
  font-weight: 800;
  color: #34343f;
}

.profile-history-column {
  background: #ffffff;
  border-radius: 8px;
  height: 100%;
}

.empty-table-text {
  text-align: center;
  padding: 40px 0;
  color: #a7a7b4;
  font-style: italic;
}

.status-chip {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-chip.requested {
  background: #eff6ff;
  color: #2563eb;
}

.status-chip.approved {
  background: #ecfdf5;
  color: #059669;
}

.status-chip.borrowed {
  background: #fffbeb;
  color: #d97706;
}

.status-chip.returned {
  background: #f3f4f6;
  color: #4b5563;
}

.status-chip.cancelled {
  background: #fef2f2;
  color: #dc2626;
}

.widget-table {
  min-width: 0 !important;
  width: 100% !important;
  table-layout: fixed;
}

.widget-table th,
.widget-table td {
  padding: 12px 8px;
}

.widget-table th:nth-child(1),
.widget-table td:nth-child(1) {
  width: 50%;
}

.widget-table th:nth-child(2),
.widget-table td:nth-child(2) {
  width: 30%;
}

.widget-table th:nth-child(3),
.widget-table td:nth-child(3) {
  width: 20%;
}

@media (max-width: 960px) {
  .profile-panel {
    grid-template-columns: 1fr;
  }
}
</style>
