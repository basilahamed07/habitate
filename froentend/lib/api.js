const FALLBACK_API_BASE = "http://localhost:8000/api";
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.API_BASE ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8000/api`
    : FALLBACK_API_BASE);

const TOKEN_KEY = "habitatAuthToken";

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {};
  }
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}

export function setAuthToken(token) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function safeFetchJson(endpoint, fallback) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    return await response.json();
  } catch (_error) {
    return fallback;
  }
}

export async function postJson(endpoint, payload) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    return await response.json();
  } catch (_error) {
    return null;
  }
}

export async function deleteJson(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }
    return await response.json();
  } catch (_error) {
    return null;
  }
}

export function getApiBase() {
  return API_BASE;
}
