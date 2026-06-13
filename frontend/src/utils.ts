import type { GroupStanding, Prediction, Team, WorldCupMatch } from "./types";

export function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function getDisplayScoreline(prediction: Prediction) {
  if (!prediction.recommendedScore) return prediction.topScorelines[0]?.score ?? "";
  const rawTopScore = prediction.topScorelines[0]?.score;
  if (rawTopScore && prediction.recommendedScore !== rawTopScore && import.meta.env.DEV) {
    console.warn(
      `Recommended score differs from raw top exact score for ${prediction.id}: recommended ${prediction.recommendedScore}, raw top ${rawTopScore}`,
    );
  }
  return prediction.recommendedScore;
}

export function getScorelineNote(prediction: Prediction) {
  const rawTopScore = prediction.topScorelines[0]?.score;
  if (!rawTopScore || prediction.recommendedScore === rawTopScore) return undefined;
  return `Raw most likely exact score is ${rawTopScore}. Headline score is the most likely ${prediction.predictedOutcome.toLowerCase()} scoreline.`;
}

export function calculateGroupStandings(matches: WorldCupMatch[], teams: Team[]) {
  const standings = teams.reduce<Record<string, GroupStanding[]>>((groups, team) => {
    groups[team.group] = groups[team.group] ?? [];
    groups[team.group].push({
      team,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
    return groups;
  }, {});

  const standingByCode = new Map<string, GroupStanding>();
  Object.values(standings).forEach((groupRows) => {
    groupRows.forEach((row) => standingByCode.set(row.team.code, row));
  });

  matches.forEach((match) => {
    if (match.status !== "completed" || !match.score) return;
    const teamA = standingByCode.get(match.homeTeam.code);
    const teamB = standingByCode.get(match.awayTeam.code);
    if (!teamA || !teamB) return;
    applyResult(teamA, match.score.home, match.score.away);
    applyResult(teamB, match.score.away, match.score.home);
  });

  Object.values(standings).forEach((groupRows) => {
    groupRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.team.name.localeCompare(b.team.name);
    });
  });

  return standings;
}

export function getTeamMatches(teamCode: string, matches: WorldCupMatch[]) {
  return matches.filter((match) => match.homeTeam.code === teamCode || match.awayTeam.code === teamCode);
}

export function getPastMatches(teamCode: string, matches: WorldCupMatch[]) {
  return getTeamMatches(teamCode, matches).filter((match) => match.status === "completed" && match.score);
}

export function getUpcomingMatches(teamCode: string, matches: WorldCupMatch[]) {
  return getTeamMatches(teamCode, matches).filter((match) => match.status !== "completed");
}

export function getTeamPredictions(teamCode: string, predictions: Prediction[]) {
  return predictions.filter((prediction) => prediction.teamA.code === teamCode || prediction.teamB.code === teamCode);
}

function applyResult(row: GroupStanding, goalsFor: number, goalsAgainst: number) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (goalsFor > goalsAgainst) {
    row.wins += 1;
    row.points += 3;
  } else if (goalsFor === goalsAgainst) {
    row.draws += 1;
    row.points += 1;
  } else {
    row.losses += 1;
  }
}
