export type FormResult = "W" | "D" | "L";
export type AppView = "predictions" | "groups" | "team" | "model" | "backtesting" | "performance";
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

export interface LiveGroupStanding {
  group: WorldCupGroup | string;
  country: string;
  played: string;
  wins: string;
  draws: string;
  losses: string;
  goals_for: string;
  goals_against: string;
  goal_difference: string;
  points: string;
  rank: string;
  qualification_status: string;
}

export interface RefreshStatus {
  refreshed_at: string | null;
  data_source?: string;
  matches_total: number;
  matches_complete: number;
  matches_live: number;
  matches_scheduled: number;
  results_updated: number;
  standings_updated: boolean;
  evaluation_updated: boolean;
  snapshots_created?: number;
  evaluated_matches?: number;
  not_eligible_matches?: number;
  warnings: string[];
}

export interface PerformanceSummary {
  evaluated_matches: number;
  not_eligible_matches: number;
  correct_result_predictions: number;
  result_accuracy: number | null;
  exact_scoreline_correct: number;
  exact_scoreline_accuracy: number | null;
  top_5_scoreline_hits: number;
  top_5_scoreline_accuracy: number | null;
  goal_mae_team_a: number | null;
  goal_mae_team_b: number | null;
  total_goals_mae: number | null;
  over_2_5_accuracy: number | null;
  both_teams_to_score_accuracy: number | null;
  draw_precision: number | null;
  draw_recall: number | null;
  log_loss: number | null;
  brier_score: number | null;
  confidence_buckets?: Array<{
    bucket: string;
    matches: number;
    accuracy: number | null;
  }>;
  message?: string;
}

export interface MatchEvaluation {
  match_id: string;
  date: string;
  team_a: string;
  team_b: string;
  eligible_for_evaluation: string;
  ineligibility_reason: string;
  actual_score: string;
  actual_result_label: string;
  predicted_result_label: string;
  predicted_winner_country: string;
  p_team_a_win: string;
  p_draw: string;
  p_team_b_win: string;
  prediction_correct: string;
  expected_goals_team_a: string;
  expected_goals_team_b: string;
  actual_goals_team_a: string;
  actual_goals_team_b: string;
  goal_error_team_a: string;
  goal_error_team_b: string;
  expected_total_goals: string;
  actual_total_goals: string;
  total_goals_error: string;
  most_likely_single_scoreline: string;
  exact_scoreline_correct: string;
  actual_score_in_top_3: string;
  actual_score_in_top_5: string;
  predicted_over_2_5: string;
  actual_over_2_5: string;
  over_2_5_correct: string;
  predicted_btts: string;
  actual_btts: string;
  btts_correct: string;
  confidence_label: string;
  snapshot_used_at: string;
}

export interface EvaluationPayload {
  summary: PerformanceSummary;
  matches: MatchEvaluation[];
}
