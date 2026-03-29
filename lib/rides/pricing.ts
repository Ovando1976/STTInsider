import type { RidePricing, RideRouteClass, RideZoneType } from "@/types/rides";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export function classifyRoute(input: {
  pickupZoneType: RideZoneType;
  dropoffZoneType: RideZoneType;
  pickupIslandCode: string;
  dropoffIslandCode: string;
  sameEstate: boolean;
  distanceMiles: number;
}): RideRouteClass {
  const {
    pickupZoneType,
    dropoffZoneType,
    pickupIslandCode,
    dropoffIslandCode,
    sameEstate,
    distanceMiles,
  } = input;

  if (pickupZoneType === "airport" || dropoffZoneType === "airport") {
    return "airport";
  }

  if (pickupZoneType === "ferry" || dropoffZoneType === "ferry") {
    return "ferry";
  }

  if (sameEstate) {
    return "local";
  }

  if (pickupIslandCode !== dropoffIslandCode) {
    return "interzone";
  }

  if (distanceMiles <= 4) {
    return "town";
  }

  if (distanceMiles >= 8) {
    return "cross_island";
  }

  return "tourist_corridor";
}

export function estimateRidePrice(input: {
  distanceMiles: number;
  routeClass: RideRouteClass;
  pickupZoneType: RideZoneType;
  dropoffZoneType: RideZoneType;
  sameEstate: boolean;
}): RidePricing {
  const {
    distanceMiles,
    routeClass,
    pickupZoneType,
    dropoffZoneType,
    sameEstate,
  } = input;

  const baseFare = 10;
  const distanceFare = distanceMiles * 3.5;

  let zoneAdjustment = 0;

  if (pickupZoneType === "airport" || dropoffZoneType === "airport") {
    zoneAdjustment += 6;
  }

  if (pickupZoneType === "ferry" || dropoffZoneType === "ferry") {
    zoneAdjustment += 4;
  }

  if (pickupZoneType === "beach" || dropoffZoneType === "beach") {
    zoneAdjustment += 2;
  }

  if (pickupZoneType === "hotel" || dropoffZoneType === "hotel") {
    zoneAdjustment += 1.5;
  }

  if (sameEstate) {
    zoneAdjustment -= 2;
  }

  if (routeClass === "cross_island") {
    zoneAdjustment += 5;
  }

  if (routeClass === "tourist_corridor") {
    zoneAdjustment += 2.5;
  }

  const surgeMultiplier = 1;
  const totalEstimate = Math.max(
    8,
    (baseFare + distanceFare + zoneAdjustment) * surgeMultiplier
  );

  return {
    baseFare: roundMoney(baseFare),
    distanceFare: roundMoney(distanceFare),
    zoneAdjustment: roundMoney(zoneAdjustment),
    surgeMultiplier,
    totalEstimate: roundMoney(totalEstimate),
    currency: "USD",
  };
}
