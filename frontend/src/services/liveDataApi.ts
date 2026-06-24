import type { EvaluationPayload, LiveGroupStanding, RefreshStatus } from "../types";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
const API_BASE_URL = configuredApiBaseUrl ?? "";

export function hasApiBaseUrl() {
  return import.meta.env.DEV || API_BASE_URL.length > 0;
}

export async function fetchRefreshStatus() {
  return fetchJson<RefreshStatus>("/api/refresh/status");
}

export async function refreshWorldCupData() {
  return fetchJson<RefreshStatus>("/api/refresh", { method: "POST" });
}

export async function fetchEvaluation() {
  return fetchJson<EvaluationPayload>("/api/evaluation");
}

export async function fetchStandings() {
  return fetchJson<LiveGroupStanding[]>("/api/standings");
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!hasApiBaseUrl()) return null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}
