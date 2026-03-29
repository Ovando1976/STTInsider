import type { UsviEstate } from "@/types/usvi-estates";

export type IslandValue =
  | "All Islands"
  | "St. Thomas"
  | "St. John"
  | "St. Croix"
  | "Water Island";

export function getEstatesForIsland(
  estates: UsviEstate[],
  island: IslandValue
): UsviEstate[] {
  if (island === "All Islands") return estates;

  return estates.filter((estate) => estate.island === island);
}

export function sortEstatesByName(estates: UsviEstate[]): UsviEstate[] {
  return [...estates].sort((a, b) => a.basename.localeCompare(b.basename));
}

export function findEstateByGeoid(
  estates: UsviEstate[],
  geoid: string | null | undefined
): UsviEstate | null {
  if (!geoid) return null;
  return estates.find((estate) => estate.geoid === geoid) ?? null;
}