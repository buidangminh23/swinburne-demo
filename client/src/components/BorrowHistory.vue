<script setup>
defineProps({
  history: {
    type: Array,
    default: () => []
  }
});

function statusClass(status) {
  return `status-chip ${status.toLowerCase()}`;
}
</script>

<template>
  <section class="panel borrow-history-panel" id="borrow-history">
    <div class="panel-heading">
      <div>
        <h2>Borrow history</h2>
        <p>Student equipment borrowing timeline.</p>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Equipment</th>
            <th>Classroom</th>
            <th>Borrowed</th>
            <th>Due</th>
            <th>Returned</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="request in history" :key="request.id">
            <td>{{ request.equipment?.name }}</td>
            <td>{{ request.classroom }}</td>
            <td>{{ new Date(request.createdAt).toLocaleDateString() }}</td>
            <td>{{ new Date(request.dueAt).toLocaleDateString() }}</td>
            <td>{{ request.returnedAt ? new Date(request.returnedAt).toLocaleDateString() : "-" }}</td>
            <td><span :class="statusClass(request.status)">{{ request.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-if="history.length === 0" class="table-empty">No borrowing history yet.</p>
    </div>
  </section>
</template>
