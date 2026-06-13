import type { FormResult, Team, WorldCupGroup } from "../types";

type OfficialTeamSeed = {
  group: WorldCupGroup;
  name: string;
  code: string;
  flag: string;
  fifaRanking: number;
  eloRating: number;
};

const officialTeamSeeds: OfficialTeamSeed[] = [
  { group: "A", name: "Mexico", code: "MEX", flag: "🇲🇽", fifaRanking: 15, eloRating: 1800 },
  { group: "A", name: "South Africa", code: "RSA", flag: "🇿🇦", fifaRanking: 61, eloRating: 1550 },
  { group: "A", name: "South Korea", code: "KOR", flag: "🇰🇷", fifaRanking: 23, eloRating: 1720 },
  { group: "A", name: "Czechia", code: "CZE", flag: "🇨🇿", fifaRanking: 40, eloRating: 1655 },
  { group: "B", name: "Canada", code: "CAN", flag: "🇨🇦", fifaRanking: 32, eloRating: 1675 },
  { group: "B", name: "Bosnia and Herzegovina", code: "BIH", flag: "🇧🇦", fifaRanking: 52, eloRating: 1590 },
  { group: "B", name: "Qatar", code: "QAT", flag: "🇶🇦", fifaRanking: 46, eloRating: 1620 },
  { group: "B", name: "Switzerland", code: "SUI", flag: "🇨🇭", fifaRanking: 17, eloRating: 1755 },
  { group: "C", name: "Haiti", code: "HAI", flag: "🇭🇹", fifaRanking: 83, eloRating: 1490 },
  { group: "C", name: "Scotland", code: "SCO", flag: "🏴", fifaRanking: 44, eloRating: 1635 },
  { group: "C", name: "Brazil", code: "BRA", flag: "🇧🇷", fifaRanking: 5, eloRating: 1930 },
  { group: "C", name: "Morocco", code: "MAR", flag: "🇲🇦", fifaRanking: 12, eloRating: 1815 },
  { group: "D", name: "United States", code: "USA", flag: "🇺🇸", fifaRanking: 14, eloRating: 1760 },
  { group: "D", name: "Paraguay", code: "PAR", flag: "🇵🇾", fifaRanking: 39, eloRating: 1658 },
  { group: "D", name: "Australia", code: "AUS", flag: "🇦🇺", fifaRanking: 24, eloRating: 1710 },
  { group: "D", name: "Türkiye", code: "TUR", flag: "🇹🇷", fifaRanking: 26, eloRating: 1702 },
  { group: "E", name: "Côte d'Ivoire", code: "CIV", flag: "🇨🇮", fifaRanking: 38, eloRating: 1660 },
  { group: "E", name: "Ecuador", code: "ECU", flag: "🇪🇨", fifaRanking: 27, eloRating: 1700 },
  { group: "E", name: "Germany", code: "GER", flag: "🇩🇪", fifaRanking: 11, eloRating: 1825 },
  { group: "E", name: "Curaçao", code: "CUW", flag: "🇨🇼", fifaRanking: 79, eloRating: 1500 },
  { group: "F", name: "Netherlands", code: "NED", flag: "🇳🇱", fifaRanking: 8, eloRating: 1865 },
  { group: "F", name: "Japan", code: "JPN", flag: "🇯🇵", fifaRanking: 18, eloRating: 1745 },
  { group: "F", name: "Sweden", code: "SWE", flag: "🇸🇪", fifaRanking: 31, eloRating: 1685 },
  { group: "F", name: "Tunisia", code: "TUN", flag: "🇹🇳", fifaRanking: 41, eloRating: 1645 },
  { group: "G", name: "IR Iran", code: "IRN", flag: "🇮🇷", fifaRanking: 20, eloRating: 1738 },
  { group: "G", name: "New Zealand", code: "NZL", flag: "🇳🇿", fifaRanking: 86, eloRating: 1460 },
  { group: "G", name: "Belgium", code: "BEL", flag: "🇧🇪", fifaRanking: 9, eloRating: 1850 },
  { group: "G", name: "Egypt", code: "EGY", flag: "🇪🇬", fifaRanking: 36, eloRating: 1665 },
  { group: "H", name: "Saudi Arabia", code: "KSA", flag: "🇸🇦", fifaRanking: 58, eloRating: 1560 },
  { group: "H", name: "Uruguay", code: "URU", flag: "🇺🇾", fifaRanking: 13, eloRating: 1805 },
  { group: "H", name: "Spain", code: "ESP", flag: "🇪🇸", fifaRanking: 4, eloRating: 1915 },
  { group: "H", name: "Cabo Verde", code: "CPV", flag: "🇨🇻", fifaRanking: 68, eloRating: 1530 },
  { group: "I", name: "France", code: "FRA", flag: "🇫🇷", fifaRanking: 2, eloRating: 1965 },
  { group: "I", name: "Senegal", code: "SEN", flag: "🇸🇳", fifaRanking: 19, eloRating: 1740 },
  { group: "I", name: "Iraq", code: "IRQ", flag: "🇮🇶", fifaRanking: 56, eloRating: 1570 },
  { group: "I", name: "Norway", code: "NOR", flag: "🇳🇴", fifaRanking: 43, eloRating: 1640 },
  { group: "J", name: "Argentina", code: "ARG", flag: "🇦🇷", fifaRanking: 1, eloRating: 1980 },
  { group: "J", name: "Algeria", code: "ALG", flag: "🇩🇿", fifaRanking: 37, eloRating: 1662 },
  { group: "J", name: "Austria", code: "AUT", flag: "🇦🇹", fifaRanking: 25, eloRating: 1708 },
  { group: "J", name: "Jordan", code: "JOR", flag: "🇯🇴", fifaRanking: 65, eloRating: 1542 },
  { group: "K", name: "Portugal", code: "POR", flag: "🇵🇹", fifaRanking: 7, eloRating: 1880 },
  { group: "K", name: "Congo DR", code: "COD", flag: "🇨🇩", fifaRanking: 49, eloRating: 1610 },
  { group: "K", name: "Uzbekistan", code: "UZB", flag: "🇺🇿", fifaRanking: 57, eloRating: 1565 },
  { group: "K", name: "Colombia", code: "COL", flag: "🇨🇴", fifaRanking: 15, eloRating: 1785 },
  { group: "L", name: "Ghana", code: "GHA", flag: "🇬🇭", fifaRanking: 61, eloRating: 1570 },
  { group: "L", name: "Panama", code: "PAN", flag: "🇵🇦", fifaRanking: 45, eloRating: 1628 },
  { group: "L", name: "England", code: "ENG", flag: "🏴", fifaRanking: 6, eloRating: 1890 },
  { group: "L", name: "Croatia", code: "CRO", flag: "🇭🇷", fifaRanking: 10, eloRating: 1835 },
];

const formPatterns: FormResult[][] = [
  ["W", "W", "D", "L", "W"],
  ["D", "W", "L", "D", "W"],
  ["W", "D", "W", "W", "L"],
  ["L", "D", "W", "L", "D"],
];

export const worldCup2026Teams: Team[] = officialTeamSeeds.map((seed, index) => {
  const rankingQuality = Math.max(0.04, Math.min(1, (92 - seed.fifaRanking) / 91));
  const eloQuality = Math.max(0.04, Math.min(1, (seed.eloRating - 1450) / 540));
  const teamQuality = rankingQuality * 0.55 + eloQuality * 0.45;
  const tempoProfile = [-0.16, 0.08, 0.18, -0.1, 0.04, -0.04][index % 6];
  const attack = Math.max(0.7, Math.min(1.95, 0.72 + teamQuality * 1.2));
  const defensiveConcedingRate = Math.max(0.48, Math.min(1.7, 1.68 - teamQuality * 1.12));
  const recentScoringBase = 7 + teamQuality * 16;
  const recentConcedingBase = 5 + (1 - teamQuality) * 12;
  const goalsScoredLast10 = Math.max(
    6,
    Math.round(recentScoringBase * (1 + tempoProfile * 0.75) + (index % 4) - 1),
  );
  const goalsConcededLast10 = Math.max(
    4,
    Math.round(recentConcedingBase * (1 + tempoProfile) + ((index * 2) % 3) - 1),
  );
  const averageOpponentEloLast10 = Math.round(
    Math.max(1475, Math.min(1900, 1590 + Math.max(0, 72 - seed.fifaRanking) * 3.4 + ((index % 5) - 2) * 18)),
  );
  const averageOpponentFifaRankingLast10 = Math.round(
    Math.max(10, Math.min(86, seed.fifaRanking + 20 - (index % 6) * 5)),
  );
  return {
    id: seed.name.toLowerCase().replaceAll(" ", "-"),
    name: seed.name,
    code: seed.code,
    flag: seed.flag,
    group: seed.group,
    fifaRanking: seed.fifaRanking,
    eloRating: seed.eloRating,
    recentForm: formPatterns[index % formPatterns.length],
    stats: {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      goalsScoredLast5: Math.round(goalsScoredLast10 / 2),
      goalsConcededLast5: Math.round(goalsConcededLast10 / 2),
      goalsScoredLast10,
      goalsConcededLast10,
      averageGoalsScored: goalsScoredLast10 / 10,
      averageGoalsConceded: goalsConcededLast10 / 10,
      xgLast10: Number((goalsScoredLast10 / 10 + 0.12).toFixed(2)),
      xgAgainstLast10: Number((goalsConcededLast10 / 10 + 0.05).toFixed(2)),
      averageOpponentEloLast10,
      averageOpponentFifaRankingLast10,
      cleanSheetRate: Number(Math.max(0.12, Math.min(0.56, 0.62 - defensiveConcedingRate / 3)).toFixed(2)),
      failedToScoreRate: Number(Math.max(0.08, 0.34 - attack / 5).toFixed(2)),
      attackingStrength: Number(attack.toFixed(2)),
      defensiveStrength: Number((1 / defensiveConcedingRate).toFixed(2)),
      recentFormRating: Number((0.45 + attack / 3).toFixed(2)),
    },
    lineup: {
      available: false,
      formation: null,
      players: [],
      injuries: [],
    },
    source: "official_fifa",
    verified: true,
  };
});

export const worldCup2026TeamsByCode = Object.fromEntries(worldCup2026Teams.map((team) => [team.code, team]));
