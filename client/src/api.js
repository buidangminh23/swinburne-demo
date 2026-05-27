async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  login(payload) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return request("/api/auth/logout", { method: "POST" });
  },
  summary() {
    return request("/api/summary");
  },
  equipment() {
    return request("/api/equipment");
  },
  borrowRequests() {
    return request("/api/borrow-requests");
  },
  borrow(payload) {
    return request("/api/borrow-requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  confirmReturn(id) {
    return request(`/api/borrow-requests/${id}/return`, { method: "POST" });
  },
  updateStatus(id, payload) {
    return request(`/api/equipment/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  sprints() {
    return request("/api/sprints");
  }
};

