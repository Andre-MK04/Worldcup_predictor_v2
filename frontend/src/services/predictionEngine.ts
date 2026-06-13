import type { FixturePredictionResult, PredictionOutcome, Team, WorldCupFixture } from "../types";

const MIN_EXPECTED_GOALS = 0.2;
const MAX_EXPECTED_GOALS = 4.5;
const MAX_SCORELINE_GOALS = 7;
const NEUTRAL_OPPONENT_ELO = 1700;
const NEUTRAL_OPPONENT_FIFA_RANKING = 40;

type TeamScores = {
  attack: number;
  defenseConceding: number;
  attackLast10: number;
  defenseLast10: number;
  opponentStrength: number;
};

type QualityAdjustments = {
  home: number;
  away: number;
  eloDifference: number | null;
  fifaRankingDifference: number | null;
};

export function predictFixture(fixture: WorldCupFixture, homeTeam: Team, awayTeam: Team): FixturePredictionResult {
  const homeScores = calculateTeamScores(homeTeam);
  const awayScores = calculateTeamScores(awayTeam);
  const qualityAdjustments = calculateQualityAdjustments(homeTeam, awayTeam);

  // Expected goals combine a team's own attacking production with how much the
  // opponent usually concedes, then tilt that projection by both Elo and FIFA rank.
  const homeExpectedGoals = clamp(
    (homeScores.attack * 0.62 + awayScores.defenseConceding * 0.38) * qualityAdjustments.home,
  );
  const awayExpectedGoals = clamp(
    (awayScores.attack * 0.62 + homeScores.defenseConceding * 0.38) * qualityAdjustments.away,
  );
  const scorelines = generateScorelineMatrix(homeExpectedGoals, awayExpectedGoals);
  const probabilities = calculateOutcomeProbabilities(scorelines);
  const topScorelines = [...scorelines].sort((a, b) => b.probability - a.probability).slice(0, 5);
  const overallOutcome = maxOutcome(probabilities);
  const headlineOutcome = selectHeadlineOutcome(probabilities, homeExpectedGoals, awayExpectedGoals, overallOutcome);

  // Pick a representative scoreline for the headline outcome. Exact-score
  // probability alone overuses common football scores, so the headline also
  // tracks projected total goals and expected margin.
  const selectedScoreline = representativeScorelineForOutcome(
    scorelines,
    headlineOutcome,
    homeExpectedGoals,
    awayExpectedGoals,
  );
  const outcomeLabel = getOutcomeLabel(headlineOutcome, homeTeam.name, awayTeam.name);

  const result: FixturePredictionResult = {
    fixtureId: fixture.id,
    expectedGoals: {
      home: round(homeExpectedGoals, 3),
      away: round(awayExpectedGoals, 3),
    },
    predictedScore: {
      home: selectedScoreline.home,
      away: selectedScoreline.away,
    },
    outcome: headlineOutcome,
    outcomeLabel,
    probabilities,
    topScorelines,
    goalProbabilities: calculateGoalProbabilities(scorelines),
    explanation: buildExplanation(
      homeTeam,
      awayTeam,
      homeScores,
      awayScores,
      homeExpectedGoals,
      awayExpectedGoals,
      probabilities,
      headlineOutcome,
      overallOutcome,
      qualityAdjustments,
    ),
  };

  if (isDevMode()) {
    logPredictionDebug(fixture, homeTeam, awayTeam, homeScores, awayScores, qualityAdjustments, result);
  }

  return result;
}

export function getOutcomeFromScore(homeGoals: number, awayGoals: number): PredictionOutcome {
  if (homeGoals > awayGoals) return "home_win";
  if (awayGoals > homeGoals) return "away_win";
  return "draw";
}

export function getOutcomeLabel(outcome: PredictionOutcome, homeName: string, awayName: string) {
  if (outcome === "home_win") return `${homeName} win`;
  if (outcome === "away_win") return `${awayName} win`;
  return "Draw";
}

export function poissonProbability(expectedGoals: number, goals: number) {
  return (Math.exp(-expectedGoals) * expectedGoals ** goals) / factorial(goals);
}

function calculateTeamScores(team: Team): TeamScores {
  const attackLast10 = team.stats.goalsScoredLast10 / 10;
  const defenseLast10 = team.stats.goalsConcededLast10 / 10;
  const attackLast5 = team.stats.goalsScoredLast5 / 5;
  const defenseLast5 = team.stats.goalsConcededLast5 / 5;
  const opponentStrength = calculateRecentOpponentStrength(team);

  // Last 10 gives the stable baseline; last 5 nudges the number toward recent form
  // without letting a short streak dominate the prediction.
  const goalsAttackScore = attackLast10 * 0.7 + attackLast5 * 0.3;
  const goalsDefenseConceding = defenseLast10 * 0.7 + defenseLast5 * 0.3;

  // xG is optional. When available, blend it with goal production; otherwise
  // fall back to scored/conceded goals only.
  const baseAttack = Number.isFinite(team.stats.xgLast10)
    ? goalsAttackScore * 0.5 + team.stats.xgLast10 * 0.5
    : goalsAttackScore;
  const baseDefenseConceding = Number.isFinite(team.stats.xgAgainstLast10)
    ? goalsDefenseConceding * 0.5 + team.stats.xgAgainstLast10 * 0.5
    : goalsDefenseConceding;

  return {
    attack: baseAttack * opponentStrength,
    defenseConceding: baseDefenseConceding / Math.max(0.88, opponentStrength),
    attackLast10,
    defenseLast10,
    opponentStrength,
  };
}

function calculateRecentOpponentStrength(team: Team) {
  const opponentElo = Number.isFinite(team.stats.averageOpponentEloLast10)
    ? team.stats.averageOpponentEloLast10
    : NEUTRAL_OPPONENT_ELO;
  const opponentRanking = Number.isFinite(team.stats.averageOpponentFifaRankingLast10)
    ? team.stats.averageOpponentFifaRankingLast10
    : NEUTRAL_OPPONENT_FIFA_RANKING;
  const eloComponent = clampRange((opponentElo - NEUTRAL_OPPONENT_ELO) / 450, -0.45, 0.45);
  const rankingComponent = clampRange((NEUTRAL_OPPONENT_FIFA_RANKING - opponentRanking) / 65, -0.45, 0.45);

  return clampRange(1 + (eloComponent * 0.65 + rankingComponent * 0.35) * 0.18, 0.9, 1.12);
}

function calculateQualityAdjustments(homeTeam: Team, awayTeam: Team): QualityAdjustments {
  const eloDifference =
    Number.isFinite(homeTeam.eloRating) && Number.isFinite(awayTeam.eloRating)
      ? homeTeam.eloRating - awayTeam.eloRating
      : null;
  // FIFA ranks are ordinal: a smaller number is better, so a positive difference favors the home team.
  const fifaRankingDifference =
    Number.isFinite(homeTeam.fifaRanking) && Number.isFinite(awayTeam.fifaRanking)
      ? awayTeam.fifaRanking - homeTeam.fifaRanking
      : null;
  const eloAdjustment = eloDifference === null ? 0 : clampRange(eloDifference / 3600, -0.18, 0.18);
  const rankingAdjustment = fifaRankingDifference === null ? 0 : calculateFifaRankingAdjustment(fifaRankingDifference);
  const combinedAdjustment = clampRange(eloAdjustment + rankingAdjustment, -0.38, 0.38);

  return {
    home: clampRange(1 + combinedAdjustment, 0.62, 1.45),
    away: clampRange(1 - combinedAdjustment, 0.62, 1.45),
    eloDifference,
    fifaRankingDifference,
  };
}

function calculateFifaRankingAdjustment(fifaRankingDifference: number) {
  const direction = Math.sign(fifaRankingDifference);
  const rankingGap = Math.abs(fifaRankingDifference);
  const baseRankingEffect = rankingGap / 360;
  const largeGapBonus = Math.max(0, rankingGap - 30) / 430;

  return direction * clampRange(baseRankingEffect + largeGapBonus, 0, 0.27);
}

function generateScorelineMatrix(homeExpectedGoals: number, awayExpectedGoals: number) {
  const scorelines: Array<{ home: number; away: number; probability: number }> = [];
  // Poisson approximates football score probabilities from each team's expected goals.
  for (let home = 0; home <= MAX_SCORELINE_GOALS; home += 1) {
    for (let away = 0; away <= MAX_SCORELINE_GOALS; away += 1) {
      scorelines.push({
        home,
        away,
        probability: poissonProbability(homeExpectedGoals, home) * poissonProbability(awayExpectedGoals, away),
      });
    }
  }
  const total = scorelines.reduce((sum, scoreline) => sum + scoreline.probability, 0);
  return scorelines.map((scoreline) => ({ ...scoreline, probability: scoreline.probability / total }));
}

function representativeScorelineForOutcome(
  scorelines: Array<{ home: number; away: number; probability: number }>,
  outcome: PredictionOutcome,
  homeExpectedGoals: number,
  awayExpectedGoals: number,
) {
  return [...scorelines]
    .filter((scoreline) => getOutcomeFromScore(scoreline.home, scoreline.away) === outcome)
    .sort(
      (a, b) =>
        scoreRepresentativeScoreline(b, homeExpectedGoals, awayExpectedGoals) -
        scoreRepresentativeScoreline(a, homeExpectedGoals, awayExpectedGoals),
    )[0];
}

function scoreRepresentativeScoreline(
  scoreline: { home: number; away: number; probability: number },
  homeExpectedGoals: number,
  awayExpectedGoals: number,
) {
  const expectedTotal = homeExpectedGoals + awayExpectedGoals;
  const expectedMargin = homeExpectedGoals - awayExpectedGoals;
  const scoreTotal = scoreline.home + scoreline.away;
  const scoreMargin = scoreline.home - scoreline.away;
  const targetHomeGoals = targetGoalsFromExpected(homeExpectedGoals);
  const targetAwayGoals = targetGoalsFromExpected(awayExpectedGoals);
  const probabilityScore = Math.log(scoreline.probability + Number.EPSILON);
  const targetPenalty = Math.abs(scoreline.home - targetHomeGoals) * 0.5 + Math.abs(scoreline.away - targetAwayGoals) * 0.5;
  const goalShapePenalty =
    Math.abs(scoreline.home - homeExpectedGoals) * 0.42 + Math.abs(scoreline.away - awayExpectedGoals) * 0.42;
  const totalPenalty = Math.abs(scoreTotal - expectedTotal) * 0.34;
  const marginPenalty = Math.abs(scoreMargin - expectedMargin) * 0.42;
  const lowScoringSidePenalty =
    (homeExpectedGoals < 0.8 && scoreline.home > 1 ? (scoreline.home - 1) * 0.35 : 0) +
    (awayExpectedGoals < 0.8 && scoreline.away > 1 ? (scoreline.away - 1) * 0.35 : 0);
  const cleanSheetFitBonus =
    (homeExpectedGoals < 1.05 && scoreline.home === 0 ? 0.34 : 0) +
    (awayExpectedGoals < 1.05 && scoreline.away === 0 ? 0.34 : 0);

  return (
    probabilityScore -
    targetPenalty -
    goalShapePenalty -
    totalPenalty -
    marginPenalty -
    lowScoringSidePenalty +
    cleanSheetFitBonus
  );
}

function calculateOutcomeProbabilities(scorelines: Array<{ home: number; away: number; probability: number }>) {
  const probabilities = scorelines.reduce(
    (totals, scoreline) => {
      const outcome = getOutcomeFromScore(scoreline.home, scoreline.away);
      if (outcome === "home_win") totals.homeWin += scoreline.probability;
      if (outcome === "draw") totals.draw += scoreline.probability;
      if (outcome === "away_win") totals.awayWin += scoreline.probability;
      return totals;
    },
    { homeWin: 0, draw: 0, awayWin: 0 },
  );
  const total = probabilities.homeWin + probabilities.draw + probabilities.awayWin;
  return {
    homeWin: probabilities.homeWin / total,
    draw: probabilities.draw / total,
    awayWin: probabilities.awayWin / total,
  };
}

function calculateGoalProbabilities(scorelines: Array<{ home: number; away: number; probability: number }>) {
  return scorelines.reduce(
    (totals, scoreline) => {
      const totalGoals = scoreline.home + scoreline.away;
      if (totalGoals > 1.5) totals.over15 += scoreline.probability;
      if (totalGoals > 2.5) totals.over25 += scoreline.probability;
      if (totalGoals > 3.5) totals.over35 += scoreline.probability;
      if (scoreline.home > 0 && scoreline.away > 0) totals.bothTeamsToScore += scoreline.probability;
      return totals;
    },
    { over15: 0, over25: 0, over35: 0, bothTeamsToScore: 0 },
  );
}

function maxOutcome(probabilities: { homeWin: number; draw: number; awayWin: number }): PredictionOutcome {
  if (probabilities.homeWin >= probabilities.draw && probabilities.homeWin >= probabilities.awayWin) return "home_win";
  if (probabilities.awayWin >= probabilities.draw && probabilities.awayWin >= probabilities.homeWin) return "away_win";
  return "draw";
}

function selectHeadlineOutcome(
  probabilities: { homeWin: number; draw: number; awayWin: number },
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  overallOutcome: PredictionOutcome,
): PredictionOutcome {
  const targetOutcome = getOutcomeFromScore(
    targetGoalsFromExpected(homeExpectedGoals),
    targetGoalsFromExpected(awayExpectedGoals),
  );
  if (targetOutcome === overallOutcome) return overallOutcome;

  const overallProbability = probabilityForOutcome(overallOutcome, probabilities);
  const targetProbability = probabilityForOutcome(targetOutcome, probabilities);
  const expectedMargin = Math.abs(homeExpectedGoals - awayExpectedGoals);

  if (targetOutcome === "draw" && expectedMargin < 0.28 && targetProbability >= overallProbability - 0.18) {
    return "draw";
  }

  if (targetOutcome !== "draw" && targetProbability >= overallProbability - 0.08) {
    return targetOutcome;
  }

  return overallOutcome;
}

function probabilityForOutcome(
  outcome: PredictionOutcome,
  probabilities: { homeWin: number; draw: number; awayWin: number },
) {
  if (outcome === "home_win") return probabilities.homeWin;
  if (outcome === "away_win") return probabilities.awayWin;
  return probabilities.draw;
}

function buildExplanation(
  homeTeam: Team,
  awayTeam: Team,
  homeScores: TeamScores,
  awayScores: TeamScores,
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  probabilities: { homeWin: number; draw: number; awayWin: number },
  selectedOutcome: PredictionOutcome,
  overallOutcome: PredictionOutcome,
  qualityAdjustments: QualityAdjustments,
) {
  const selectedLabel = getOutcomeLabel(selectedOutcome, homeTeam.name, awayTeam.name);
  const overallLabel = getOutcomeLabel(overallOutcome, homeTeam.name, awayTeam.name);
  const ratingContext =
    qualityAdjustments.eloDifference !== null || qualityAdjustments.fifaRankingDifference !== null
      ? `Team quality adjusts the projection from Elo (${formatSignedNumber(qualityAdjustments.eloDifference)}) and FIFA ranking edge (${formatSignedNumber(qualityAdjustments.fifaRankingDifference)}).`
      : "No team-strength adjustment was available.";
  const base = `${homeTeam.name} projects for ${homeExpectedGoals.toFixed(2)} expected goals and ${awayTeam.name} projects for ${awayExpectedGoals.toFixed(2)}, using recent scoring, conceding, opponent strength, Elo and FIFA ranking. ${ratingContext}`;
  const attackContext = `${homeTeam.code} scored ${homeScores.attackLast10.toFixed(2)} per match over the last 10 against ${homeScores.opponentStrength >= 1 ? "stronger" : "weaker"} recent opposition, while ${awayTeam.code} scored ${awayScores.attackLast10.toFixed(2)} against ${awayScores.opponentStrength >= 1 ? "stronger" : "weaker"} recent opposition.`;
  const outcomeContext =
    selectedOutcome === overallOutcome
      ? `The headline score and overall outcome both point to ${selectedLabel}.`
      : `The exact-score headline points to ${selectedLabel}, while summed scoreline probabilities make ${overallLabel} the most likely overall outcome.`;
  return `${base} ${attackContext} ${outcomeContext} Home win ${Math.round(probabilities.homeWin * 100)}%, draw ${Math.round(probabilities.draw * 100)}%, away win ${Math.round(probabilities.awayWin * 100)}%.`;
}

function logPredictionDebug(
  fixture: WorldCupFixture,
  homeTeam: Team,
  awayTeam: Team,
  homeScores: TeamScores,
  awayScores: TeamScores,
  qualityAdjustments: QualityAdjustments,
  prediction: FixturePredictionResult,
) {
  console.debug("[prediction]", {
    fixtureId: fixture.id,
    home: homeTeam.code,
    away: awayTeam.code,
    homeGoalsScoredLast10: homeTeam.stats.goalsScoredLast10,
    homeGoalsConcededLast10: homeTeam.stats.goalsConcededLast10,
    awayGoalsScoredLast10: awayTeam.stats.goalsScoredLast10,
    awayGoalsConcededLast10: awayTeam.stats.goalsConcededLast10,
    homeAttackScore: homeScores.attack,
    awayAttackScore: awayScores.attack,
    homeOpponentStrength: homeScores.opponentStrength,
    awayOpponentStrength: awayScores.opponentStrength,
    eloDifference: qualityAdjustments.eloDifference,
    fifaRankingDifference: qualityAdjustments.fifaRankingDifference,
    homeQualityAdjustment: qualityAdjustments.home,
    awayQualityAdjustment: qualityAdjustments.away,
    homeExpectedGoals: prediction.expectedGoals.home,
    awayExpectedGoals: prediction.expectedGoals.away,
    top5Scorelines: prediction.topScorelines,
    homeWinProbability: prediction.probabilities.homeWin,
    drawProbability: prediction.probabilities.draw,
    awayWinProbability: prediction.probabilities.awayWin,
    finalSelectedScoreline: prediction.predictedScore,
    finalSelectedOutcome: prediction.outcome,
  });
}

function clamp(value: number) {
  return Math.max(MIN_EXPECTED_GOALS, Math.min(MAX_EXPECTED_GOALS, value));
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function targetGoalsFromExpected(expectedGoals: number) {
  if (expectedGoals < 0.85) return 0;
  if (expectedGoals < 1.55) return 1;
  if (expectedGoals < 2.35) return 2;
  if (expectedGoals < 3.25) return 3;
  if (expectedGoals < 4.15) return 4;
  return 5;
}

function factorial(value: number): number {
  if (value <= 1) return 1;
  return value * factorial(value - 1);
}

function round(value: number, places: number) {
  return Number(value.toFixed(places));
}

function formatSignedNumber(value: number | null) {
  if (value === null) return "n/a";
  if (value > 0) return `+${Math.round(value)}`;
  return `${Math.round(value)}`;
}

function isDevMode() {
  return Boolean("env" in import.meta && import.meta.env?.DEV);
}
