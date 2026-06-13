import assert from "node:assert/strict";
import { getOutcomeFromScore, getOutcomeLabel, predictFixture } from "../src/services/predictionEngine.ts";
import type { Team, WorldCupFixture } from "../src/types.ts";

assert.equal(getOutcomeFromScore(1, 1), "draw");
assert.equal(getOutcomeFromScore(2, 0), "home_win");
assert.equal(getOutcomeFromScore(0, 2), "away_win");
assert.equal(getOutcomeLabel(getOutcomeFromScore(1, 1), "Home", "Away"), "Draw");
assert.equal(getOutcomeLabel(getOutcomeFromScore(2, 0), "Home", "Away"), "Home win");
assert.equal(getOutcomeLabel(getOutcomeFromScore(0, 2), "Home", "Away"), "Away win");

const fixture: WorldCupFixture = {
  id: "test-fixture",
  stage: "group",
  group: "A",
  date: "2026-06-11",
  homeTeam: { name: "Home", code: "HOM" },
  awayTeam: { name: "Away", code: "AWY" },
  status: "scheduled",
  source: "official_fifa",
  verified: true,
};

const home = makeTeam("Home", "HOM", {
  goalsScoredLast5: 8,
  goalsConcededLast5: 4,
  goalsScoredLast10: 20,
  goalsConcededLast10: 10,
});
const away = makeTeam("Away", "AWY", {
  goalsScoredLast5: 4,
  goalsConcededLast5: 7,
  goalsScoredLast10: 10,
  goalsConcededLast10: 18,
});

const prediction = predictFixture(fixture, home, away);
assert.equal(prediction.outcome, getOutcomeFromScore(prediction.predictedScore.home, prediction.predictedScore.away));
assert.equal(prediction.outcomeLabel, "Home win");
assert.equal(prediction.outcomeLabel, getOutcomeLabel(prediction.outcome, "Home", "Away"));

const probabilityTotal =
  prediction.probabilities.homeWin + prediction.probabilities.draw + prediction.probabilities.awayWin;
assert.ok(Math.abs(probabilityTotal - 1) < 0.000001);

for (let index = 1; index < prediction.topScorelines.length; index += 1) {
  assert.ok(prediction.topScorelines[index - 1].probability >= prediction.topScorelines[index].probability);
}

// Expected goals use 70% last-10 and 30% last-5 form, then blend own attack
// with opponent concession rate at 62/38.
const homeAttack = (20 / 10) * 0.7 + (8 / 5) * 0.3;
const awayConceding = (18 / 10) * 0.7 + (7 / 5) * 0.3;
const expectedHome = homeAttack * 0.62 + awayConceding * 0.38;
assert.ok(Math.abs(prediction.expectedGoals.home - expectedHome) < 0.001);

const strongerHome = makeTeam("Home", "HOM", {
  goalsScoredLast5: 8,
  goalsConcededLast5: 4,
  goalsScoredLast10: 20,
  goalsConcededLast10: 10,
});
const weakerAway = makeTeam("Away", "AWY", {
  goalsScoredLast5: 4,
  goalsConcededLast5: 7,
  goalsScoredLast10: 10,
  goalsConcededLast10: 18,
});
strongerHome.eloRating = 2100;
weakerAway.eloRating = 1500;
const ratingAdjustedPrediction = predictFixture(fixture, strongerHome, weakerAway);
assert.ok(ratingAdjustedPrediction.expectedGoals.home > prediction.expectedGoals.home);
assert.ok(ratingAdjustedPrediction.expectedGoals.away < prediction.expectedGoals.away);

const rankingFavorite = makeTeam("Home", "HOM", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 6,
  goalsScoredLast10: 12,
  goalsConcededLast10: 12,
});
const rankingOutsider = makeTeam("Away", "AWY", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 6,
  goalsScoredLast10: 12,
  goalsConcededLast10: 12,
});
rankingFavorite.fifaRanking = 5;
rankingOutsider.fifaRanking = 80;
const rankingAdjustedPrediction = predictFixture(fixture, rankingFavorite, rankingOutsider);
assert.ok(rankingAdjustedPrediction.expectedGoals.home > rankingAdjustedPrediction.expectedGoals.away);
assert.ok(rankingAdjustedPrediction.probabilities.homeWin > rankingAdjustedPrediction.probabilities.awayWin);

const smallRankingGapFavorite = makeTeam("Home", "HOM", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 6,
  goalsScoredLast10: 12,
  goalsConcededLast10: 12,
});
const smallRankingGapOutsider = makeTeam("Away", "AWY", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 6,
  goalsScoredLast10: 12,
  goalsConcededLast10: 12,
});
smallRankingGapFavorite.fifaRanking = 25;
smallRankingGapOutsider.fifaRanking = 35;
const smallRankingGapPrediction = predictFixture(fixture, smallRankingGapFavorite, smallRankingGapOutsider);
assert.ok(
  rankingAdjustedPrediction.expectedGoals.home - rankingAdjustedPrediction.expectedGoals.away >
    smallRankingGapPrediction.expectedGoals.home - smallRankingGapPrediction.expectedGoals.away,
);
assert.ok(rankingAdjustedPrediction.probabilities.homeWin > smallRankingGapPrediction.probabilities.homeWin);

const strongScheduleHome = makeTeam("Home", "HOM", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 5,
  goalsScoredLast10: 12,
  goalsConcededLast10: 10,
});
const weakScheduleAway = makeTeam("Away", "AWY", {
  goalsScoredLast5: 6,
  goalsConcededLast5: 5,
  goalsScoredLast10: 12,
  goalsConcededLast10: 10,
});
strongScheduleHome.stats.averageOpponentEloLast10 = 1880;
strongScheduleHome.stats.averageOpponentFifaRankingLast10 = 12;
weakScheduleAway.stats.averageOpponentEloLast10 = 1500;
weakScheduleAway.stats.averageOpponentFifaRankingLast10 = 82;
const scheduleAdjustedPrediction = predictFixture(fixture, strongScheduleHome, weakScheduleAway);
assert.ok(scheduleAdjustedPrediction.expectedGoals.home > scheduleAdjustedPrediction.expectedGoals.away);

const twoVsOneHome = makeTeam("Home", "HOM", {
  goalsScoredLast5: 10,
  goalsConcededLast5: 5,
  goalsScoredLast10: 20,
  goalsConcededLast10: 10,
});
const twoVsOneAway = makeTeam("Away", "AWY", {
  goalsScoredLast5: 5,
  goalsConcededLast5: 10,
  goalsScoredLast10: 10,
  goalsConcededLast10: 20,
});
const twoVsOnePrediction = predictFixture(fixture, twoVsOneHome, twoVsOneAway);
assert.ok(twoVsOnePrediction.expectedGoals.home > 1.8);
assert.ok(twoVsOnePrediction.expectedGoals.away < 1.2);
assert.notEqual(twoVsOnePrediction.predictedScore.home, twoVsOnePrediction.predictedScore.away);
assert.equal(twoVsOnePrediction.outcome, "home_win");

const lowAwayThreatHome = makeTeam("Home", "HOM", {
  goalsScoredLast5: 10,
  goalsConcededLast5: 1,
  goalsScoredLast10: 22,
  goalsConcededLast10: 3,
});
const lowAwayThreatAway = makeTeam("Away", "AWY", {
  goalsScoredLast5: 1,
  goalsConcededLast5: 10,
  goalsScoredLast10: 4,
  goalsConcededLast10: 22,
});
lowAwayThreatHome.fifaRanking = 6;
lowAwayThreatHome.eloRating = 1900;
lowAwayThreatAway.fifaRanking = 86;
lowAwayThreatAway.eloRating = 1450;
const lowThreatPrediction = predictFixture(fixture, lowAwayThreatHome, lowAwayThreatAway);
assert.equal(lowThreatPrediction.outcome, "home_win");
assert.equal(lowThreatPrediction.predictedScore.away, 0);

console.log("predictionEngine tests passed");

function makeTeam(
  name: string,
  code: string,
  stats: {
    goalsScoredLast5: number;
    goalsConcededLast5: number;
    goalsScoredLast10: number;
    goalsConcededLast10: number;
  },
): Team {
  return {
    id: code.toLowerCase(),
    name,
    code,
    flag: "",
    group: "A",
    fifaRanking: 1,
    eloRating: 1800,
    recentForm: ["W", "W", "D", "W", "L"],
    stats: {
      ...stats,
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      averageGoalsScored: stats.goalsScoredLast10 / 10,
      averageGoalsConceded: stats.goalsConcededLast10 / 10,
      xgLast10: Number.NaN,
      xgAgainstLast10: Number.NaN,
      averageOpponentEloLast10: 1700,
      averageOpponentFifaRankingLast10: 40,
      cleanSheetRate: 0,
      failedToScoreRate: 0,
      attackingStrength: 1,
      defensiveStrength: 1,
      recentFormRating: 0.5,
    },
    lineup: {
      available: false,
      formation: null,
      players: [],
      injuries: [],
    },
  };
}
