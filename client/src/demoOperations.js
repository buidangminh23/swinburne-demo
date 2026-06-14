const ACTIVE_REQUEST_STATUSES = ["REQUESTED", "APPROVED", "RESERVED", "BORROWED"];
const STAFF_ROLES = ["ADMIN", "SUPPORT", "OPERATIONS", "LECTURER", "EVENT_STAFF"];

function toMillis(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function requestWindow(request) {
  return {
    start: request.startDate ?? request.createdAt ?? request.dueAt,
    end: request.dueAt
  };
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return toMillis(leftStart) < toMillis(rightEnd) && toMillis(rightStart) < toMillis(leftEnd);
}

function parseJsonList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    groupName: user.groupName ?? null,
    className: user.className ?? null
  };
}

function activeRequestsForEquipment(requests, equipmentId, window, excludeRequestId = null) {
  return requests.filter((request) =>
    request.equipmentId === equipmentId &&
    request.id !== excludeRequestId &&
    ACTIVE_REQUEST_STATUSES.includes(request.status) &&
    rangesOverlap(requestWindow(request).start, requestWindow(request).end, window.start, window.end)
  );
}

function availableUnitsForEquipment(equipment, requests, equipmentId, window, excludeRequestId = null) {
  const item = equipment.find((candidate) => candidate.id === equipmentId);
  if (!item || ["MAINTENANCE", "RETIRED"].includes(item.status)) {
    return 0;
  }
  const occupied = activeRequestsForEquipment(requests, equipmentId, window, excludeRequestId)
    .reduce((sum, request) => sum + (request.remainingQuantity ?? request.quantity ?? 1), 0);
  return (item.totalQuantity ?? 1) - occupied;
}

export function analyzeBorrowRequest({ equipment = [], requests = [], users = [], payload = {}, requesterId = null }) {
  const item = equipment.find((candidate) => candidate.id === payload.equipmentId);
  const lecturerId = payload.lecturerId ?? requesterId;
  const window = {
    start: payload.startDate ?? new Date().toISOString(),
    end: payload.dueAt
  };
  const quantity = Number(payload.quantity ?? 1);
  const conflicts = item
    ? activeRequestsForEquipment(requests, item.id, window).map((request) => ({
        requestId: request.id,
        equipmentId: request.equipmentId,
        lecturer: compactUser(users.find((user) => user.id === request.lecturerId) ?? request.lecturer),
        start: requestWindow(request).start,
        end: requestWindow(request).end,
        quantity: request.remainingQuantity ?? request.quantity ?? 1,
        status: request.status
      }))
    : [];
  const duplicates = conflicts.filter((request) => request.lecturer?.id === lecturerId);
  const availableUnits = item ? availableUnitsForEquipment(equipment, requests, item.id, window) : 0;
  const isUnavailableStatus = item ? ["MAINTENANCE", "RETIRED"].includes(item.status) : true;
  const isBlocked = !item || isUnavailableStatus || quantity > availableUnits;
  const replacements = item
    ? equipment
        .filter((candidate) =>
          candidate.id !== item.id &&
          candidate.category === item.category &&
          candidate.status === "AVAILABLE" &&
          availableUnitsForEquipment(equipment, requests, candidate.id, window) >= quantity
        )
        .map((candidate) => ({
          ...candidate,
          availableUnits: availableUnitsForEquipment(equipment, requests, candidate.id, window)
        }))
    : [];

  const messages = [];
  if (!item) {
    messages.push("Equipment not found.");
  } else if (isUnavailableStatus) {
    messages.push(`${item.name} is ${String(item.status).toLowerCase()}.`);
  } else if (quantity > availableUnits) {
    messages.push(`Only ${Math.max(0, availableUnits)} unit(s) are free for that time window.`);
  }
  if (duplicates.length > 0) {
    messages.push("Possible duplicate: this requester already has an overlapping booking for this equipment.");
  }

  return {
    canSubmit: !isBlocked,
    equipment: item ?? null,
    availableUnits: Math.max(0, availableUnits),
    conflicts,
    duplicates,
    replacements,
    messages
  };
}

export function applyPartialReturnSnapshot(request, input = {}) {
  const totalQuantity = Number(request.quantity ?? 1);
  const previousReturned = Number(request.returnedQuantity ?? 0);
  const requestedReturn = Number(input.returnedQuantity ?? totalQuantity - previousReturned);
  const returnedNow = Math.min(Math.max(0, Number.isFinite(requestedReturn) ? requestedReturn : 0), totalQuantity - previousReturned);
  const returnedQuantity = previousReturned + returnedNow;
  const remainingQuantity = Math.max(0, totalQuantity - returnedQuantity);
  const at = input.at ?? new Date().toISOString();
  const isFullReturn = remainingQuantity === 0;
  const isStatusOk = input.isStatusOk !== false && !input.accessoriesMissing?.length;
  const receipt = {
    id: `RCPT-${request.id}-${toMillis(at)}`,
    type: isFullReturn ? "RETURN" : "PARTIAL_RETURN",
    requestId: request.id,
    equipmentId: request.equipmentId,
    lecturerId: request.lecturerId,
    actorName: input.actorName ?? "Staff",
    returnedNow,
    returnedQuantity,
    remainingQuantity,
    conditionBefore: input.conditionBefore ?? request.conditionBefore ?? "",
    conditionAfter: input.conditionAfter ?? "",
    photoBeforeUrl: input.photoBeforeUrl ?? "",
    photoAfterUrl: input.photoAfterUrl ?? "",
    accessoriesReturned: input.accessoriesReturned ?? [],
    accessoriesMissing: input.accessoriesMissing ?? [],
    createdAt: at
  };
  const custodyLog = parseJsonList(request.custodyLog);
  custodyLog.push({
    at,
    action: isFullReturn ? (isStatusOk ? "RETURNED_OK" : "RETURNED_DAMAGED") : "PARTIAL_RETURN",
    actor: input.actorName ?? "Staff",
    notes: input.conditionAfter ?? input.damageReport ?? ""
  });
  const partialReturns = parseJsonList(request.partialReturns);
  if (!isFullReturn) {
    partialReturns.push(receipt);
  }

  return {
    ...request,
    status: isFullReturn ? "RETURNED" : "BORROWED",
    returnedQuantity,
    remainingQuantity,
    returnedAt: isFullReturn ? at : request.returnedAt ?? null,
    isStatusOk,
    damageReport: input.damageReport ?? (isStatusOk ? "" : input.conditionAfter ?? ""),
    conditionBefore: receipt.conditionBefore,
    conditionAfter: receipt.conditionAfter,
    photoBeforeUrl: receipt.photoBeforeUrl,
    photoAfterUrl: receipt.photoAfterUrl,
    accessoriesReturned: receipt.accessoriesReturned,
    accessoriesMissing: receipt.accessoriesMissing,
    latestReceipt: receipt,
    partialReturns,
    custodyLog: JSON.stringify(custodyLog),
    updatedAt: at
  };
}

export function buildSmartAlerts({ equipment = [], requests = [], now = new Date().toISOString() }) {
  const nowMs = toMillis(now);
  const nearLimit = nowMs + 24 * 60 * 60 * 1000;
  const alerts = [];
  const equipmentById = new Map(equipment.map((item) => [item.id, item]));

  for (const request of requests) {
    const dueMs = toMillis(request.dueAt);
    const item = equipmentById.get(request.equipmentId);
    if (request.status === "BORROWED" && dueMs && dueMs < nowMs) {
      alerts.push({
        id: `overdue-${request.id}`,
        type: "OVERDUE",
        severity: "critical",
        title: "Overdue return",
        message: `${item?.name ?? "Equipment"} is overdue.`,
        requestId: request.id,
        equipmentId: request.equipmentId
      });
    } else if (request.status === "BORROWED" && dueMs && dueMs <= nearLimit) {
      alerts.push({
        id: `near-due-${request.id}`,
        type: "NEAR_DUE",
        severity: "warning",
        title: "Return due soon",
        message: `${item?.name ?? "Equipment"} is due within 24 hours.`,
        requestId: request.id,
        equipmentId: request.equipmentId
      });
    }
    if (
      request.status === "BORROWED" &&
      Number(request.remainingQuantity ?? 0) > 0 &&
      (request.remainingQuantity !== undefined || Number(request.returnedQuantity ?? 0) > 0)
    ) {
      alerts.push({
        id: `partial-${request.id}`,
        type: "PARTIAL_RETURN",
        severity: "warning",
        title: "Partial return open",
        message: `${item?.name ?? "Equipment"} still has ${request.remainingQuantity} unit(s) pending return.`,
        requestId: request.id,
        equipmentId: request.equipmentId
      });
    }
  }

  for (const item of equipment) {
    if (item.status === "MAINTENANCE") {
      alerts.push({
        id: `maintenance-${item.id}`,
        type: "MAINTENANCE",
        severity: "warning",
        title: "Maintenance item",
        message: `${item.name} needs staff attention.`,
        equipmentId: item.id
      });
    }
    if (item.status === "AVAILABLE" && Number(item.availableNow ?? item.totalQuantity ?? 1) === 0) {
      alerts.push({
        id: `stock-${item.id}`,
        type: "LOW_STOCK",
        severity: "info",
        title: "Fully booked",
        message: `${item.name} has no free units right now.`,
        equipmentId: item.id
      });
    }
  }

  return alerts;
}

export function filterNotifications(notifications = [], filters = {}, preferences = {}) {
  const enabledTypes = preferences.enabledTypes ?? null;
  return notifications.filter((notification) => {
    if (enabledTypes && !enabledTypes.includes(notification.type)) return false;
    if (filters.type && filters.type !== "ALL" && notification.type !== filters.type) return false;
    if (filters.status === "unread" && notification.readAt) return false;
    if (filters.status === "read" && !notification.readAt) return false;
    if (filters.search) {
      const haystack = `${notification.subject ?? ""} ${notification.message ?? ""}`.toLowerCase();
      if (!haystack.includes(String(filters.search).toLowerCase())) return false;
    }
    return true;
  });
}

function requestEventTitle(request) {
  if (request.status === "RETURNED") return "Returned";
  if (request.status === "BORROWED") return "Checked out / borrowed";
  if (request.status === "RESERVED") return "Approved reservation";
  if (request.status === "CANCELLED") return "Cancelled";
  return "Requested";
}

function buildRequestEvent(request, users, staff = null) {
  return {
    id: `request-${request.id}-${request.status}`,
    type: request.status,
    title: requestEventTitle(request),
    at: request.updatedAt ?? request.createdAt ?? request.startDate ?? request.dueAt,
    requestId: request.id,
    lecturer: compactUser(users.find((user) => user.id === request.lecturerId) ?? request.lecturer),
    staff: compactUser(staff),
    details: {
      purpose: request.purpose,
      classroom: request.classroom,
      quantity: request.quantity,
      returnedQuantity: request.returnedQuantity ?? 0,
      remainingQuantity: request.remainingQuantity ?? 0,
      startDate: request.startDate,
      dueAt: request.dueAt,
      conditionBefore: request.conditionBefore,
      conditionAfter: request.conditionAfter,
      accessoriesMissing: request.accessoriesMissing ?? [],
      receipt: request.latestReceipt ?? null
    }
  };
}

export function buildEquipmentTimelines({ equipment = [], requests = [], auditLog = [], users = [] }) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const requestsById = new Map(requests.map((request) => [request.id, request]));

  return equipment.map((item) => {
    const itemRequests = requests.filter((request) => request.equipmentId === item.id);
    const events = [];

    for (const request of itemRequests) {
      const staff = usersById.get(request.approvedById) ?? usersById.get(request.deniedById) ?? null;
      events.push(buildRequestEvent(request, users, staff));
      for (const partial of parseJsonList(request.partialReturns)) {
        events.push({
          id: `partial-${request.id}-${partial.createdAt}`,
          type: "PARTIAL_RETURN",
          title: "Partial return",
          at: partial.createdAt,
          requestId: request.id,
          lecturer: compactUser(usersById.get(request.lecturerId) ?? request.lecturer),
          staff: null,
          details: partial
        });
      }
      if (request.latestReceipt) {
        events.push({
          id: `receipt-${request.latestReceipt.id}`,
          type: request.latestReceipt.type,
          title: "Digital handover receipt",
          at: request.latestReceipt.createdAt,
          requestId: request.id,
          lecturer: compactUser(usersById.get(request.lecturerId) ?? request.lecturer),
          staff: null,
          details: request.latestReceipt
        });
      }
    }

    for (const audit of auditLog) {
      const relatedRequest = audit.entityType === "borrowRequest" ? requestsById.get(audit.entityId) : null;
      const isEquipmentAudit = audit.entityType === "equipment" && audit.entityId === item.id;
      const isRequestAudit = relatedRequest?.equipmentId === item.id;
      if (!isEquipmentAudit && !isRequestAudit) continue;
      events.push({
        id: `audit-${audit.id}`,
        type: "AUDIT",
        title: audit.action,
        at: audit.createdAt,
        requestId: relatedRequest?.id ?? null,
        lecturer: compactUser(relatedRequest ? usersById.get(relatedRequest.lecturerId) ?? relatedRequest.lecturer : null),
        staff: compactUser(usersById.get(audit.actorId) ?? audit.actor ?? null),
        details: audit
      });
    }

    events.sort((left, right) => toMillis(right.at) - toMillis(left.at));
    return { equipment: item, events };
  });
}

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}
