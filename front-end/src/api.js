const apiUrl = "/api";
const currentUserKey = "doin.currentUserId";

export function currentUserId() {
  return sessionStorage.getItem(currentUserKey);
}

export function setCurrentUserId(userId) {
  if (userId === null) {
    sessionStorage.removeItem(currentUserKey);
  } else {
    sessionStorage.setItem(currentUserKey, userId);
  }
}

async function request(path, { useMockUser = true, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const userId = useMockUser ? currentUserId() : null;
  if (userId) headers.set("Mock-User-Id", userId);

  let response;
  try {
    response = await fetch(apiUrl + path, { ...options, headers });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error("Couldn't reach Doin. Check your connection and try again.", { cause: error });
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    const error = new Error(data?.error?.message ?? "Something went wrong. Please try again.");
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }
  return data;
}

export function registerAccount(fields, signal) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(fields),
    signal,
    useMockUser: false,
  });
}

export function logIn(credentials, signal) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    signal,
    useMockUser: false,
  });
}

export function getMyUser(signal) {
  return request("/users/me", { signal });
}

export function getInterests(signal) {
  return request("/interests", { signal, useMockUser: false });
}

export function saveInterests(userId, interests, signal) {
  return request(`/users/${encodeURIComponent(userId)}/interests`, {
    method: "POST",
    body: JSON.stringify({ interests }),
    signal,
  });
}

export function setupProfile(fields, signal) {
  return request("/profiles", {
    method: "POST",
    body: JSON.stringify(fields),
    signal,
  });
}

// Discover people (#99), with search and interest filtering (#100). The
// search text and the interest go in the address as query values, and an
// empty search or the All choice simply leaves that value out.
export function getPeople(search, interest) {
  const parts = [];
  if (search.trim()) {
    parts.push(`search=${encodeURIComponent(search.trim())}`);
  }
  if (interest && interest !== "All") {
    parts.push(`interest=${encodeURIComponent(interest)}`);
  }
  const query = parts.length > 0 ? `?${parts.join("&")}` : "";
  return request(`/users${query}`);
}

// One profile (#98), shared by My Profile, Edit Profile, and Person
// Details (#99).
export function getPerson(userId) {
  return request(`/users/${userId}`);
}

// Profile update (#98). Only the owner can update their own profile.
export function updateProfile(userId, fields) {
  return request(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export function getEvents(signal) {
  return request("/events", { signal });
}

export function getEvent(eventId, signal) {
  return request(`/events/${encodeURIComponent(eventId)}`, { signal });
}

export function getEventCategories(signal) {
  return request("/events/categories", { signal });
}


export function searchEvents(filters = {}, signal) {
  const params = new URLSearchParams();

  for (const key of ["search", "category", "location", "date"]) {
    const value = filters[key];

    if (
      typeof value === "string" &&
      value.trim() &&
      value !== "All"
    ) {
      params.set(key, value.trim());
    }
  }

  const query = params.toString();

  return request(`/events${query ? `?${query}` : ""}`, {
    signal,
  });
}


export function createEvent(fields, signal) {
  return request("/events", {
    method: "POST",
    body: JSON.stringify(fields),
    signal,
  });
}


export function updateEvent(eventId, fields, signal) {
  return request(`/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
    signal,
  });
}


export function cancelEvent(eventId, signal) {
  return request(`/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    signal,
  });
}
