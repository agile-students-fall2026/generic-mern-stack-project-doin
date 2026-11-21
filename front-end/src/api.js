// Simple helpers for talking to the back end.
// The back end serves this front end once it is built, so a relative
// address works from whatever host serves the page. In development the
// Vite server sends these requests on to the back end, as set up in
// vite.config.js, so no host is written into the app code.

const apiUrl = "/api";

// The signed in user id is kept in session storage under this key, as
// agreed in #91. The server reads it from the Mock-User-Id header.
export function currentUserId() {
  return sessionStorage.getItem("doin.currentUserId");
}

function headers() {
  const result = { "Content-Type": "application/json" };
  const userId = currentUserId();
  if (userId) {
    result["Mock-User-Id"] = userId;
  }
  return result;
}

// Sends one request and returns the answer as an object. When the server
// answers with an error, this throws an Error with the server message so
// the page can show it.
async function request(path, options = {}) {
  const response = await fetch(apiUrl + path, {
    ...options,
    headers: headers(),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? "Something went wrong. Please try again.",
    );
  }
  return data;
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

// The signed in user, for the pages that need their own interests.
export function getMyUser() {
  return request("/users/me");
}

// Profile setup (#98) fills in the record that registration created.
export function setupProfile(fields) {
  return request("/profiles", {
    method: "POST",
    body: JSON.stringify(fields),
  });
}

// Profile update (#98). Only the owner can update their own profile.
export function updateProfile(userId, fields) {
  return request(`/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}
