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
