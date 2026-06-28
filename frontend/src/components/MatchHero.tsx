import type { Prediction, TeamPrediction } from "../types";
import { getDisplayScoreline, getScorelineNote, percent } from "../utils";

interface MatchHeroProps {
  prediction: Prediction;
}

export function MatchHero({ prediction }: MatchHeroProps) {
  const displayScoreline = getDisplayScoreline(prediction);
  const scorelineNote = getScorelineNote(prediction);
  const isKnockout = Boolean(prediction.knockout);
  const isDrawScoreline = prediction.scoreOutcome === "draw";
  return (
    <section className="match-hero" id="predictions">
      <div className="match-meta">
        <span>{prediction.group}</span>
        <span>{formatDate(prediction.date)}</span>
        <span>{prediction.venue}</span>
      </div>
      <div className="hero-grid">
        <HeroTeam team={prediction.teamA} align="left" />
        <div className="score-panel">
          <span className="prediction-label">{isKnockout ? "Predicted to advance" : "Predicted result"}</span>
          <strong>{displayScoreline}</strong>
          <p>{prediction.knockout?.advanceLabel ?? prediction.predictedOutcome}</p>
          <span className="confidence-line">
            {isKnockout
              ? `Advance probability ${percent(prediction.knockout?.advanceProbability ?? prediction.confidence)}`
              : `Outcome probability ${percent(prediction.confidence)}`}
          </span>
          {isKnockout && isDrawScoreline ? (
            <small className="scoreline-note">
              Most likely 90-minute scoreline: {displayScoreline}. Advancement prediction includes extra time/penalty likelihood.
            </small>
          ) : scorelineNote ? (
            <small className="scoreline-note">{scorelineNote}</small>
          ) : null}
        </div>
        <HeroTeam team={prediction.teamB} align="right" />
      </div>
    </section>
  );
}

function HeroTeam({ team, align }: { team: TeamPrediction; align: "left" | "right" }) {
  return (
    <div className={`hero-team ${align}`}>
      <span className="team-code">{team.code}</span>
      <span className="team-flag" aria-hidden="true">
        {team.flag}
      </span>
      <h2>{team.name}</h2>
      <p>xG {team.expectedGoals.toFixed(2)}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}
