import type { Business } from "@/types/stt";

export type MainTab = "places" | "beaches" | "restaurants" | "shops";

export type IslandFilter =
  | "All Islands"
  | "St. Thomas"
  | "St. John"
  | "St. Croix"
  | "Water Island";

type FilterOptions = {
  query: string;
  currentCategory: "All" | "Beach" | "Food" | "Shopping" | "Activity" | "Stay";
  islandFilter: IslandFilter;
  bookmarkIds: string[];
  bookmarkOnly: boolean;
  distanceSort: boolean;
  userCoords: { lat: number; lng: number } | null;
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getBusinessIsland(business: Business) {
  const direct = (business as Business & { island?: string }).island;
  if (direct) return direct;

  const location = normalizeText(business.location);

  if (location.includes("st. thomas") || location.includes("saint thomas")) {
    return "St. Thomas";
  }
  if (
    location.includes("st. john") ||
    location.includes("saint john") ||
    location.includes("cruz bay")
  ) {
    return "St. John";
  }
  if (
    location.includes("st. croix") ||
    location.includes("saint croix") ||
    location.includes("christiansted")
  ) {
    return "St. Croix";
  }
  if (location.includes("water island")) {
    return "Water Island";
  }

  return "";
}

function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

export function filterBusinesses(
  businesses: Business[],
  {
    query,
    currentCategory,
    islandFilter,
    bookmarkIds,
    bookmarkOnly,
    distanceSort,
    userCoords,
  }: FilterOptions
) {
  let next = [...businesses];

  if (currentCategory !== "All") {
    next = next.filter((business) => business.category === currentCategory);
  }

  if (islandFilter !== "All Islands") {
    next = next.filter(
      (business) => getBusinessIsland(business) === islandFilter
    );
  }

  const normalizedQuery = normalizeText(query);
  if (normalizedQuery) {
    next = next.filter((business) => {
      const haystack = [
        business.name,
        business.location,
        business.category,
        business.description,
        getBusinessIsland(business),
      ]
        .map(normalizeText)
        .join(" ");

      return haystack.includes(normalizedQuery);
    });
  }

  if (bookmarkOnly) {
    next = next.filter((business) => bookmarkIds.includes(business.id));
  }

  if (distanceSort && userCoords) {
    next.sort((a, b) => {
      const aCoords = (
        a as Business & { coordinates?: { lat: number; lng: number } }
      ).coordinates;
      const bCoords = (
        b as Business & { coordinates?: { lat: number; lng: number } }
      ).coordinates;

      const aDistance = aCoords
        ? distanceMiles(userCoords, aCoords)
        : Number.POSITIVE_INFINITY;
      const bDistance = bCoords
        ? distanceMiles(userCoords, bCoords)
        : Number.POSITIVE_INFINITY;

      return aDistance - bDistance;
    });
  }

  return next;
}
