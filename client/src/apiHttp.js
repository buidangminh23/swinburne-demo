import { apiMock } from "./apiMock";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function request(path, options = {}) {
  const session = JSON.parse(localStorage.getItem("portal-session") || "null");
  const headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { headers, ...options });
  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message ?? "Request failed");
  }
  return data;
}

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.append(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const apiHttp = {
  ...apiMock,
  login(payload) {
    return request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  googleLogin(accessToken) {
    return request("/api/auth/google", { method: "POST", body: JSON.stringify({ accessToken }) });
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
    return request("/api/borrow-requests", { method: "POST", body: JSON.stringify(payload) });
  },
  confirmReturn(id, payload = {}) {
    return request(`/api/borrow-requests/${id}/return`, { method: "POST", body: JSON.stringify(payload) });
  },
  updateStatus(id, payload) {
    return request(`/api/equipment/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  sprints() {
    return request("/api/sprints");
  },
  approve(id) {
    return request(`/api/borrow-requests/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
  },
  deny(id) {
    return request(`/api/borrow-requests/${id}/deny`, { method: "POST", body: JSON.stringify({}) });
  },
  extend(id, payload = {}) {
    return request(`/api/borrow-requests/${id}/extend`, { method: "POST", body: JSON.stringify(payload) });
  },
  remind(id) {
    return request(`/api/borrow-requests/${id}/remind`, { method: "POST" });
  },
  history(params = {}) {
    return request(`/api/borrow-history${toQuery(params)}`);
  },
  editRequest(id, payload) {
    return request(`/api/borrow-requests/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  custody(id, payload = {}) {
    return request(`/api/borrow-requests/${id}/custody`, { method: "POST", body: JSON.stringify(payload) });
  },
  schedule(equipmentId) {
    return request(`/api/equipment/${equipmentId}/schedule`);
  },
  notifications(limit = 20) {
    return request(`/api/notifications?limit=${limit}`);
  }
};
