import type { Prediction, TeamPrediction } from "../types";
import { getDisplayScoreline, getScorelineNote, percent } from "../utils";

interface MatchHeroProps {
  prediction: Prediction;
}

export function MatchHero({ prediction }: MatchHeroProps) {
  const displayScoreline = getDisplayScoreline(prediction);
  const scorelineNote = getScorelineNote(prediction);
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
          <span className="prediction-label">Predicted result</span>
          <strong>{displayScoreline}</strong>
          <p>{prediction.predictedOutcome}</p>
          <span className="confidence-line">Outcome probability {percent(prediction.confidence)}</span>
          {scorelineNote ? <small className="scoreline-note">{scorelineNote}</small> : null}
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
