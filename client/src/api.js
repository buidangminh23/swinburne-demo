async function request(path, options = {}) {
  const session = JSON.parse(localStorage.getItem("portal-session") || "null");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };
  
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  const response = await fetch(path, {
    headers,
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
  googleLogin(idToken) {
    return request("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken })
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
  borrowHistory(userId) {
    return request(`/api/users/${userId}/borrow-history`);
  },
  borrow(payload) {
    return request("/api/borrow-requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  confirmReturn(id, payload = {}) {
    return request(`/api/borrow-requests/${id}/return`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateStatus(id, payload) {
    return request(`/api/equipment/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },
  sprints() {
    return request("/api/sprints");
  },
  approve(id, userId) {
    return request(`/api/borrow-requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ userId })
    });
  },
  deny(id, userId) {
    return request(`/api/borrow-requests/${id}/deny`, {
      method: "POST",
      body: JSON.stringify({ userId })
    });
  },
  extend(id, payload = {}) {
    return request(`/api/borrow-requests/${id}/extend`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  remind(id) {
    return request(`/api/borrow-requests/${id}/remind`, { method: "POST" });
  },
  history(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, val);
      }
    });
    return request(`/api/borrow-history?${searchParams.toString()}`);
  }
};
