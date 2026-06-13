import { worldCup2026Fixtures } from "../data/worldCup2026Fixtures";
import { worldCup2026Teams } from "../data/worldCup2026Teams";
import type { WorldCupFixture } from "../types";
import { validateWorldCupFixtures } from "./fixtureValidation";

export const fixtureValidation = validateWorldCupFixtures(worldCup2026Fixtures, worldCup2026Teams);

if (import.meta.env.DEV) {
  fixtureValidation.errors.forEach((error) => console.error(`[fixtures] ${error}`));
  fixtureValidation.warnings.forEach((warning) => console.warn(`[fixtures] ${warning}`));
}

export function getFixtures(): WorldCupFixture[] {
  return fixtureValidation.errors.length ? [] : worldCup2026Fixtures;
}

export function getGroupFixtures(group: string): WorldCupFixture[] {
  return getFixtures().filter((fixture) => fixture.group === group);
}

export function getTeamFixtures(teamCode: string): WorldCupFixture[] {
  return getFixtures().filter((fixture) => fixture.homeTeam.code === teamCode || fixture.awayTeam.code === teamCode);
}

export function getCompletedFixtures(): WorldCupFixture[] {
  return getFixtures().filter((fixture) => fixture.status === "completed");
}

export function getUpcomingFixtures(): WorldCupFixture[] {
  return getFixtures().filter((fixture) => fixture.status === "scheduled" || fixture.status === "postponed");
}
