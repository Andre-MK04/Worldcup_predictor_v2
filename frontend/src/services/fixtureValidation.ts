import type { Team, WorldCupFixture, WorldCupGroup } from "../types";

export type FixtureValidationResult = {
  validFixtures: WorldCupFixture[];
  errors: string[];
  warnings: string[];
};

export function validateWorldCupFixtures(fixtures: WorldCupFixture[], teams: Team[]): FixtureValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const teamByCode = new Map(teams.map((team) => [team.code, team]));
  const ids = new Set<string>();
  const sameDayTeam = new Set<string>();
  const groupTeams = new Map<WorldCupGroup, Set<string>>();
  const groupFixtures = new Map<WorldCupGroup, WorldCupFixture[]>();
  const teamFixtureCounts = new Map<string, number>();
  const repeatedMatchups = new Set<string>();

  teams.forEach((team) => {
    const group = team.group as WorldCupGroup;
    groupTeams.set(group, groupTeams.get(group) ?? new Set<string>());
    groupTeams.get(group)?.add(team.code);
  });

  fixtures.forEach((fixture) => {
    if (!fixture.verified || fixture.source !== "official_fifa") {
      errors.push(`${fixture.id}: fixture is not marked as verified official FIFA data`);
    }
    if (ids.has(fixture.id)) {
      errors.push(`${fixture.id}: duplicate fixture ID`);
    }
    ids.add(fixture.id);

    const home = teamByCode.get(fixture.homeTeam.code);
    const away = teamByCode.get(fixture.awayTeam.code);
    if (!home) errors.push(`${fixture.id}: unknown home team code ${fixture.homeTeam.code}`);
    if (!away) errors.push(`${fixture.id}: unknown away team code ${fixture.awayTeam.code}`);

    for (const code of [fixture.homeTeam.code, fixture.awayTeam.code]) {
      const key = `${fixture.date}-${code}`;
      if (sameDayTeam.has(key)) errors.push(`${fixture.id}: ${code} has multiple fixtures on ${fixture.date}`);
      sameDayTeam.add(key);
    }

    if (fixture.stage === "group") {
      if (!fixture.group) {
        errors.push(`${fixture.id}: group-stage fixture is missing group`);
      } else {
        groupFixtures.set(fixture.group, groupFixtures.get(fixture.group) ?? []);
        groupFixtures.get(fixture.group)?.push(fixture);
      }
      if (home && away && fixture.group && (home.group !== away.group || home.group !== fixture.group)) {
        errors.push(
          `${fixture.id}: invalid group-stage pairing ${home.code} (${home.group}) vs ${away.code} (${away.group}) in Group ${fixture.group}`,
        );
      }
      const matchup = [fixture.homeTeam.code, fixture.awayTeam.code].sort().join("-");
      if (repeatedMatchups.has(matchup)) errors.push(`${fixture.id}: repeated matchup ${matchup}`);
      repeatedMatchups.add(matchup);
      teamFixtureCounts.set(fixture.homeTeam.code, (teamFixtureCounts.get(fixture.homeTeam.code) ?? 0) + 1);
      teamFixtureCounts.set(fixture.awayTeam.code, (teamFixtureCounts.get(fixture.awayTeam.code) ?? 0) + 1);
    }
  });

  for (const [group, codes] of groupTeams) {
    if (codes.size !== 4) errors.push(`Group ${group}: expected 4 teams, got ${codes.size}`);
    const fixturesInGroup = groupFixtures.get(group) ?? [];
    if (fixturesInGroup.length !== 6) errors.push(`Group ${group}: expected 6 fixtures, got ${fixturesInGroup.length}`);
    for (const code of codes) {
      const count = teamFixtureCounts.get(code) ?? 0;
      if (count !== 3) errors.push(`${code}: expected 3 group fixtures, got ${count}`);
    }
  }

  const groupStageFixtureCount = fixtures.filter((fixture) => fixture.stage === "group").length;
  if (groupStageFixtureCount !== 72) errors.push(`Expected 72 group-stage fixtures, got ${groupStageFixtureCount}`);
  if (fixtures.length !== 104) warnings.push(`Full tournament fixture count is ${fixtures.length}; knockout placeholders are not included yet.`);

  const usaJapan = fixtures.find(
    (fixture) =>
      fixture.stage === "group" &&
      [fixture.homeTeam.code, fixture.awayTeam.code].includes("USA") &&
      [fixture.homeTeam.code, fixture.awayTeam.code].includes("JPN"),
  );
  if (usaJapan) errors.push(`${usaJapan.id}: USA must not play Japan in the group stage`);

  return {
    validFixtures: errors.length ? [] : fixtures,
    errors,
    warnings,
  };
}
