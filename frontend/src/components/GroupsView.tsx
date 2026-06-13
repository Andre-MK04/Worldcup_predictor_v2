import type { GroupStanding, Prediction, Team, WorldCupMatch } from "../types";
import { calculateGroupStandings } from "../utils";

interface GroupsViewProps {
  matches: WorldCupMatch[];
  teams: Team[];
  predictions: Prediction[];
  selectedTeamCode?: string;
  onSelectTeam: (teamCode: string) => void;
}

export function GroupsView({ matches, teams, predictions, selectedTeamCode, onSelectTeam }: GroupsViewProps) {
  const standings = calculateGroupStandings(matches, teams);
  const groups = Object.keys(standings).sort();
  const selectedTeam = selectedTeamCode ? teams.find((team) => team.code === selectedTeamCode) : undefined;
  const selectedStanding = selectedTeam
    ? standings[selectedTeam.group]?.find((row) => row.team.code === selectedTeam.code)
    : undefined;

  return (
    <main className="groups-layout">
      <section className="groups-main">
        <div className="page-kicker">World Cup groups</div>
        <h2>Group standings, fixtures and team paths</h2>
        <p className="page-intro">
          Tables use completed matches only. Future fixtures remain in the prediction layer until a result is available.
        </p>
        <div className="group-table-stack">
          {groups.map((group) => (
            <GroupTable
              group={group}
              key={group}
              onSelectTeam={onSelectTeam}
              rows={standings[group]}
              selectedTeamCode={selectedTeamCode}
            />
          ))}
        </div>
      </section>
      <TeamDetail
        matches={matches}
        points={selectedStanding?.points ?? 0}
        predictions={predictions}
        team={selectedTeam ?? teams[0]}
      />
    </main>
  );
}

function GroupTable({
  group,
  rows,
  selectedTeamCode,
  onSelectTeam,
}: {
  group: string;
  rows: GroupStanding[];
  selectedTeamCode?: string;
  onSelectTeam: (teamCode: string) => void;
}) {
  return (
    <section className="group-table-section">
      <div className="group-title">
        <span>Group {group}</span>
        <strong>{rows.length} teams</strong>
      </div>
      <div className="standings-table">
        <div className="standings-row standings-head">
          <span>Team</span>
          <span>P</span>
          <span>W</span>
          <span>D</span>
          <span>L</span>
          <span>GF</span>
          <span>GA</span>
          <span>GD</span>
          <span>Pts</span>
        </div>
        {rows.map((row) => (
          <button
            className={row.team.code === selectedTeamCode ? "standings-row active" : "standings-row"}
            key={row.team.code}
            onClick={() => onSelectTeam(row.team.code)}
            type="button"
          >
            <span className="standings-team">
              <em>{row.team.flag}</em>
              <strong>{row.team.name}</strong>
              <small>{row.team.code}</small>
            </span>
            <span>{row.played}</span>
            <span>{row.wins}</span>
            <span>{row.draws}</span>
            <span>{row.losses}</span>
            <span>{row.goalsFor}</span>
            <span>{row.goalsAgainst}</span>
            <span>{row.goalDifference}</span>
            <span>{row.points}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TeamDetail({
  team,
  matches,
  predictions,
  points,
}: {
  team: Team;
  matches: WorldCupMatch[];
  predictions: Prediction[];
  points: number;
}) {
  const teamMatches = matches.filter((match) => match.homeTeam.code === team.code || match.awayTeam.code === team.code);
  const teamPredictions = predictions.filter(
    (prediction) => prediction.teamA.code === team.code || prediction.teamB.code === team.code,
  );
  const upcoming = teamMatches.filter((match) => match.status !== "completed");

  return (
    <aside className="team-detail-panel">
      <div className="team-detail-header">
        <span className="team-detail-flag">{team.flag}</span>
        <div>
          <span className="page-kicker">Team detail</span>
          <h3>{team.name}</h3>
          <p>
            {team.code} · Group {team.group} · FIFA #{team.fifaRanking} · Elo {team.eloRating} · {points} pts
          </p>
        </div>
      </div>
      <section className="detail-block">
        <div className="section-heading">
          <span>Fixtures</span>
          <strong>{teamMatches.length}</strong>
        </div>
        <div className="fixture-list">
          {teamMatches.map((match) => {
            const opponentCode = match.homeTeam.code === team.code ? match.awayTeam.code : match.homeTeam.code;
            const prediction = teamPredictions.find((item) => item.matchId === match.id);
            const score = match.status === "completed" ? match.score : undefined;
            return (
              <div className="fixture-row" key={match.id}>
                <span>{formatShortDate(match.date)}</span>
                <strong>vs {opponentCode}</strong>
                <em>{score ? `${score.home}–${score.away}` : prediction?.predictedOutcome ?? "Prediction unavailable"}</em>
              </div>
            );
          })}
        </div>
      </section>
      <section className="detail-block">
        <div className="section-heading">
          <span>Recent performance</span>
          <strong>{team.recentForm.join("-")}</strong>
        </div>
        <div className="team-stat-grid">
          <Stat label="Goals L5" value={team.stats.goalsScoredLast5} />
          <Stat label="Conceded L5" value={team.stats.goalsConcededLast5} />
          <Stat label="Goals L10" value={team.stats.goalsScoredLast10} />
          <Stat label="Conceded L10" value={team.stats.goalsConcededLast10} />
          <Stat label="Avg GF" value={team.stats.averageGoalsScored.toFixed(2)} />
          <Stat label="Avg GA" value={team.stats.averageGoalsConceded.toFixed(2)} />
          <Stat label="xG L10" value={team.stats.xgLast10.toFixed(2)} />
          <Stat label="xGA L10" value={team.stats.xgAgainstLast10.toFixed(2)} />
        </div>
      </section>
      <section className="detail-block">
        <div className="section-heading">
          <span>Present lineup</span>
          <strong>{team.lineup.available ? team.lineup.formation : "Pending"}</strong>
        </div>
        {team.lineup.available ? (
          <p>{team.lineup.players.join(", ")}</p>
        ) : (
          <p className="empty-note">Lineup data not available yet.</p>
        )}
      </section>
      <section className="detail-block">
        <div className="section-heading">
          <span>Team analytics</span>
          <strong>{upcoming.length} upcoming</strong>
        </div>
        <AnalyticsBar label="Attacking strength" value={team.stats.attackingStrength} max={1.5} />
        <AnalyticsBar label="Defensive strength" value={team.stats.defensiveStrength} max={1.5} />
        <AnalyticsBar label="Recent form rating" value={team.stats.recentFormRating} max={1} />
      </section>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnalyticsBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div className="analytics-bar">
      <span>{label}</span>
      <div>
        <span style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
      </div>
      <strong>{value.toFixed(2)}</strong>
    </div>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}
