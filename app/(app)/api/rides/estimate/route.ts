import { NextRequest, NextResponse } from "next/server";
import { findNearestEstate } from "@/lib/usvi/estates-reference";
import {
  classifyRoute,
  estimateRidePrice,
  haversineMiles,
} from "@/lib/rides/pricing";

type EstimateRequestBody = {
  pickup: {
    label: string;
    addressText?: string | null;
    lat: number;
    lng: number;
  };
  dropoff: {
    label: string;
    addressText?: string | null;
    lat: number;
    lng: number;
  };
};

type RideZoneType =
  | "estate"
  | "airport"
  | "ferry"
  | "hotel"
  | "beach"
  | "marina"
  | "downtown"
  | "custom";

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
    text.includes("hotel") ||
    text.includes("resort") ||
    text.includes("villa")
  ) {
    return "hotel";
  }

  if (text.includes("beach") || text.includes("bay")) {
    return "beach";
  }

  if (
    text.includes("charlotte amalie") ||
    text.includes("christiansted") ||
    text.includes("frederiksted") ||
    text.includes("cruz bay")
  ) {
    return "downtown";
  }

  return "estate";
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();

    if (!raw.trim()) {
      return NextResponse.json(
        { error: "Empty request body." },
        { status: 400 }
      );
    }

    const body = JSON.parse(raw) as EstimateRequestBody;

    if (
      !body?.pickup ||
      !body?.dropoff ||
      typeof body.pickup.lat !== "number" ||
      typeof body.pickup.lng !== "number" ||
      typeof body.dropoff.lat !== "number" ||
      typeof body.dropoff.lng !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid estimate payload." },
        { status: 400 }
      );
    }

    const pickupEstate = findNearestEstate(body.pickup.lat, body.pickup.lng);
    const dropoffEstate = findNearestEstate(body.dropoff.lat, body.dropoff.lng);

    const pickup = {
      label: body.pickup.label,
      addressText: body.pickup.addressText ?? null,
      lat: body.pickup.lat,
      lng: body.pickup.lng,
      estateGeoid: pickupEstate?.geoid ?? null,
      estateName: pickupEstate?.name ?? null,
      islandCode: pickupEstate?.islandCode ?? "UNK",
      zoneType: inferZoneType(body.pickup.label),
    };

    const dropoff = {
      label: body.dropoff.label,
      addressText: body.dropoff.addressText ?? null,
      lat: body.dropoff.lat,
      lng: body.dropoff.lng,
      estateGeoid: dropoffEstate?.geoid ?? null,
      estateName: dropoffEstate?.name ?? null,
      islandCode: dropoffEstate?.islandCode ?? "UNK",
      zoneType: inferZoneType(body.dropoff.label),
    };

    const distanceMiles = haversineMiles(
      pickup.lat,
      pickup.lng,
      dropoff.lat,
      dropoff.lng
    );

    const sameEstate =
      Boolean(pickup.estateGeoid) && pickup.estateGeoid === dropoff.estateGeoid;

    const sameIsland = pickup.islandCode === dropoff.islandCode;

    const routeClass = classifyRoute({
      pickupZoneType: pickup.zoneType,
      dropoffZoneType: dropoff.zoneType,
      pickupIslandCode: pickup.islandCode,
      dropoffIslandCode: dropoff.islandCode,
      sameEstate,
      distanceMiles,
    });

    const pricing = estimateRidePrice({
      distanceMiles,
      routeClass,
      pickupZoneType: pickup.zoneType,
      dropoffZoneType: dropoff.zoneType,
      sameEstate,
    });

    return NextResponse.json({
      pickup,
      dropoff,
      pricing,
      routeMeta: {
        sameEstate,
        sameIsland,
        estimatedDistanceMiles: Math.round(distanceMiles * 100) / 100,
        routeClass,
        matchedRouteLabel: `${pickup.label} → ${dropoff.label}`,
      },
    });
  } catch (error) {
    console.error("Ride estimate error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to build ride estimate.",
      },
      { status: 500 }
    );
  }
}
