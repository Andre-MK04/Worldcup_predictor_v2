export type FormResult = "W" | "D" | "L";
export type AppView = "predictions" | "groups" | "team" | "model" | "backtesting";
export type FixtureStatus = "scheduled" | "live" | "completed" | "postponed";
export type PredictionOutcome = "home_win" | "draw" | "away_win";
export type FixtureStage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarter_final"
  | "semi_final"
  | "third_place"
  | "final";
export type WorldCupGroup = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L";

export interface FixtureTeam {
  name: string;
  code: string;
  flag?: string;
}

export interface TeamStats {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  goalsScoredLast5: number;
  goalsConcededLast5: number;
  goalsScoredLast10: number;
  goalsConcededLast10: number;
  averageGoalsScored: number;
  averageGoalsConceded: number;
  xgLast10: number;
  xgAgainstLast10: number;
  averageOpponentEloLast10: number;
  averageOpponentFifaRankingLast10: number;
  cleanSheetRate: number;
  failedToScoreRate: number;
  attackingStrength: number;
  defensiveStrength: number;
  recentFormRating: number;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  flag: string;
  group: WorldCupGroup;
  fifaRanking: number;
  eloRating: number;
  stats: TeamStats;
  recentForm: FormResult[];
  lineup: {
    available: boolean;
    formation: string | null;
    players: string[];
    injuries: string[];
  };
  source?: "official_fifa";
  verified?: boolean;
}

export interface WorldCupFixture {
  id: string;
  fifaMatchNumber?: number;
  stage: FixtureStage;
  group?: WorldCupGroup;
  date: string;
  kickoffLocal?: string;
  kickoffUTC?: string;
  venue?: string;
  city?: string;
  country?: string;
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  status: FixtureStatus;
  score?: {
    home: number;
    away: number;
  };
  source: "official_fifa";
  sourceUrl?: string;
  verified: boolean;
}

export type WorldCupMatch = WorldCupFixture;

export interface TeamPrediction {
  name: string;
  code: string;
  flag: string;
  expectedGoals: number;
  form: FormResult[];
  goalsScoredLast10: number;
  goalsConcededLast10: number;
  xgLast10: number;
  xgAgainstLast10: number;
  cleanSheetRate: number;
  failedToScoreRate: number;
}

export interface ScorelineProbability {
  score: string;
  home?: number;
  away?: number;
  probability: number;
}

export interface FixturePredictionResult {
  fixtureId: string;
  expectedGoals: {
    home: number;
    away: number;
  };
  predictedScore: {
    home: number;
    away: number;
  };
  outcome: PredictionOutcome;
  outcomeLabel: string;
  probabilities: {
    homeWin: number;
    draw: number;
    awayWin: number;
  };
  topScorelines: Array<{
    home: number;
    away: number;
    probability: number;
  }>;
  goalProbabilities: {
    over15: number;
    over25: number;
    over35: number;
    bothTeamsToScore: number;
  };
  explanation: string;
}

export interface Prediction {
  id: string;
  matchId: string;
  group: string;
  date: string;
  venue: string;
  teamA: TeamPrediction;
  teamB: TeamPrediction;
  probabilities: {
    teamAWin: number;
    draw: number;
    teamBWin: number;
  };
  goalProbabilities: {
    over15: number;
    over25: number;
    over35: number;
    bothTeamsToScore: number;
  };
  recommendedScore: string;
  predictedOutcome: string;
  scoreOutcome: PredictionOutcome;
  overallOutcome: PredictionOutcome;
  overallOutcomeLabel: string;
  confidence: number;
  topScorelines: ScorelineProbability[];
  explanation: string;
  scorelineNote?: string;
}

export interface ModelMetric {
  label: string;
  value: string;
  trend: string;
}

export interface CalibrationBucket {
  bucket: string;
  confidence: number;
  accuracy: number;
}

export interface GroupStanding {
  team: Team;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
