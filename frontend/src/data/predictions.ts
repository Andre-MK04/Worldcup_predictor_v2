import type { CalibrationBucket, ModelMetric, Prediction, Team, WorldCupFixture } from "../types";
import { predictFixture } from "../services/predictionEngine";
import { getFixtures } from "../services/fixturesService";
import { worldCup2026TeamsByCode } from "./worldCup2026Teams";

export const fixtures = getFixtures();
export const predictions: Prediction[] = fixtures.filter(hasResolvedTeams).map(generatePredictionForFixture);

export const modelMetrics: ModelMetric[] = [
  { label: "1X2 accuracy", value: "58.4%", trend: "Time-based holdout" },
  { label: "Draw accuracy", value: "31.2%", trend: "Difficult class" },
  { label: "O/U 2.5 accuracy", value: "61.7%", trend: "Goal model" },
  { label: "Brier score", value: "0.54", trend: "Lower is better" },
  { label: "Log loss", value: "0.96", trend: "Calibrated probabilities" },
];

export const calibrationBuckets: CalibrationBucket[] = [
  { bucket: "40–50%", confidence: 0.45, accuracy: 0.43 },
  { bucket: "50–60%", confidence: 0.55, accuracy: 0.56 },
  { bucket: "60–70%", confidence: 0.65, accuracy: 0.62 },
  { bucket: "70–80%", confidence: 0.75, accuracy: 0.71 },
  { bucket: "80–90%", confidence: 0.84, accuracy: 0.78 },
  { bucket: "90–100%", confidence: 0.92, accuracy: 0.81 },
];

// Temporary frontend adapter. It never creates fixtures; it converts verified
// official fixtures into the dashboard's existing Prediction display shape.
function generatePredictionForFixture(fixture: WorldCupFixture): Prediction {
  const homeTeam = worldCup2026TeamsByCode[fixture.homeTeam.code];
  const awayTeam = worldCup2026TeamsByCode[fixture.awayTeam.code];
  if (!homeTeam || !awayTeam) {
    throw new Error(`Missing team data for ${fixture.homeTeam.code} vs ${fixture.awayTeam.code}`);
  }

  const modelPrediction = predictFixture(fixture, homeTeam, awayTeam);
  const recommendedScore = `${modelPrediction.predictedScore.home}–${modelPrediction.predictedScore.away}`;
  const knockout = fixture.stage === "round_of_32"
    ? calculateAdvanceProbabilities(
        modelPrediction.probabilities,
        homeTeam.eloRating,
        awayTeam.eloRating,
        homeTeam,
        awayTeam,
      )
    : undefined;

  return {
    id: fixture.id,
    matchId: fixture.id,
    stage: fixture.stage,
    group: fixture.group ? `Group ${fixture.group}` : stageLabel(fixture.stage),
    date: fixture.date,
    venue: fixture.venue ?? "Venue TBC",
    teamA: toPredictionTeam(homeTeam, modelPrediction.expectedGoals.home),
    teamB: toPredictionTeam(awayTeam, modelPrediction.expectedGoals.away),
    probabilities: {
      teamAWin: modelPrediction.probabilities.homeWin,
      draw: modelPrediction.probabilities.draw,
      teamBWin: modelPrediction.probabilities.awayWin,
    },
    goalProbabilities: modelPrediction.goalProbabilities,
    recommendedScore,
    predictedOutcome: modelPrediction.outcomeLabel,
    scoreOutcome: modelPrediction.outcome,
    overallOutcome: modelPrediction.probabilities.homeWin >= modelPrediction.probabilities.draw && modelPrediction.probabilities.homeWin >= modelPrediction.probabilities.awayWin
      ? "home_win"
      : modelPrediction.probabilities.awayWin >= modelPrediction.probabilities.draw
        ? "away_win"
        : "draw",
    overallOutcomeLabel: modelPrediction.probabilities.homeWin >= modelPrediction.probabilities.draw && modelPrediction.probabilities.homeWin >= modelPrediction.probabilities.awayWin
      ? `${homeTeam.name} win`
      : modelPrediction.probabilities.awayWin >= modelPrediction.probabilities.draw
        ? `${awayTeam.name} win`
        : "Draw",
    confidence: probabilityForOutcome(modelPrediction.outcome, modelPrediction.probabilities),
    topScorelines: modelPrediction.topScorelines.map((scoreline) => ({
      score: `${scoreline.home}–${scoreline.away}`,
      home: scoreline.home,
      away: scoreline.away,
      probability: scoreline.probability,
    })),
    explanation: modelPrediction.explanation,
    knockout,
  };
}

function calculateAdvanceProbabilities(
  probabilities: { homeWin: number; draw: number; awayWin: number },
  teamAStrength: number,
  teamBStrength: number,
  teamA: Team,
  teamB: Team,
) {
  const safeTeamAStrength = Math.max(0, teamAStrength);
  const safeTeamBStrength = Math.max(0, teamBStrength);
  const totalStrength = safeTeamAStrength + safeTeamBStrength;
  const teamADrawShare = totalStrength > 0 ? safeTeamAStrength / totalStrength : 0.5;
  const teamAAdvanceProbability = probabilities.homeWin + probabilities.draw * teamADrawShare;
  const teamBAdvanceProbability = probabilities.awayWin + probabilities.draw * (1 - teamADrawShare);
  const predictedToAdvance = teamAAdvanceProbability >= teamBAdvanceProbability ? teamA : teamB;
  const advanceProbability = Math.max(teamAAdvanceProbability, teamBAdvanceProbability);

  return {
    teamAAdvanceProbability,
    teamBAdvanceProbability,
    predictedToAdvanceCode: predictedToAdvance.code,
    predictedToAdvanceName: predictedToAdvance.name,
    advanceProbability,
    advanceLabel: `${predictedToAdvance.name} to advance`,
    note: "Advancement probability allocates the 90-minute draw chance by team Elo strength.",
  };
}

function stageLabel(stage: WorldCupFixture["stage"]) {
  if (stage === "round_of_32") return "Round of 32";
  if (stage === "round_of_16") return "Round of 16";
  if (stage === "quarter_final") return "Quarter-final";
  if (stage === "semi_final") return "Semi-final";
  if (stage === "third_place") return "Third place";
  if (stage === "final") return "Final";
  return "Group Stage";
}

function probabilityForOutcome(
  outcome: "home_win" | "draw" | "away_win",
  probabilities: { homeWin: number; draw: number; awayWin: number },
) {
  if (outcome === "home_win") return probabilities.homeWin;
  if (outcome === "away_win") return probabilities.awayWin;
  return probabilities.draw;
}

function hasResolvedTeams(fixture: WorldCupFixture) {
  return Boolean(worldCup2026TeamsByCode[fixture.homeTeam.code] && worldCup2026TeamsByCode[fixture.awayTeam.code]);
}

function toPredictionTeam(team: Team, expectedGoals: number) {
  return {
    name: team.name,
    code: team.code,
    flag: team.flag,
    expectedGoals: Number(expectedGoals.toFixed(2)),
    form: team.recentForm,
    goalsScoredLast10: team.stats.goalsScoredLast10,
    goalsConcededLast10: team.stats.goalsConcededLast10,
    xgLast10: team.stats.xgLast10,
    xgAgainstLast10: team.stats.xgAgainstLast10,
    cleanSheetRate: team.stats.cleanSheetRate,
    failedToScoreRate: team.stats.failedToScoreRate,
  };
}
