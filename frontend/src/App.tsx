import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupsView } from "./components/GroupsView";
import { ExpectedGoalsComparison } from "./components/ExpectedGoalsComparison";
import { GoalProbabilities } from "./components/GoalProbabilities";
import { Header } from "./components/Header";
import { MatchHero } from "./components/MatchHero";
import { MatchSelector } from "./components/MatchSelector";
import { ModelMetrics } from "./components/ModelMetrics";
import { ModelView } from "./components/ModelView";
import { Performance } from "./pages/Performance";
import { PredictionExplanation } from "./components/PredictionExplanation";
import { ProbabilityBar } from "./components/ProbabilityBar";
import { ScorelineList } from "./components/ScorelineList";
import { TeamFormComparison } from "./components/TeamFormComparison";
import { calibrationBuckets, fixtures, modelMetrics, predictions } from "./data/predictions";
import { worldCup2026Teams } from "./data/worldCup2026Teams";
import { fixtureValidation } from "./services/fixturesService";
import { fetchEvaluation, fetchRefreshStatus, fetchStandings, hasApiBaseUrl, refreshWorldCupData } from "./services/liveDataApi";
import type { AppView, EvaluationPayload, LiveGroupStanding, RefreshStatus } from "./types";

export default function App() {
  const hasFixtures = fixtures.length > 0 && predictions.length > 0;
  const [selectedId, setSelectedId] = useState(predictions[0]?.id ?? "");
  const [activeView, setActiveView] = useState<AppView>("predictions");
  const [selectedTeamCode, setSelectedTeamCode] = useState(worldCup2026Teams[0].code);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationPayload | null>(null);
  const [liveStandings, setLiveStandings] = useState<LiveGroupStanding[] | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const apiAvailable = hasApiBaseUrl();
  const selectedPrediction = useMemo(
    () => predictions.find((prediction) => prediction.id === selectedId) ?? predictions[0],
    [selectedId],
  );

  const handleSelectTeam = (teamCode: string) => {
    setSelectedTeamCode(teamCode);
    setActiveView("team");
  };

  const loadBackendData = useCallback(async () => {
    if (!apiAvailable) return;
    try {
      const [status, evaluationPayload, standingsPayload] = await Promise.all([
        fetchRefreshStatus(),
        fetchEvaluation(),
        fetchStandings(),
      ]);
      setRefreshStatus(status);
      setEvaluation(evaluationPayload);
      setLiveStandings(standingsPayload);
      setApiConnected(Boolean(status));
    } catch (error) {
      console.error("Failed to load live data", error);
      setApiConnected(false);
      setRefreshState("error");
    }
  }, [apiAvailable]);

  const handleRefresh = useCallback(async () => {
    if (!apiAvailable) return;
    setRefreshState("loading");
    try {
      const status = await refreshWorldCupData();
      setRefreshStatus(status);
      const [evaluationPayload, standingsPayload] = await Promise.all([fetchEvaluation(), fetchStandings()]);
      setEvaluation(evaluationPayload);
      setLiveStandings(standingsPayload);
      setApiConnected(Boolean(status));
      setRefreshState("success");
    } catch (error) {
      console.error("Failed to refresh World Cup data", error);
      setApiConnected(false);
      setRefreshState("error");
    }
  }, [apiAvailable]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  useEffect(() => {
    if (!apiAvailable) return undefined;
    const intervalMinutes = Number(import.meta.env.VITE_DATA_REFRESH_INTERVAL_MINUTES ?? 15);
    const interval = window.setInterval(loadBackendData, Math.max(intervalMinutes, 1) * 60_000);
    return () => window.clearInterval(interval);
  }, [apiAvailable, loadBackendData]);

  return (
    <div className="app-shell">
      <Header
        activeView={activeView}
        apiAvailable={apiAvailable}
        apiConnected={apiConnected}
        lastUpdated={refreshStatus?.refreshed_at}
        onNavigate={setActiveView}
        onRefresh={handleRefresh}
        refreshDisabled={!apiAvailable || refreshState === "loading"}
        refreshStatus={refreshState}
      />
      {activeView === "predictions" ? (
        hasFixtures && selectedPrediction ? (
          <main className="dashboard-layout">
            <MatchSelector predictions={predictions} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="dashboard-main" key={selectedPrediction.id}>
              <DataSourceNotice />
              <MatchHero prediction={selectedPrediction} />
              <ProbabilityBar prediction={selectedPrediction} />
              <div className="two-column-band">
                <ExpectedGoalsComparison prediction={selectedPrediction} />
                <ScorelineList prediction={selectedPrediction} />
              </div>
              <GoalProbabilities prediction={selectedPrediction} />
              <TeamFormComparison prediction={selectedPrediction} />
              <PredictionExplanation prediction={selectedPrediction} />
              <ModelMetrics metrics={modelMetrics} calibration={calibrationBuckets} />
            </div>
          </main>
        ) : (
          <UnavailableState />
        )
      ) : null}
      {activeView === "groups" || activeView === "team" ? (
        <GroupsView
          matches={fixtures}
          liveStandings={liveStandings}
          onSelectTeam={handleSelectTeam}
          predictions={predictions}
          selectedTeamCode={selectedTeamCode}
          teams={worldCup2026Teams}
        />
      ) : null}
      {activeView === "model" || activeView === "backtesting" ? (
        <ModelView calibration={calibrationBuckets} metrics={modelMetrics} mode={activeView} />
      ) : null}
      {activeView === "performance" ? (
        <Performance apiAvailable={apiAvailable} evaluation={evaluation} predictions={predictions} />
      ) : null}
    </div>
  );
}

function DataSourceNotice() {
  return <div className="data-source">Fixture source: FIFA World Cup 2026 official schedule · verified static data</div>;
}

function UnavailableState() {
  return (
    <main className="model-page">
      <div className="page-kicker">Fixtures unavailable</div>
      <h2>Official fixture data could not be loaded</h2>
      <p className="page-intro">
        Predictions are unavailable until verified FIFA World Cup 2026 fixtures are restored. The app will not fall back
        to fake or generated matches.
      </p>
      {fixtureValidation.errors.length ? (
        <div className="validation-errors">
          {fixtureValidation.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </main>
  );
}
