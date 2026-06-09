<script setup>
import { ref, computed } from "vue";
import { UserRound, Mail, Shield, ShieldCheck, UserCheck, Search, ShieldAlert } from "@lucide/vue";

const props = defineProps({
  users: { type: Array, default: () => [] },
  currentUser: { type: Object, default: null }
});

const emit = defineEmits(["update-user-role"]);

// ── Search & Filter State ─────────────────────────────────────
const search = ref("");
const filterRole = ref("ALL");

const filteredUsers = computed(() => {
  let list = [...props.users];
  if (search.value.trim()) {
    const kw = search.value.toLowerCase();
    list = list.filter(u =>
      u.name.toLowerCase().includes(kw) ||
      u.email.toLowerCase().includes(kw)
    );
  }
  if (filterRole.value !== "ALL") {
    list = list.filter(u => u.role === filterRole.value);
  }
  return list;
});

const roleLabels = {
  ADMIN: "Admin",
  SUPPORT: "Support Desk",
  LECTURER: "Lecturer",
  STUDENT: "Student",
  EVENT_STAFF: "Event Coordinator",
  OPERATIONS: "Operations"
};

const roleIcons = {
  ADMIN: ShieldAlert,
  SUPPORT: ShieldCheck,
  LECTURER: UserCheck,
  STUDENT: UserRound,
  EVENT_STAFF: Shield,
  OPERATIONS: Shield
};

function changeRole(user, event) {
  const newRole = event.target.value;
  if (user.id === props.currentUser?.id) {
    alert("Bạn không thể tự thay đổi vai trò của chính mình!");
    event.target.value = user.role; // Reset dropdown
    return;
  }
  emit("update-user-role", { id: user.id, role: newRole });
}
</script>

<template>
  <div class="admin-users-wrap">
    <!-- Header -->
    <div class="admin-page-header panel">
      <div class="admin-header-content">
        <div>
          <h2><UserRound :size="20" /> User Management</h2>
          <p>Assign roles, configure user access permissions, and search accounts.</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-wrap">
          <input v-model="search" type="text" placeholder="Search by name, email..." class="search-input" />
        </div>
        <select v-model="filterRole" class="filter-sel">
          <option value="ALL">All Roles</option>
          <option v-for="(label, role) in roleLabels" :key="role" :value="role">{{ label }}</option>
        </select>
      </div>
    </div>

    <!-- Users Table/Grid -->
    <div class="users-panel panel">
      <div class="table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>User Details</th>
              <th>Email Address</th>
              <th>Current Role</th>
              <th class="actions-head">Change Permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id" :class="{ 'self-row': user.id === currentUser?.id }">
              <td>
                <div class="user-info-cell">
                  <div class="avatar-circle" :style="{ backgroundColor: user.role === 'ADMIN' ? '#ef2335' : user.role === 'SUPPORT' ? '#3b82f6' : '#6b7280' }">
                    {{ user.name.trim().split(/\s+/).at(-1).charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <span class="user-name">{{ user.name }}</span>
                    <span v-if="user.id === currentUser?.id" class="self-badge">You</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="email-text"><Mail :size="12" /> {{ user.email }}</span>
              </td>
              <td>
                <span :class="'role-badge ' + user.role.toLowerCase()">
                  <component :is="roleIcons[user.role]" :size="12" />
                  {{ roleLabels[user.role] || user.role }}
                </span>
              </td>
              <td class="actions-cell">
                <select :value="user.role" :disabled="user.id === currentUser?.id" @change="changeRole(user, $event)" class="role-select">
                  <option v-for="(label, role) in roleLabels" :key="role" :value="role">{{ label }}</option>
                </select>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="4" class="empty-cell">No users found matching your filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-users-wrap { display: flex; flex-direction: column; gap: 20px; animation: fadeIn .35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.admin-page-header { padding: 22px 26px 16px; }
.admin-header-content h2 { margin: 0; font-size: 18px; font-weight: 800; color: #3e3e4a; display: flex; align-items: center; gap: 10px; }
.admin-header-content h2 svg { color: #ef2335; }
.admin-header-content p { margin: 4px 0 16px; font-size: 12.5px; color: #727285; }

.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; }
.search-input { height: 36px; padding: 0 12px; font-size: 13px; border: 1px solid #d8d8e4; border-radius: 4px; width: 280px; outline: none; }
.search-input:focus { border-color: #ef2335; }
.filter-sel { height: 36px; padding: 0 10px; font-size: 12.5px; border: 1px solid #d8d8e4; border-radius: 4px; background: #fff; outline: none; cursor: pointer; }

.users-panel { padding: 0; overflow: hidden; }
.table-wrap { overflow-x: auto; }
.users-table { width: 100%; border-collapse: collapse; text-align: left; }
.users-table th, .users-table td { padding: 14px 20px; font-size: 13px; border-bottom: 1px solid #ececf1; }
.users-table th { background: #f9f9fb; font-weight: 800; color: #5f5a85; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }

.self-row { background: #fcfdfe; }
.user-info-cell { display: flex; align-items: center; gap: 12px; }
.avatar-circle { width: 32px; height: 32px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.user-name { font-weight: 700; color: #3e3e4a; }
.self-badge { background: #eef2ff; color: #4338ca; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px; margin-left: 8px; border: 1px solid #c7d2fe; }

.email-text { display: inline-flex; align-items: center; gap: 6px; color: #727285; }

.role-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }
.role-badge.admin { background: #fef2f2; color: #b91c1c; }
.role-badge.support { background: #eff6ff; color: #1d4ed8; }
.role-badge.lecturer { background: #ecfdf5; color: #047857; }
.role-badge.student { background: #f3f4f6; color: #374151; }
.role-badge.event_staff { background: #fdf2f8; color: #be185d; }
.role-badge.operations { background: #fff7ed; color: #c2410c; }

.role-select { height: 32px; padding: 0 8px; font-size: 12px; font-weight: 700; border: 1px solid #d8d8e4; border-radius: 4px; outline: none; background: #fff; cursor: pointer; }
.role-select:focus { border-color: #ef2335; }
.role-select:disabled { opacity: 0.6; cursor: not-allowed; }

.empty-cell { text-align: center; padding: 40px; color: #9ca3af; font-style: italic; }
</style>
