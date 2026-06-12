<script setup>
import { ref, computed } from "vue";
import { UserRound, Mail, Shield, ShieldCheck, UserCheck, ShieldAlert, Check, X } from "@lucide/vue";

const props = defineProps({
  users: { type: Array, default: () => [] },
  currentUser: { type: Object, default: null }
});

const emit = defineEmits(["update-user-role"]);

// ── Search & Filter ─────────────────────────────────────────────
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

// ── Pending role & lecturer map ───────────────────────────────────
const pendingMap = ref(new Map());
const pendingLecturerMap = ref(new Map());

const lecturers = computed(() => {
  return props.users.filter(u => u.role === "LECTURER");
});

function hasPending(userId) {
  return pendingMap.value.has(userId) || pendingLecturerMap.value.has(userId);
}

function getPending(userId, fallback) {
  return pendingMap.value.has(userId) ? pendingMap.value.get(userId) : fallback;
}

function getPendingLecturer(userId, fallback) {
  return pendingLecturerMap.value.has(userId) ? pendingLecturerMap.value.get(userId) : fallback;
}

function stageRole(user, event) {
  const val = event.target.value;
  const next = new Map(pendingMap.value);
  if (val === user.role) {
    next.delete(user.id);
  } else {
    next.set(user.id, val);
  }
  pendingMap.value = next;
}

function stageLecturer(user, event) {
  const val = event.target.value ? Number(event.target.value) : null;
  const next = new Map(pendingLecturerMap.value);
  if (val === user.lecturerId) {
    next.delete(user.id);
  } else {
    next.set(user.id, val);
  }
  pendingLecturerMap.value = next;
}

function applyRole(user) {
  if (user.id === props.currentUser?.id) {
    alert("Bạn không thể tự thay đổi vai trò của chính mình!");
    cancelRole(user);
    return;
  }
  const newRole = pendingMap.value.get(user.id) || user.role;
  const newLecturerId = pendingLecturerMap.value.has(user.id) ? pendingLecturerMap.value.get(user.id) : user.lecturerId;
  
  emit("update-user-role", { id: user.id, role: newRole, lecturerId: newLecturerId });
  
  const next = new Map(pendingMap.value);
  next.delete(user.id);
  pendingMap.value = next;
  
  const nextLec = new Map(pendingLecturerMap.value);
  nextLec.delete(user.id);
  pendingLecturerMap.value = nextLec;
}

function cancelRole(user) {
  const next = new Map(pendingMap.value);
  next.delete(user.id);
  pendingMap.value = next;
  
  const nextLec = new Map(pendingLecturerMap.value);
  nextLec.delete(user.id);
  pendingLecturerMap.value = nextLec;
}

// ── Lookup tables ───────────────────────────────────────────────
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

    <!-- Users Table -->
    <div class="users-panel panel">
      <div class="table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th>User Details</th>
              <th>Email Address</th>
              <th>Current Role</th>
              <th>Managing Lecturer</th>
              <th class="actions-head">Change Permission</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in filteredUsers"
              :key="user.id"
              :class="{ 'self-row': user.id === currentUser?.id }"
            >
              <td>
                <div class="user-info-cell">
                  <div
                    class="avatar-circle"
                    :style="{ backgroundColor: user.role === 'ADMIN' ? '#ef2335' : user.role === 'SUPPORT' ? '#3b82f6' : '#6b7280' }"
                  >
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
              <td>
                <div v-if="user.role === 'STUDENT'" class="lecturer-select-wrap">
                  <select
                    :value="getPendingLecturer(user.id, user.lecturerId)"
                    @change="stageLecturer(user, $event)"
                    :class="['lecturer-select', { 'role-select--dirty': pendingLecturerMap.has(user.id) }]"
                  >
                    <option :value="null">Unassigned</option>
                    <option v-for="l in lecturers" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="actions-cell">
                <div class="role-edit-group">
                  <select
                    :value="getPending(user.id, user.role)"
                    :disabled="user.id === currentUser?.id"
                    :class="['role-select', { 'role-select--dirty': hasPending(user.id) }]"
                    @change="stageRole(user, $event)"
                  >
                    <option
                      v-for="(label, role) in roleLabels"
                      :key="role"
                      :value="role"
                    >{{ label }}</option>
                  </select>

                  <button
                    v-show="hasPending(user.id)"
                    class="btn-apply"
                    title="Lưu thay đổi"
                    @click="applyRole(user)"
                  >
                    <Check :size="14" />
                  </button>

                  <button
                    v-show="hasPending(user.id)"
                    class="btn-cancel"
                    title="Huỷ"
                    @click="cancelRole(user)"
                  >
                    <X :size="14" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="5" class="empty-cell">No users found matching your filters.</td>
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
.avatar-circle { width: 32px; height: 32px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
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

.actions-cell { min-width: 220px; }
.role-edit-group { display: flex; align-items: center; gap: 6px; }

.role-select,
.lecturer-select {
  height: 32px; padding: 0 8px; font-size: 12px; font-weight: 700;
  border: 1.5px solid #d8d8e4; border-radius: 4px; outline: none;
  background: #fff; cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.role-select:focus,
.lecturer-select:focus { border-color: #ef2335; }
.role-select:disabled { opacity: 0.55; cursor: not-allowed; }
.role-select--dirty {
  border-color: #f59e0b !important;
  box-shadow: 0 0 0 3px rgba(245,158,11,.18);
}

.btn-apply {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; border-radius: 5px;
  background: #dcfce7; color: #16a34a; cursor: pointer;
  transition: background .15s, transform .1s;
  flex-shrink: 0;
}
.btn-apply:hover { background: #bbf7d0; transform: scale(1.08); }

.btn-cancel {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: none; border-radius: 5px;
  background: #fee2e2; color: #dc2626; cursor: pointer;
  transition: background .15s, transform .1s;
  flex-shrink: 0;
}
.btn-cancel:hover { background: #fecaca; transform: scale(1.08); }

.empty-cell { text-align: center; padding: 40px; color: #9ca3af; font-style: italic; }
</style>
