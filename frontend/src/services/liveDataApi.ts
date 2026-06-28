import type {
  EvaluationPayload,
  LiveGroupStanding,
  RealTrade,
  RefreshStatus,
  TradeRecommendation,
  TradingConfig,
  TradingPerformanceSummary,
} from "../types";

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

export async function fetchTradingConfig() {
  return fetchJson<TradingConfig>("/api/trading/config");
}

export async function fetchTradeRecommendations() {
  return fetchJson<TradeRecommendation[]>("/api/trading/recommendations");
}

export async function refreshPolymarket() {
  return fetchJson<{ [key: string]: unknown }>("/api/trading/refresh-polymarket", { method: "POST" });
}

export async function generateTradeRecommendations() {
  return fetchJson<{ recommendations: TradeRecommendation[]; count: number }>("/api/trading/generate-recommendations", {
    method: "POST",
  });
}

export async function executeRealTrade(tradeId: string, confirmationText: string) {
  return fetchJson<{ [key: string]: unknown }>("/api/trading/execute-real-trade", {
    method: "POST",
    body: JSON.stringify({ trade_id: tradeId, confirmation_text: confirmationText }),
  });
}

export async function fetchTradeLedger() {
  return fetchJson<RealTrade[]>("/api/trading/ledger");
}

export async function fetchTradingPerformance() {
  return fetchJson<TradingPerformanceSummary>("/api/trading/performance");
}

export async function updateKillSwitch(enabled: boolean) {
  return fetchJson<{ [key: string]: unknown }>("/api/trading/kill-switch", {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
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
