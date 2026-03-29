import {
  getAllEstatesAdmin,
  type IslandCode,
  type UsviEstateDoc,
} from "@/lib/server/usvi-estates";

export type RideZoneType =
  | "estate"
  | "airport"
  | "ferry"
  | "hotel"
  | "beach"
  | "marina"
  | "downtown"
  | "custom";

export type ResolveLocationInput = {
  label: string;
  addressText?: string | null;
  lat: number;
  lng: number;
};

export type ResolvedRideLocation = {
  label: string;
  addressText: string | null;
  lat: number;
  lng: number;
  estateGeoid: string | null;
  estateName: string | null;
  islandCode: IslandCode;
  zoneType: RideZoneType;
};

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

function inferZoneType(label: string): RideZoneType {
  const text = label.toLowerCase();

  if (
    text.includes("airport") ||
    text.includes("cyril e. king") ||
    text.includes("rohlsen")
  ) {
    return "airport";
  }

  if (
    text.includes("ferry") ||
    text.includes("dock") ||
    text.includes("harbor") ||
    text.includes("harbour")
  ) {
    return "ferry";
  }

  if (
    text.includes("resort") ||
    text.includes("hotel") ||
    text.includes("villa")
  ) {
    return "hotel";
  }

  if (text.includes("beach") || text.includes("bay")) {
    return "beach";
  }

  if (text.includes("marina") || text.includes("yacht")) {
    return "marina";
  }

  if (
    text.includes("charlotte amalie") ||
    text.includes("christiansted") ||
    text.includes("frederiksted") ||
    text.includes("cruz bay")
  ) {
    return "downtown";
  }

  return "custom";
}

export async function resolveNearestEstate(
  lat: number,
  lng: number
): Promise<UsviEstateDoc | null> {
  const estates = await getAllEstatesAdmin(500);

  let best: UsviEstateDoc | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const estate of estates) {
    if (estate.marker?.lat == null || estate.marker?.lng == null) continue;

    const distance = haversineMiles(
      lat,
      lng,
      estate.marker.lat,
      estate.marker.lng
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      best = estate;
    }
  }

  return best;
}

export async function resolveRideLocationContext(
  input: ResolveLocationInput
): Promise<ResolvedRideLocation> {
  const estate = await resolveNearestEstate(input.lat, input.lng);
  const inferredZoneType = inferZoneType(input.label);

  return {
    label: input.label,
    addressText: input.addressText ?? null,
    lat: input.lat,
    lng: input.lng,
    estateGeoid: estate?.geoid ?? null,
    estateName: estate?.name ?? null,
    islandCode: estate?.islandCode ?? "UNK",
    zoneType:
      inferredZoneType === "custom"
        ? estate
          ? "estate"
          : "custom"
        : inferredZoneType,
  };
}
