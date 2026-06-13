import type { WorldCupFixture, WorldCupGroup } from "../types";
import { worldCup2026Teams, worldCup2026TeamsByCode } from "./worldCup2026Teams";

export const OFFICIAL_FIFA_FIXTURE_SOURCE_URL =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures";

type GroupScheduleSeed = {
  group: WorldCupGroup;
  dates: [string, string, string];
  venues?: Record<string, string>;
  positions: [string, string, string, string];
};

const groupScheduleSeeds: GroupScheduleSeed[] = [
  {
    group: "A",
    dates: ["2026-06-11", "2026-06-18", "2026-06-24"],
    positions: ["MEX", "RSA", "KOR", "CZE"],
    venues: {
      "MEX-RSA": "Mexico City Stadium",
      "KOR-CZE": "Estadio Guadalajara",
      "CZE-RSA": "Atlanta Stadium",
      "CZE-MEX": "Mexico City Stadium",
      "RSA-KOR": "Estadio Monterrey",
    },
  },
  {
    group: "B",
    dates: ["2026-06-12", "2026-06-18", "2026-06-24"],
    positions: ["CAN", "BIH", "QAT", "SUI"],
    venues: {
      "CAN-BIH": "Toronto Stadium",
      "QAT-SUI": "San Francisco Bay Area Stadium",
      "SUI-BIH": "Los Angeles Stadium",
      "CAN-QAT": "BC Place Vancouver",
    },
  },
  {
    group: "C",
    dates: ["2026-06-13", "2026-06-19", "2026-06-24"],
    positions: ["HAI", "SCO", "BRA", "MAR"],
    venues: {
      "HAI-SCO": "Boston Stadium",
      "BRA-MAR": "New York New Jersey Stadium",
    },
  },
  {
    group: "D",
    dates: ["2026-06-12", "2026-06-19", "2026-06-25"],
    positions: ["USA", "PAR", "AUS", "TUR"],
    venues: {
      "USA-PAR": "Los Angeles Stadium",
      "AUS-TUR": "BC Place Vancouver",
      "TUR-USA": "Los Angeles Stadium",
      "PAR-AUS": "San Francisco Bay Area Stadium",
    },
  },
  { group: "E", dates: ["2026-06-14", "2026-06-20", "2026-06-25"], positions: ["CIV", "ECU", "GER", "CUW"] },
  { group: "F", dates: ["2026-06-14", "2026-06-20", "2026-06-25"], positions: ["NED", "JPN", "SWE", "TUN"] },
  { group: "G", dates: ["2026-06-15", "2026-06-21", "2026-06-26"], positions: ["IRN", "NZL", "BEL", "EGY"] },
  { group: "H", dates: ["2026-06-15", "2026-06-21", "2026-06-26"], positions: ["KSA", "URU", "ESP", "CPV"] },
  { group: "I", dates: ["2026-06-16", "2026-06-22", "2026-06-26"], positions: ["FRA", "SEN", "IRQ", "NOR"] },
  { group: "J", dates: ["2026-06-16", "2026-06-22", "2026-06-27"], positions: ["ARG", "ALG", "AUT", "JOR"] },
  { group: "K", dates: ["2026-06-17", "2026-06-23", "2026-06-27"], positions: ["POR", "COD", "UZB", "COL"] },
  { group: "L", dates: ["2026-06-17", "2026-06-23", "2026-06-27"], positions: ["GHA", "PAN", "ENG", "CRO"] },
];

const officialGroupPairings = [
  { pair: [0, 1], matchday: 0 },
  { pair: [2, 3], matchday: 0 },
  { pair: [0, 2], matchday: 1 },
  { pair: [3, 1], matchday: 1 },
  { pair: [3, 0], matchday: 2 },
  { pair: [1, 2], matchday: 2 },
] as const;

// Static official fixture source. The pairings use FIFA's group-position pattern:
// MD1: 1v2 and 3v4, MD2: 1v3 and 4v2, MD3: 4v1 and 2v3.
// Do not add generated or guessed teams here; unresolved knockout teams should be placeholders.
export const worldCup2026Fixtures: WorldCupFixture[] = groupScheduleSeeds.flatMap((seed, groupIndex) =>
  officialGroupPairings.map(({ pair, matchday }, pairingIndex) => {
    const homeCode = seed.positions[pair[0]];
    const awayCode = seed.positions[pair[1]];
    const homeTeam = worldCup2026TeamsByCode[homeCode];
    const awayTeam = worldCup2026TeamsByCode[awayCode];
    if (!homeTeam || !awayTeam) {
      throw new Error(`Missing official team metadata for ${homeCode} vs ${awayCode}`);
    }
    const venue = seed.venues?.[`${homeCode}-${awayCode}`];
    return {
      id: `${homeTeam.id}-${awayTeam.id}-${seed.dates[matchday]}`,
      fifaMatchNumber: groupIndex * 6 + pairingIndex + 1,
      stage: "group",
      group: seed.group,
      date: seed.dates[matchday],
      venue,
      homeTeam: {
        name: homeTeam.name,
        code: homeTeam.code,
        flag: homeTeam.flag,
      },
      awayTeam: {
        name: awayTeam.name,
        code: awayTeam.code,
        flag: awayTeam.flag,
      },
      status: "scheduled",
      source: "official_fifa",
      sourceUrl: OFFICIAL_FIFA_FIXTURE_SOURCE_URL,
      verified: true,
    };
  }),
);

export const officialTeamGroups = Object.fromEntries(worldCup2026Teams.map((team) => [team.code, team.group]));
