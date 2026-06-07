<script setup>
defineProps({
  equipment: {
    type: Array,
    default: () => []
  }
});

function statusClass(status) {
  return `status-chip ${status.toLowerCase()}`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  const pad = (n) => String(n).padStart(2, '0');
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}
</script>

<template>
  <section class="panel table-panel">
    <div class="panel-heading">
      <div>
        <h2>View equipment</h2>
        <p>Live classroom inventory for lecturers and support staff.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Equipment</th>
            <th>Category</th>
            <th>Location</th>
            <th>Status</th>
            <th>Borrowed At</th>
            <th>Returned/Due At</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in equipment" :key="item.id">
            <td class="asset-code">{{ item.assetCode }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.location }}</td>
            <td><span :class="statusClass(item.status)">{{ item.status }}</span></td>
            <td class="time-col">
              {{ item.latestRequest ? formatDateTime(item.latestRequest.createdAt) : '-' }}
            </td>
            <td class="time-col">
              <template v-if="item.latestRequest">
                <span v-if="item.status === 'BORROWED'" class="due-time">
                  Due: {{ formatDateTime(item.latestRequest.dueAt) }}
                </span>
                <span v-else-if="item.latestRequest.returnedAt" class="returned-time">
                  {{ formatDateTime(item.latestRequest.returnedAt) }}
                </span>
                <span v-else>-</span>
              </template>
              <template v-else>-</template>
            </td>
            <td class="muted">{{ item.conditionNotes }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
table {
  min-width: 960px !important;
}
.time-col {
  font-size: 12px;
  white-space: nowrap;
}
.due-time {
  color: #c66b00;
  font-weight: 600;
}
.returned-time {
  color: #047857;
}
</style>
