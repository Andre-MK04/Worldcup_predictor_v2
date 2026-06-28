import { useMemo, useState } from "react";
import type { Prediction } from "../types";
import { getDisplayScoreline, percent } from "../utils";

interface MatchSelectorProps {
  predictions: Prediction[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function MatchSelector({ predictions, selectedId, onSelect }: MatchSelectorProps) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [group, setGroup] = useState("all");
  const [date, setDate] = useState("all");
  const stages = useMemo(() => Array.from(new Set(predictions.map((prediction) => prediction.stage))), [predictions]);
  const groups = useMemo(() => Array.from(new Set(predictions.map((prediction) => prediction.group))).sort(), [predictions]);
  const dates = useMemo(() => Array.from(new Set(predictions.map((prediction) => prediction.date))).sort(), [predictions]);
  const filteredPredictions = useMemo(
    () =>
      predictions.filter((prediction) => {
        const haystack = `${prediction.teamA.name} ${prediction.teamA.code} ${prediction.teamB.name} ${prediction.teamB.code}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (stage === "all" || prediction.stage === stage) &&
          (group === "all" || prediction.group === group) &&
          (date === "all" || prediction.date === date)
        );
      }),
    [date, group, predictions, query, stage],
  );

  return (
    <aside className="match-selector" id="matches">
      <div className="selector-heading">
        <span>Known matches</span>
        <strong>
          {filteredPredictions.length}/{predictions.length}
        </strong>
      </div>
      <div className="selector-filters">
        <input
          aria-label="Search country"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search country"
          type="search"
          value={query}
        />
        <select aria-label="Filter by stage" onChange={(event) => setStage(event.target.value)} value={stage}>
          <option value="all">All stages</option>
          {stages.map((item) => (
            <option key={item} value={item}>
              {formatStage(item)}
            </option>
          ))}
        </select>
        <select aria-label="Filter by group" onChange={(event) => setGroup(event.target.value)} value={group}>
          <option value="all">All groups</option>
          {groups.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select aria-label="Filter by date" onChange={(event) => setDate(event.target.value)} value={date}>
          <option value="all">All dates</option>
          {dates.map((item) => (
            <option key={item} value={item}>
              {formatShortDate(item)}
            </option>
          ))}
        </select>
      </div>
      <div className="selector-list">
        {filteredPredictions.map((prediction) => (
          <button
            className={prediction.id === selectedId ? "match-row active" : "match-row"}
            key={prediction.id}
            onClick={() => onSelect(prediction.id)}
            type="button"
          >
            <span className="match-date">{formatShortDate(prediction.date)}</span>
            <span className="match-teams">
              <strong>
                {prediction.teamA.code} <em>vs</em> {prediction.teamB.code}
              </strong>
              <small>
                {prediction.group} · {prediction.knockout?.advanceLabel ?? prediction.predictedOutcome} ·{" "}
                {getDisplayScoreline(prediction)}
              </small>
            </span>
            <span className="match-confidence">{percent(prediction.knockout?.advanceProbability ?? prediction.confidence)}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatStage(value: string) {
  if (value === "group") return "Group Stage";
  if (value === "round_of_32") return "Round of 32";
  if (value === "round_of_16") return "Round of 16";
  if (value === "quarter_final") return "Quarter-final";
  if (value === "semi_final") return "Semi-final";
  if (value === "third_place") return "Third place";
  if (value === "final") return "Final";
  return value;
}
