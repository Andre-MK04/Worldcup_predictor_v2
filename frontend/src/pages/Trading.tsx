import { useCallback, useEffect, useState } from "react";
import {
  executeRealTrade,
  fetchTradeLedger,
  fetchTradeRecommendations,
  fetchTradingConfig,
  fetchTradingPerformance,
  generateTradeRecommendations,
  refreshPolymarket,
  updateKillSwitch,
} from "../services/liveDataApi";
import type { RealTrade, TradeRecommendation, TradingConfig, TradingPerformanceSummary } from "../types";

interface TradingProps {
  apiAvailable: boolean;
}

export function Trading({ apiAvailable }: TradingProps) {
  const [config, setConfig] = useState<TradingConfig | null>(null);
  const [recommendations, setRecommendations] = useState<TradeRecommendation[]>([]);
  const [ledger, setLedger] = useState<RealTrade[]>([]);
  const [performance, setPerformance] = useState<TradingPerformanceSummary | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<TradeRecommendation | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [status, setStatus] = useState<string>("");

  const loadTradingData = useCallback(async () => {
    if (!apiAvailable) return;
    const [configPayload, recommendationPayload, ledgerPayload, performancePayload] = await Promise.all([
      fetchTradingConfig(),
      fetchTradeRecommendations(),
      fetchTradeLedger(),
      fetchTradingPerformance(),
    ]);
    setConfig(configPayload);
    setRecommendations(recommendationPayload ?? []);
    setLedger(ledgerPayload ?? []);
    setPerformance(performancePayload);
  }, [apiAvailable]);

  useEffect(() => {
    loadTradingData().catch((error) => {
      console.error("Failed to load trading data", error);
      setStatus("Trading backend unavailable.");
    });
  }, [loadTradingData]);

  const handleRefreshMarkets = async () => {
    setStatus("Refreshing Polymarket mapping...");
    await refreshPolymarket();
    await loadTradingData();
    setStatus("Market mapping refreshed. User approval is still required before any trade.");
  };

  const handleGenerate = async () => {
    setStatus("Generating candidates...");
    const payload = await generateTradeRecommendations();
    setRecommendations(payload?.recommendations ?? []);
    setStatus(`Generated ${payload?.count ?? 0} candidate trades.`);
  };

  const handleRefreshAndGenerate = async () => {
    setStatus("Refreshing markets and generating candidates...");
    await refreshPolymarket();
    const payload = await generateTradeRecommendations();
    await loadTradingData();
    setRecommendations(payload?.recommendations ?? []);
    setStatus(`Refreshed markets and generated ${payload?.count ?? 0} candidate trades.`);
  };

  const handleKillSwitch = async (enabled: boolean) => {
    await updateKillSwitch(enabled);
    await loadTradingData();
    setStatus(`Kill switch ${enabled ? "enabled" : "disabled"}.`);
  };

  const handleExecute = async () => {
    if (!selectedTrade) return;
    const response = await executeRealTrade(selectedTrade.trade_id, confirmationText);
    setStatus(String(response?.reason ?? "Trade request processed."));
    setSelectedTrade(null);
    setConfirmationText("");
    await loadTradingData();
  };

  return (
    <main className="model-page trading-page">
      <div className="page-kicker">Trading</div>
      <h2>Real-money Polymarket controls</h2>
      <p className="page-intro">
        Real-money trading is capped and locked down. This is not financial advice. Prediction markets involve risk,
        and you can lose the full amount staked. Only use this where legally permitted.
      </p>
      <section className="section-block trading-warning">
        <strong>Real-money warning</strong>
        <p>
          Real trading is enabled only when configured. The default kill switch blocks order submission. No prediction is
          guaranteed, and this app never treats an edge as risk-free.
        </p>
      </section>
      <TradingConfigCard config={config} onKillSwitch={handleKillSwitch} />
      <section className="section-block trading-actions">
        <div className="section-heading">
          <span>Actions</span>
          <strong>{status || "No action running"}</strong>
        </div>
        <div className="trading-button-row">
          <button onClick={handleRefreshAndGenerate} type="button">Refresh and generate recommendations</button>
          <button onClick={handleRefreshMarkets} type="button">Refresh Polymarket prices</button>
          <button onClick={handleGenerate} type="button">Generate recommendations</button>
        </div>
      </section>
      <RecommendationList recommendations={recommendations} onSelect={setSelectedTrade} />
      <TradingPerformance performance={performance} />
      <TradeLedger ledger={ledger} />
      {selectedTrade ? (
        <div className="trade-modal">
          <div className="trade-modal-panel">
            <div className="section-heading">
              <span>Confirm real trade</span>
              <button onClick={() => setSelectedTrade(null)} type="button">Close</button>
            </div>
            <p>
              {selectedTrade.team_a} vs {selectedTrade.team_b}: {selectedTrade.country_or_draw} at{" "}
              {formatPercent(toNumber(selectedTrade.market_entry_price))}. Max loss ${selectedTrade.recommended_stake_usd}.
            </p>
            <p className="empty-note">Type CONFIRM to request execution. Risk checks run again on the backend.</p>
            <input value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} />
            <button disabled={confirmationText !== "CONFIRM"} onClick={handleExecute} type="button">
              Place real trade
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function TradingConfigCard({ config, onKillSwitch }: { config: TradingConfig | null; onKillSwitch: (enabled: boolean) => void }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Safety config</span>
        <strong>{config?.trading_mode ?? "Unavailable"}</strong>
      </div>
      <div className="trading-config-grid">
        <TradingStat label="Real trading" value={config?.enable_real_trading ? "Enabled" : "Disabled"} />
        <TradingStat label="Kill switch" value={config?.kill_switch ? "On" : "Off"} />
        <TradingStat label="Credentials" value={config?.credentials_present ? "Present" : "Missing"} />
        <TradingStat label="Bankroll cap" value={`$${config?.real_bankroll_limit_usd?.toFixed(2) ?? "10.00"}`} />
        <TradingStat label="Max trade" value={`$${config?.max_stake_per_trade_usd?.toFixed(2) ?? "0.50"}`} />
        <TradingStat label="Daily cap" value={`$${config?.max_daily_stake_usd?.toFixed(2) ?? "3.00"}`} />
      </div>
      <div className="trading-button-row">
        <button onClick={() => onKillSwitch(true)} type="button">Turn kill switch on</button>
        <button onClick={() => onKillSwitch(false)} type="button">Turn kill switch off</button>
      </div>
    </section>
  );
}

function RecommendationList({
  recommendations,
  onSelect,
}: {
  recommendations: TradeRecommendation[];
  onSelect: (trade: TradeRecommendation) => void;
}) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Candidate trades</span>
        <strong>{recommendations.length}</strong>
      </div>
      {recommendations.length ? (
        <div className="trade-card-list">
          {recommendations.map((trade) => (
            <article className="trade-card" key={trade.trade_id}>
              <h3>{trade.team_a} vs {trade.team_b}</h3>
              <p>{trade.country_or_draw} · stake ${trade.recommended_stake_usd}</p>
              <div className="trading-config-grid compact">
                <TradingStat label="Model" value={formatPercent(toNumber(trade.model_probability))} />
                <TradingStat label="Ask" value={formatPercent(toNumber(trade.market_entry_price))} />
                <TradingStat label="Edge" value={formatPercent(toNumber(trade.edge))} />
                <TradingStat label="Risk" value={trade.approved_by_risk === "True" || trade.approved_by_risk === "true" ? "Approved" : "Blocked"} />
              </div>
              <p className="empty-note">{trade.risk_reason}</p>
              <button onClick={() => onSelect(trade)} type="button">Place real trade</button>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No candidate trades. Approved market mappings and Polymarket prices are required.</p>
      )}
    </section>
  );
}

function TradingPerformance({ performance }: { performance: TradingPerformanceSummary | null }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Trading performance</span>
        <strong>{performance?.trade_count ?? 0} trades</strong>
      </div>
      <div className="trading-config-grid">
        <TradingStat label="Total staked" value={`$${performance?.total_staked?.toFixed(2) ?? "0.00"}`} />
        <TradingStat label="Open exposure" value={`$${performance?.open_exposure?.toFixed(2) ?? "0.00"}`} />
        <TradingStat label="Settled P/L" value={`$${performance?.settled_profit_loss?.toFixed(2) ?? "0.00"}`} />
        <TradingStat label="ROI" value={performance?.roi === null || performance?.roi === undefined ? "N/A" : formatPercent(performance.roi)} />
      </div>
    </section>
  );
}

function TradeLedger({ ledger }: { ledger: RealTrade[] }) {
  return (
    <section className="section-block">
      <div className="section-heading">
        <span>Trade ledger</span>
        <strong>{ledger.length}</strong>
      </div>
      {ledger.length ? (
        <div className="trade-card-list">
          {ledger.map((trade) => (
            <article className="trade-card" key={trade.trade_id}>
              <h3>{trade.team_a} vs {trade.team_b}</h3>
              <p>{trade.country_or_draw} · {trade.status}</p>
              <p className="empty-note">{trade.error_message || `P/L ${trade.profit_loss || "pending"}`}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No real trades recorded.</p>
      )}
    </section>
  );
}

function TradingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="trading-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
