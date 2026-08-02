import { NextResponse } from "next/server";

import { STT_BUSINESSES } from "@/lib/stt/data";
import type { UnifiedPlace } from "@/types/unified-place";

type ConciergeRequest = {
  prompt?: string;
  selectedPlace?: UnifiedPlace | null;
  profile?: {
    duration?: string;
    vibe?: string;
  };
};

function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildSourcedConciergeResponse(payload: ConciergeRequest) {
  const prompt = payload.prompt?.trim() ?? "";
  const place = payload.selectedPlace;
  const duration = payload.profile?.duration ?? "4 hours";
  const vibe = payload.profile?.vibe ?? "local-casual";
  const placeTitle = place?.title ?? "Charlotte Amalie";

  const nearby = [...STT_BUSINESSES]
    .map((business) => {
      const hasPlaceCoords =
        typeof place?.lat === "number" &&
        Number.isFinite(place.lat) &&
        typeof place?.lng === "number" &&
        Number.isFinite(place.lng);

      const hasBusinessCoords =
        typeof business.lat === "number" &&
        Number.isFinite(business.lat) &&
        typeof business.lng === "number" &&
        Number.isFinite(business.lng);

      const km =
        hasPlaceCoords && hasBusinessCoords
          ? distanceKm(place.lat!, place.lng!, business.lat, business.lng)
          : Number.POSITIVE_INFINITY;

      return { business, km };
    })
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  const sourcedLines = nearby.map(({ business }, index) => {
    const distanceLabel = Number.isFinite(nearby[index]!.km)
      ? `${nearby[index]!.km.toFixed(1)} km away`
      : "distance unknown";
    return `${business.name} (${business.category}) · ${business.location} · ${distanceLabel}`;
  });

  const answer = [
    `Plan profile: ${duration}, ${vibe} vibe.`,
    `Based on your request${prompt ? ` (“${prompt}”)` : ""}, anchor around ${placeTitle} and sequence one activity, one meal, and one scenic closeout.`,
    sourcedLines.length > 0
      ? `Best nearby candidates:\n- ${sourcedLines.join("\n- ")}`
      : "No nearby candidate sources were available in the current dataset.",
  ].join("\n\n");

  return {
    answer,
    sources: sourcedLines,
  };
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ConciergeRequest;
  return NextResponse.json(buildSourcedConciergeResponse(payload));
}

