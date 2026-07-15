import { useMemo, useState } from "react";
import { AccuracyByGroupChart } from "../components/Performance/AccuracyByGroupChart";
import { AccuracyCharts } from "../components/Performance/AccuracyCharts";
import { ConfidenceAccuracyChart } from "../components/Performance/ConfidenceAccuracyChart";
import { MatchEvaluationTable } from "../components/Performance/MatchEvaluationTable";
import { PerformanceSummaryCards } from "../components/Performance/PerformanceSummaryCards";
import type { EvaluationPayload, MatchEvaluation, Prediction } from "../types";
import { getDisplayScoreline } from "../utils";

interface PerformanceProps {
  evaluation: EvaluationPayload | null;
  apiAvailable: boolean;
  predictions: Prediction[];
  onRecalculate?: () => void;
  recalculating?: boolean;
}

type CorrectnessFilter = "all" | "correct" | "incorrect" | "exact" | "top5";

export function Performance({ evaluation, apiAvailable, onRecalculate, predictions, recalculating }: PerformanceProps) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [country, setCountry] = useState("all");
  const [correctness, setCorrectness] = useState<CorrectnessFilter>("all");
  const [confidence, setConfidence] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const summary = evaluation?.summary;
  const matches = evaluation?.matches ?? [];
  const eligibleMatches = useMemo(() => matches.filter((match) => match.eligible_for_evaluation === "true"), [matches]);
  const ineligibleMatches = useMemo(() => matches.filter((match) => match.eligible_for_evaluation !== "true"), [matches]);
  const dashboardComparisons = useMemo(() => buildDashboardComparisons(matches, predictions), [matches, predictions]);
  const filteredDashboardComparisons = useMemo(
    () =>
      dashboardComparisons.filter((comparison) => {
        const match = comparison.match;
        const haystack = `${match.team_a} ${match.team_b}`.toLowerCase();
        const countryMatch = country === "all" || match.team_a === country || match.team_b === country;
        const groupMatch = group === "all" || match.group === group;
        const queryMatch = haystack.includes(query.toLowerCase());
        const fromMatch = !fromDate || match.date >= fromDate;
        const toMatch = !toDate || match.date <= toDate;
        const correctnessMatch =
          correctness === "all" ||
          (correctness === "correct" && comparison.resultCorrect === true) ||
          (correctness === "incorrect" && comparison.actualAvailable && comparison.resultCorrect === false) ||
          (correctness === "exact" && comparison.exactScorelineCorrect === true) ||
          (correctness === "top5" && comparison.actualScoreInTop5 === true);
        return groupMatch && countryMatch && queryMatch && fromMatch && toMatch && correctnessMatch;
      }),
    [correctness, country, dashboardComparisons, fromDate, group, query, toDate],
  );
  const filteredMatches = useMemo(
    () =>
      eligibleMatches.filter((match) => {
        const haystack = `${match.team_a} ${match.team_b}`.toLowerCase();
        const countryMatch = country === "all" || match.team_a === country || match.team_b === country;
        const groupMatch = group === "all" || match.group === group;
        const confidenceMatch = confidence === "all" || match.confidence_label === confidence;
        const queryMatch = haystack.includes(query.toLowerCase());
        const fromMatch = !fromDate || match.date >= fromDate;
        const toMatch = !toDate || match.date <= toDate;
        const correctnessMatch =
          correctness === "all" ||
          (correctness === "correct" && match.prediction_correct === "true") ||
          (correctness === "incorrect" && match.prediction_correct === "false") ||
          (correctness === "exact" && match.exact_scoreline_correct === "true") ||
          (correctness === "top5" && match.actual_score_in_top_5 === "true");
        return groupMatch && countryMatch && confidenceMatch && queryMatch && fromMatch && toMatch && correctnessMatch;
      }),
    [confidence, correctness, country, eligibleMatches, fromDate, group, query, toDate],
  );

  const dashboardCorrectResults = filteredDashboardComparisons.filter((comparison) => comparison.resultCorrect === true);
  const dashboardCorrectScorelines = filteredDashboardComparisons.filter((comparison) => comparison.exactScorelineCorrect === true);
  const groups = unique(dashboardComparisons.map((comparison) => comparison.match.group).filter(Boolean)).sort();
  const countries = unique(dashboardComparisons.flatMap((comparison) => [comparison.match.team_a, comparison.match.team_b])).sort();
  const confidenceLabels = unique(eligibleMatches.map((match) => match.confidence_label).filter(Boolean)).sort();

  return (
    <main className="model-page performance-page">
      <div className="performance-header">
        <div>
          <div className="page-kicker">Performance</div>
          <h2>Model Performance</h2>
          <p className="page-intro">
            See how the model's pre-match prediction snapshots performed against completed World Cup results. Matches
            without a valid pre-kickoff snapshot remain excluded from official accuracy statistics.
          </p>
        </div>
        <div className="performance-actions">
          <span>Last updated: {summary?.last_updated ? formatDateTime(summary.last_updated) : "Not available"}</span>
          <button disabled={!apiAvailable || recalculating} onClick={onRecalculate} type="button">
            {recalculating ? "Recalculating..." : "Recalculate performance"}
          </button>
        </div>
      </div>

      {!apiAvailable ? (
        <section className="section-block">
          <div className="section-heading">
            <span>Backend unavailable</span>
            <strong>Static mode</strong>
          </div>
          <p className="empty-note">
            Set `VITE_API_BASE_URL` to your FastAPI backend to load prediction snapshots, completed results and
            performance metrics.
          </p>
        </section>
      ) : null}

      <PerformanceSummaryCards summary={summary} />
      <DashboardPredictionSummary comparisons={dashboardComparisons} />
      <AccuracyCharts summary={summary} />
      <div className="performance-two-column">
        <ConfidenceAccuracyChart summary={summary} />
        <AccuracyByGroupChart summary={summary} />
      </div>

      <section className="section-block">
        <div className="section-heading">
          <span>Filters</span>
          <strong>
            {filteredDashboardComparisons.length} / {dashboardComparisons.length} tracked predictions
          </strong>
        </div>
        <div className="performance-filters">
          <input aria-label="Search by country" onChange={(event) => setQuery(event.target.value)} placeholder="Search country" type="search" value={query} />
          <select aria-label="Filter by group" onChange={(event) => setGroup(event.target.value)} value={group}>
            <option value="all">All groups</option>
            {groups.map((item) => (
              <option key={item} value={item}>
                {formatGroupFilterLabel(item)}
              </option>
            ))}
          </select>
          <select aria-label="Filter by country" onChange={(event) => setCountry(event.target.value)} value={country}>
            <option value="all">All countries</option>
            {countries.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select aria-label="Filter by correctness" onChange={(event) => setCorrectness(event.target.value as CorrectnessFilter)} value={correctness}>
            <option value="all">All evaluated</option>
            <option value="correct">Correct result only</option>
            <option value="incorrect">Incorrect result only</option>
            <option value="exact">Exact scoreline correct</option>
            <option value="top5">Actual score in top 5</option>
          </select>
          <select aria-label="Filter by confidence" onChange={(event) => setConfidence(event.target.value)} value={confidence}>
            <option value="all">All confidence labels</option>
            {confidenceLabels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <input aria-label="From date" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
          <input aria-label="To date" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
        </div>
      </section>

      <DashboardCorrectResultsList comparisons={dashboardCorrectResults} />
      <DashboardCorrectScorelinesList comparisons={dashboardCorrectScorelines} />
      <DashboardPredictionComparison comparisons={filteredDashboardComparisons} />
      <MatchEvaluationTable matches={filteredMatches} />

      {ineligibleMatches.length ? (
        <section className="section-block">
          <div className="section-heading">
            <span>Not eligible for evaluation</span>
            <strong>{ineligibleMatches.length}</strong>
          </div>
          <p className="empty-note">
            These completed matches are shown for transparency but are not counted because no valid pre-kickoff
            prediction snapshot exists.
          </p>
        </section>
      ) : null}
    </main>
  );
}

type DashboardComparison = {
  match: MatchEvaluation;
      prediction: Prediction;
      reversed: boolean;
      actualAvailable: boolean;
      predictedScoreline: string;
      actualScoreline: string;
      predictedResultLabel: string;
  resultCorrect: boolean | null;
  exactScorelineCorrect: boolean | null;
  actualScoreInTop5: boolean | null;
};

function DashboardPredictionSummary({ comparisons }: { comparisons: DashboardComparison[] }) {
  const scoredComparisons = comparisons.filter((comparison) => comparison.actualAvailable);
  const resultCorrect = scoredComparisons.filter((comparison) => comparison.resultCorrect).length;
  const exactCorrect = scoredComparisons.filter((comparison) => comparison.exactScorelineCorrect).length;
  const top5Hits = scoredComparisons.filter((comparison) => comparison.actualScoreInTop5).length;
  const total = scoredComparisons.length;
  return (
    <section className="section-block dashboard-comparison-section">
      <div className="section-heading">
        <span>Predictions tab comparison</span>
        <strong>
          {total} scored / {comparisons.length} tracked predictions
        </strong>
      </div>
      <p className="empty-note">
        This starts from every Predictions-tab match through the final. Matches without an imported actual
        score are shown as unavailable and are not counted in the percentages.
      </p>
      <div className="performance-summary-grid">
        <div className="metric-card performance-metric-card">
          <span>Dashboard result hits</span>
          <strong>
            {resultCorrect} / {total}
          </strong>
        </div>
        <div className="metric-card performance-metric-card">
          <span>Dashboard result accuracy</span>
          <strong>{formatPercent(total ? resultCorrect / total : null)}</strong>
        </div>
        <div className="metric-card performance-metric-card">
          <span>Dashboard exact scores</span>
          <strong>
            {exactCorrect} / {total}
          </strong>
        </div>
        <div className="metric-card performance-metric-card">
          <span>Dashboard scoreline accuracy</span>
          <strong>{formatPercent(total ? exactCorrect / total : null)}</strong>
        </div>
        <div className="metric-card performance-metric-card">
          <span>Dashboard top 5 hits</span>
          <strong>
            {top5Hits} / {total}
          </strong>
        </div>
      </div>
    </section>
  );
}

function DashboardCorrectResultsList({ comparisons }: { comparisons: DashboardComparison[] }) {
  return (
    <section className="section-block dashboard-comparison-section">
      <div className="section-heading">
        <span>Correct winner/result predictions</span>
        <strong>{comparisons.length}</strong>
      </div>
      {comparisons.length ? (
        <div className="performance-card-list">
          {comparisons.map((comparison) => (
            <article className="performance-result-card" key={comparison.match.match_id}>
              <div>
                <strong>
                  {comparison.match.team_a} {comparison.actualScoreline} {comparison.match.team_b}
                </strong>
                <span>Predicted winner/result: {formatResultForMatch(comparison.predictedResultLabel, comparison.match)}</span>
              </div>
              <p>
                Predicted scoreline: {comparison.predictedScoreline} · Probabilities: {formatDashboardProbabilities(comparison)}
              </p>
              <span className="status-chip success">Winner/result correct</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No correct winner/result predictions for the current filters.</p>
      )}
    </section>
  );
}

function DashboardCorrectScorelinesList({ comparisons }: { comparisons: DashboardComparison[] }) {
  return (
    <section className="section-block dashboard-comparison-section">
      <div className="section-heading">
        <span>Correctly predicted scorelines</span>
        <strong>{comparisons.length}</strong>
      </div>
      {comparisons.length ? (
        <div className="performance-card-list">
          {comparisons.map((comparison) => (
            <article className="performance-result-card exact" key={comparison.match.match_id}>
              <div>
                <strong>
                {comparison.match.team_a} {comparison.actualScoreline} {comparison.match.team_b}
                </strong>
                <span>Predicted exact scoreline: {comparison.predictedScoreline}</span>
              </div>
              <p>Top 5 scorelines: {formatPredictionTopScorelines(comparison)}</p>
              <span className="status-chip gold">Exact scoreline correct</span>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No correctly predicted exact scorelines for the current filters.</p>
      )}
    </section>
  );
}

function DashboardPredictionComparison({ comparisons }: { comparisons: DashboardComparison[] }) {
  return (
    <section className="section-block dashboard-comparison-section">
      <div className="section-heading">
        <span>Predictions tab vs actual results</span>
        <strong>{comparisons.length}</strong>
      </div>
      {comparisons.length ? (
        <div className="performance-card-list">
          {comparisons.map((comparison) => (
            <article
              className={`performance-result-card ${comparison.exactScorelineCorrect ? "exact" : ""}`}
              key={comparison.match.match_id}
            >
              <div>
                <strong>
                {comparison.match.team_a} {comparison.actualScoreline} {comparison.match.team_b}
                </strong>
                <span>
                  Prediction: {formatResultForMatch(comparison.predictedResultLabel, comparison.match)} ·{" "}
                  {comparison.predictedScoreline}
                </span>
              </div>
              <p>
                Probabilities: {formatDashboardProbabilities(comparison)} · Top scoreline set:{" "}
                {comparison.actualAvailable
                  ? comparison.actualScoreInTop5
                    ? "actual score included"
                    : "actual score missed"
                  : "actual score unavailable"}
              </p>
              <div className="performance-status-row">
                <span className={comparison.resultCorrect ? "status-chip success" : "status-chip muted"}>
                  {comparison.actualAvailable ? (comparison.resultCorrect ? "Result correct" : "Result wrong") : "Actual unavailable"}
                </span>
                <span className={comparison.exactScorelineCorrect ? "status-chip gold" : "status-chip muted"}>
                  {comparison.actualAvailable
                    ? comparison.exactScorelineCorrect
                      ? "Exact scoreline"
                      : "Exact missed"
                    : "Actual unavailable"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="empty-note">No completed matches could be matched to Predictions-tab output.</p>
      )}
    </section>
  );
}

function buildDashboardComparisons(matches: MatchEvaluation[], predictions: Prediction[]): DashboardComparison[] {
  const comparisons: DashboardComparison[] = [];
  predictions
    .filter((prediction) =>
      ["group", "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final"].includes(
        prediction.stage,
      ),
    )
    .forEach((prediction) => {
    const resultMatch = findResultForPrediction(prediction, matches);
    const match = buildComparisonMatch(prediction, resultMatch);
    const actualAvailable = Boolean(match.actual_scoreline || match.actual_score);
    const predictedScoreline = normalizeScoreline(getDisplayScoreline(prediction));
    const actualScoreline = actualAvailable ? normalizeScoreline(match.actual_scoreline || match.actual_score) : "Unavailable";
    const predictedResultLabel = outcomeFromScoreline(predictedScoreline);
    const topScorelines = prediction.topScorelines.map((scoreline) =>
      normalizeScoreline(scoreline.score),
    );
    comparisons.push({
      match,
      prediction,
      reversed: false,
      actualAvailable,
      predictedScoreline,
      actualScoreline,
      predictedResultLabel,
      resultCorrect: actualAvailable ? predictedResultLabel === match.actual_result_label : null,
      exactScorelineCorrect: actualAvailable ? predictedScoreline === actualScoreline : null,
      actualScoreInTop5: actualAvailable ? topScorelines.includes(actualScoreline) : null,
    });
  });
  return comparisons;
}

function findResultForPrediction(prediction: Prediction, matches: MatchEvaluation[]) {
  for (const match of matches) {
    const sameOrder = prediction.teamA.name === match.team_a && prediction.teamB.name === match.team_b;
    const reverseOrder = prediction.teamA.name === match.team_b && prediction.teamB.name === match.team_a;
    if (prediction.matchId === match.match_id || sameOrder || reverseOrder) {
      return { match, reversed: reverseOrder && !sameOrder };
    }
  }
  return undefined;
}

function buildComparisonMatch(
  prediction: Prediction,
  resultMatch?: { match: MatchEvaluation; reversed: boolean },
): MatchEvaluation {
  const base = resultMatch?.match;
  const actualScore = base && resultMatch.reversed ? invertScoreline(base.actual_scoreline || base.actual_score) : base?.actual_scoreline || base?.actual_score || "";
  const actualResult = base ? (resultMatch.reversed ? invertOutcome(base.actual_result_label) : base.actual_result_label) : "";
  return {
    match_id: prediction.matchId,
    date: base?.date || prediction.date,
    group: prediction.stage === "group" ? prediction.group.replace("Group ", "") : prediction.group,
    stage: prediction.stage,
    team_a: prediction.teamA.name,
    team_b: prediction.teamB.name,
    eligible_for_evaluation: base?.eligible_for_evaluation || "false",
    evaluation_status: base?.evaluation_status || "actual_result_unavailable",
    ineligibility_reason: base?.ineligibility_reason || "Actual result unavailable",
    actual_score: actualScore,
    actual_scoreline: actualScore,
    actual_result_label: actualResult,
    predicted_result_label: base?.predicted_result_label || "",
    predicted_winner_country: base?.predicted_winner_country || "",
    p_team_a_win: base?.p_team_a_win || "",
    p_draw: base?.p_draw || "",
    p_team_b_win: base?.p_team_b_win || "",
    prediction_correct: base?.prediction_correct || "",
    expected_goals_team_a: base?.expected_goals_team_a || "",
    expected_goals_team_b: base?.expected_goals_team_b || "",
    actual_goals_team_a: base?.actual_goals_team_a || "",
    actual_goals_team_b: base?.actual_goals_team_b || "",
    goal_error_team_a: base?.goal_error_team_a || "",
    goal_error_team_b: base?.goal_error_team_b || "",
    expected_total_goals: base?.expected_total_goals || "",
    actual_total_goals: base?.actual_total_goals || "",
    total_goals_error: base?.total_goals_error || "",
    most_likely_single_scoreline: base?.most_likely_single_scoreline || "",
    exact_scoreline_correct: base?.exact_scoreline_correct || "",
    top_5_scorelines: base?.top_5_scorelines || "",
    actual_score_in_top_3: base?.actual_score_in_top_3 || "",
    actual_score_in_top_5: base?.actual_score_in_top_5 || "",
    predicted_over_2_5: base?.predicted_over_2_5 || "",
    actual_over_2_5: base?.actual_over_2_5 || "",
    over_2_5_correct: base?.over_2_5_correct || "",
    predicted_btts: base?.predicted_btts || "",
    actual_btts: base?.actual_btts || "",
    btts_correct: base?.btts_correct || "",
    confidence_label: base?.confidence_label || "",
    snapshot_used_at: base?.snapshot_used_at || "",
  };
}

function normalizeScoreline(value: string) {
  return value.replace("–", "-").replace(/\s/g, "");
}

function outcomeFromScoreline(value: string) {
  const [left, right] = normalizeScoreline(value).split("-").map((item) => Number(item));
  if (!Number.isFinite(left) || !Number.isFinite(right)) return "draw";
  if (left > right) return "team_a_win";
  if (right > left) return "team_b_win";
  return "draw";
}

function invertOutcome(value: string) {
  if (value === "team_a_win") return "team_b_win";
  if (value === "team_b_win") return "team_a_win";
  return value;
}

function invertScoreline(value: string) {
  const normalized = normalizeScoreline(value);
  const [left, right] = normalized.split("-");
  if (left === undefined || right === undefined) return value;
  return `${right}-${left}`;
}

function formatResultForMatch(value: string, match: MatchEvaluation) {
  if (value === "team_a_win") return `${match.team_a} win`;
  if (value === "team_b_win") return `${match.team_b} win`;
  if (value === "draw") return "Draw";
  return "Unavailable";
}

function formatGroupFilterLabel(value: string) {
  if (/^[A-L]$/.test(value)) return `Group ${value}`;
  return value;
}

function formatDashboardProbabilities(comparison: DashboardComparison) {
  const a = comparison.reversed ? comparison.prediction.probabilities.teamBWin : comparison.prediction.probabilities.teamAWin;
  const b = comparison.reversed ? comparison.prediction.probabilities.teamAWin : comparison.prediction.probabilities.teamBWin;
  return `${comparison.match.team_a} ${formatPercent(a)}, Draw ${formatPercent(comparison.prediction.probabilities.draw)}, ${comparison.match.team_b} ${formatPercent(b)}`;
}

function formatPredictionTopScorelines(comparison: DashboardComparison) {
  return comparison.prediction.topScorelines
    .slice(0, 5)
    .map((scoreline) => normalizeScoreline(comparison.reversed ? invertScoreline(scoreline.score) : scoreline.score))
    .join(", ");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}
