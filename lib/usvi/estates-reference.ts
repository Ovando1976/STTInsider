import estates from "@/data/usvi-estates.json";

export type IslandCode = "STT" | "STJ" | "STX" | "WAT" | "UNK";

type EstatePoint = {
  lat: number | null;
  lng: number | null;
};

export type UsviEstateReference = {
  geoid: string;
  name: string;
  basename?: string;
  island?: string;
  islandCode?: IslandCode;
  marker?: EstatePoint;
  interiorPoint?: EstatePoint;
  centroid?: EstatePoint;
  aliases?: string[];
};

const typedEstates = estates as UsviEstateReference[];

function toIslandCode(value?: string): IslandCode {
  switch (value) {
    case "St. Thomas":
    case "STT":
      return "STT";
    case "St. John":
    case "STJ":
      return "STJ";
    case "St. Croix":
    case "STX":
      return "STX";
    case "Water Island":
    case "WAT":
      return "WAT";
    default:
      return "UNK";
  }
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function getEstatePoint(estate: UsviEstateReference): EstatePoint | null {
  if (estate.marker?.lat != null && estate.marker?.lng != null) {
    return estate.marker;
  }

  if (estate.interiorPoint?.lat != null && estate.interiorPoint?.lng != null) {
    return estate.interiorPoint;
  }

  if (estate.centroid?.lat != null && estate.centroid?.lng != null) {
    return estate.centroid;
  }

  return null;
}

export function findNearestEstate(lat: number, lng: number) {
  let best: UsviEstateReference | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const estate of typedEstates) {
    const point = getEstatePoint(estate);
    if (!point || point.lat == null || point.lng == null) continue;

    const distance = haversineMiles(lat, lng, point.lat, point.lng);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = estate;
    }
  }

  if (!best) return null;

  return {
    geoid: best.geoid,
    name: best.name,
    islandCode: best.islandCode ?? toIslandCode(best.island),
  };
}
