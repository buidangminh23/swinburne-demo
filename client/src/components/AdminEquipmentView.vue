<script setup>
import { ref, reactive, computed } from "vue";
import { Plus, Pencil, X, PackageSearch, MapPin, Tag, Layers, CheckCircle2, Wrench, Archive, RefreshCw } from "@lucide/vue";

const props = defineProps({
  equipment: { type: Array, default: () => [] }
});
const emit = defineEmits(["add-equipment", "edit-equipment", "status"]);

// ── Modal state ──────────────────────────────────────────────
const showModal = ref(false);
const isEditing = ref(false);
const editTarget = ref(null);
const form = reactive({
  assetCode: "", name: "", category: "", location: "",
  status: "AVAILABLE", conditionNotes: "", totalQuantity: 1, accessoriesText: ""
});

function openAdd() {
  isEditing.value = false;
  editTarget.value = null;
  Object.assign(form, { assetCode: "", name: "", category: "", location: "", status: "AVAILABLE", conditionNotes: "", totalQuantity: 1, accessoriesText: "" });
  showModal.value = true;
}

function openEdit(item) {
  isEditing.value = true;
  editTarget.value = item;
  Object.assign(form, {
    assetCode: item.assetCode,
    name: item.name,
    category: item.category,
    location: item.location,
    status: item.status,
    conditionNotes: item.conditionNotes || "",
    totalQuantity: item.totalQuantity ?? 1,
    accessoriesText: (item.accessories ?? []).join(", ")
  });
  showModal.value = true;
}

function submitForm() {
  if (!form.assetCode || !form.name || !form.category || !form.location) return;
  const payload = {
    ...form,
    totalQuantity: Number(form.totalQuantity) || 1,
    accessories: form.accessoriesText.split(",").map((item) => item.trim()).filter(Boolean)
  };
  if (isEditing.value) {
    emit("edit-equipment", { id: editTarget.value.id, payload });
  } else {
    emit("add-equipment", payload);
  }
  showModal.value = false;
}

// ── Quick status change ──────────────────────────────────────
function setStatus(item, status) {
  const notes = status === "AVAILABLE" ? "Marked available by admin"
    : status === "MAINTENANCE" ? "Sent to maintenance by admin"
    : "Retired by admin";
  emit("status", { id: item.id, status, conditionNotes: notes });
}

// ── Search / filter ──────────────────────────────────────────
const search = ref("");
const filterStatus = ref("ALL");
const filterCategory = ref("ALL");

const categories = computed(() => [...new Set(props.equipment.map(e => e.category))]);

const filtered = computed(() => {
  let list = [...props.equipment];
  if (search.value.trim()) {
    const kw = search.value.toLowerCase();
    list = list.filter(e =>
      e.name.toLowerCase().includes(kw) ||
      e.assetCode.toLowerCase().includes(kw) ||
      e.location.toLowerCase().includes(kw)
    );
  }
  if (filterStatus.value !== "ALL") list = list.filter(e => e.status === filterStatus.value);
  if (filterCategory.value !== "ALL") list = list.filter(e => e.category === filterCategory.value);
  return list;
});

const statusIcon = { AVAILABLE: CheckCircle2, MAINTENANCE: Wrench, BORROWED: RefreshCw, RETIRED: Archive };
const statusLabel = { AVAILABLE: "Available", MAINTENANCE: "Maintenance", BORROWED: "Borrowed", RETIRED: "Retired" };
</script>

<template>
  <div class="admin-eq-wrap">
    <!-- Header -->
    <div class="admin-page-header panel">
      <div class="admin-header-content">
        <div>
          <h2><PackageSearch :size="20" /> Equipment Management</h2>
          <p>Add, edit, and manage all equipment inventory. Update status and track asset codes.</p>
        </div>
        <button class="btn-add" @click="openAdd"><Plus :size="16" /> Add Equipment</button>
      </div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="search-wrap">
          <input v-model="search" type="text" placeholder="Search by name, asset code, location…" class="search-input" />
        </div>
        <select v-model="filterStatus" class="filter-sel">
          <option value="ALL">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="BORROWED">Borrowed</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="RETIRED">Retired</option>
        </select>
        <select v-model="filterCategory" class="filter-sel">
          <option value="ALL">All Categories</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <!-- Equipment grid cards -->
    <div class="eq-grid">
      <div v-for="item in filtered" :key="item.id" class="eq-card panel" :class="'card-' + item.status.toLowerCase()">
        <div class="eq-card-head">
          <span class="asset-badge">{{ item.assetCode }}</span>
          <span :class="'status-chip ' + item.status.toLowerCase()">{{ statusLabel[item.status] }}</span>
        </div>
        <h3 class="eq-name">{{ item.name }}</h3>
        <div class="eq-meta">
          <span><Tag :size="12" /> {{ item.category }}</span>
          <span><MapPin :size="12" /> {{ item.location }}</span>
          <span><Layers :size="12" /> Stock: {{ item.availableNow ?? item.totalQuantity ?? 1 }} / {{ item.totalQuantity ?? 1 }} available now</span>
          <span v-if="item.conditionNotes" class="eq-notes"><Layers :size="12" /> {{ item.conditionNotes }}</span>
        </div>

        <!-- Actions -->
        <div class="eq-actions">
          <button class="eq-btn edit" @click="openEdit(item)"><Pencil :size="13" /> Edit</button>
          <button v-if="item.status !== 'AVAILABLE'" class="eq-btn avail" @click="setStatus(item, 'AVAILABLE')">✓ Available</button>
          <button v-if="item.status !== 'MAINTENANCE'" class="eq-btn maint" @click="setStatus(item, 'MAINTENANCE')"><Wrench :size="12" /> Maintenance</button>
          <button v-if="item.status !== 'RETIRED'" class="eq-btn retire" @click="setStatus(item, 'RETIRED')"><Archive :size="12" /> Retire</button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="eq-empty">
        No equipment found matching your filters.
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="eq-modal panel">
        <header class="modal-top">
          <h3>{{ isEditing ? "Edit Equipment" : "Add New Equipment" }}</h3>
          <button class="close-x" @click="showModal = false"><X :size="18" /></button>
        </header>
        <form class="eq-form" @submit.prevent="submitForm">
          <label>
            Asset Code <span class="hint">e.g. Logitech-LRC-001</span>
            <input v-model="form.assetCode" :disabled="isEditing" required placeholder="Brand-Tag-ID" />
          </label>
          <label>
            Equipment Name
            <input v-model="form.name" required placeholder="e.g. Logitech Rally Camera Kit" />
          </label>
          <div class="form-row">
            <label>
              Category
              <input v-model="form.category" required placeholder="Video / Audio / Display…" />
            </label>
            <label>
              Location <span class="hint">Campus-Building-Room</span>
              <input v-model="form.location" required placeholder="HN-ATC-625" />
            </label>
          </div>
          <label>
            Total Quantity <span class="hint">identical units in stock</span>
            <input v-model.number="form.totalQuantity" type="number" min="1" />
          </label>
          <label>
            Initial Status
            <select v-model="form.status">
              <option value="AVAILABLE">Available</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
            </select>
          </label>
          <label>
            Condition Notes
            <textarea v-model="form.conditionNotes" rows="2" placeholder="Optional notes about equipment condition…"></textarea>
          </label>
          <label>
            Accessory Checklist <span class="hint">comma separated</span>
            <textarea v-model="form.accessoriesText" rows="2" placeholder="HDMI cable, Remote, Carry case"></textarea>
          </label>
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="showModal = false">Cancel</button>
            <button type="submit" class="btn-submit">{{ isEditing ? "Save Changes" : "Add Equipment" }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-eq-wrap { display: flex; flex-direction: column; gap: 20px; animation: fadeIn .35s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

.admin-page-header { padding: 22px 26px 16px; }
.admin-header-content { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.admin-header-content h2 { margin: 0; font-size: 18px; font-weight: 800; color: #3e3e4a; display: flex; align-items: center; gap: 10px; }
.admin-header-content h2 svg { color: #5f63ff; }
.admin-header-content p { margin: 4px 0 0; font-size: 12.5px; color: #727285; }

.btn-add { background: #5f63ff; color: #fff; font-size: 13px; font-weight: 700; border-radius: 4px; min-height: 38px; padding: 0 16px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.btn-add:hover { background: #4a4fdf; }

.filter-bar { display: flex; gap: 10px; flex-wrap: wrap; }
.search-input { height: 36px; padding: 0 12px; font-size: 13px; border: 1px solid #d8d8e4; border-radius: 4px; width: 280px; outline: none; }
.search-input:focus { border-color: #5f63ff; }
.filter-sel { height: 36px; padding: 0 10px; font-size: 12.5px; border: 1px solid #d8d8e4; border-radius: 4px; background: #fff; outline: none; cursor: pointer; }

.eq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.eq-card { padding: 18px 20px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid transparent; transition: box-shadow .2s; }
.eq-card:hover { box-shadow: 0 4px 16px rgba(32,32,42,.1); }
.eq-card.card-available { border-left-color: #10b981; }
.eq-card.card-borrowed { border-left-color: #f59e0b; }
.eq-card.card-maintenance { border-left-color: #ef4444; }
.eq-card.card-retired { border-left-color: #9ca3af; opacity: .7; }

.eq-card-head { display: flex; justify-content: space-between; align-items: center; }
.asset-badge { font-size: 11px; font-weight: 800; color: #244ca5; background: #eff6ff; padding: 2px 8px; border-radius: 3px; font-family: monospace; }
.eq-name { margin: 0; font-size: 14.5px; font-weight: 800; color: #2d2d3a; line-height: 1.3; }
.eq-meta { display: flex; flex-direction: column; gap: 4px; }
.eq-meta span { font-size: 12px; color: #727285; display: flex; align-items: center; gap: 5px; }
.eq-notes { font-style: italic; }

.eq-actions { display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid #f0f0f5; padding-top: 10px; margin-top: 4px; }
.eq-btn { min-height: 26px; padding: 0 10px; font-size: 11px; font-weight: 700; border-radius: 3px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.eq-btn.edit { background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe; }
.eq-btn.edit:hover { background: #4338ca; color: #fff; }
.eq-btn.avail { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
.eq-btn.avail:hover { background: #047857; color: #fff; }
.eq-btn.maint { background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; }
.eq-btn.maint:hover { background: #c2410c; color: #fff; }
.eq-btn.retire { background: #f9fafb; color: #6b7280; border: 1px solid #d1d5db; }
.eq-btn.retire:hover { background: #6b7280; color: #fff; }

.eq-empty { grid-column: 1/-1; text-align: center; padding: 40px; color: #9ca3af; font-style: italic; font-size: 13.5px; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.eq-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; }
.modal-top { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #eeeeef; }
.modal-top h3 { margin: 0; font-size: 16px; font-weight: 800; color: #3e3e4a; }
.close-x { background: transparent; color: #a7a7b4; min-height: unset; padding: 4px; width: 28px; height: 28px; }

.eq-form { display: flex; flex-direction: column; gap: 14px; padding: 20px 22px; }
.eq-form label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 700; color: #474753; }
.hint { font-weight: 400; color: #9ca3af; font-size: 11px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }
.btn-cancel { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; font-size: 13px; min-height: 36px; padding: 0 16px; border-radius: 4px; }
.btn-submit { background: #5f63ff; color: #fff; font-size: 13px; font-weight: 700; min-height: 36px; padding: 0 20px; border-radius: 4px; }
.btn-submit:hover { background: #4a4fdf; }
</style>
