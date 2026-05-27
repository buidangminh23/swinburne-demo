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
            <td class="muted">{{ item.conditionNotes }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
