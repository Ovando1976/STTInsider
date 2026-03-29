import type { Business } from "@/types/stt";
import type {
  UnifiedPlace,
  UnifiedIsland,
  UnifiedCategory,
} from "@/types/unified-place";

type CommunityEstatePayload = {
  estateGeoid: string | null;
  estateName: string | null;
  island?: string;
  lat?: number | null;
  lng?: number | null;
};

type CommunityEventPayload = {
  id: string;
  title: string;
  location?: string;
  vibe?: string;
  island?: string;
  estateGeoid?: string | null;
  estateName?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type TransitLocationPayload = {
  id?: string;
  name: string;
  island?: string;
  kind?: string;
  routeLabel?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

function normalizeIsland(value?: string | null): UnifiedIsland | undefined {
  if (!value) return undefined;

  const text = value.trim().toLowerCase();

  if (
    text === "st. thomas" ||
    text === "saint thomas" ||
    text === "st thomas"
  ) {
    return "St. Thomas";
  }

  if (text === "st. john" || text === "saint john" || text === "st john") {
    return "St. John";
  }

  if (text === "st. croix" || text === "saint croix" || text === "st croix") {
    return "St. Croix";
  }

  if (text === "water island") {
    return "Water Island";
  }

  return undefined;
}

function inferIslandFromBusinessLocation(
  location?: string
): UnifiedIsland | undefined {
  if (!location) return undefined;

  const text = location.toLowerCase();

  if (text.includes("st. thomas") || text.includes("saint thomas")) {
    return "St. Thomas";
  }

  if (
    text.includes("st. john") ||
    text.includes("saint john") ||
    text.includes("cruz bay")
  ) {
    return "St. John";
  }

  if (
    text.includes("st. croix") ||
    text.includes("saint croix") ||
    text.includes("christiansted")
  ) {
    return "St. Croix";
  }

  if (text.includes("water island")) {
    return "Water Island";
  }

  return undefined;
}

function inferCategoryFromBusiness(
  business: Business
): UnifiedCategory | undefined {
  switch (business.category) {
    case "Beach":
      return "Beach";
    case "Food":
      return "Food";
    case "Shopping":
      return "Shopping";
    case "Activity":
      return "Activity";
    case "Stay":
      return "Stay";
    default:
      return undefined;
  }
}

export function businessToUnifiedPlace(business: Business): UnifiedPlace {
  const maybeBusiness = business as Business & {
    coordinates?: { lat: number; lng: number };
    island?: string;
    estateGeoid?: string | null;
    estateName?: string | null;
  };

  return {
    id: `business:${business.id}`,
    kind: "business",
    source: "discovery",
    title: business.name,
    subtitle: business.location,
    description: business.description,
    image: business.image ?? null,
    category: inferCategoryFromBusiness(business),
    island:
      normalizeIsland(maybeBusiness.island) ??
      inferIslandFromBusinessLocation(business.location),
    businessId: business.id,
    estateGeoid: maybeBusiness.estateGeoid ?? null,
    estateName: maybeBusiness.estateName ?? null,
    locationLabel: business.location,
    lat: maybeBusiness.coordinates?.lat ?? null,
    lng: maybeBusiness.coordinates?.lng ?? null,
    tags: [business.category],
  };
}

export function estateToUnifiedPlace(
  payload: CommunityEstatePayload
): UnifiedPlace {
  return {
    id: `estate:${payload.estateGeoid ?? payload.estateName ?? "unknown"}`,
    kind: "estate",
    source: "community",
    title: payload.estateName ?? "Selected Estate",
    subtitle: payload.island,
    description: payload.island
      ? `Community-selected destination in ${payload.island}.`
      : "Community-selected destination.",
    image: "/images/hero-usvi.jpg",
    island: normalizeIsland(payload.island),
    category: "Community",
    estateGeoid: payload.estateGeoid,
    estateName: payload.estateName,
    locationLabel: [payload.estateName, payload.island]
      .filter(Boolean)
      .join(", "),
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    tags: ["community", "estate"],
  };
}

export function eventToUnifiedPlace(
  event: CommunityEventPayload
): UnifiedPlace {
  return {
    id: `event:${event.id}`,
    kind: "event",
    source: "community",
    title: event.title,
    subtitle: event.location,
    description: event.vibe,
    island: normalizeIsland(event.island),
    category: "Community",
    eventId: event.id,
    estateGeoid: event.estateGeoid ?? null,
    estateName: event.estateName ?? null,
    locationLabel: event.location,
    lat: event.lat ?? null,
    lng: event.lng ?? null,
    tags: [event.vibe ?? "event"].filter(Boolean),
  };
}

export function locationToUnifiedPlace(
  location: TransitLocationPayload
): UnifiedPlace {
  return {
    id: `location:${location.id ?? location.name}`,
    kind: "location",
    source: "transit",
    title: location.name,
    subtitle: location.routeLabel,
    description: location.kind,
    island: normalizeIsland(location.island),
    category: "Activity",
    locationId: location.id,
    routeLabel: location.routeLabel,
    locationLabel: location.name,
    lat: location.coordinates?.lat ?? null,
    lng: location.coordinates?.lng ?? null,
    tags: [location.kind ?? "location"],
  };
}

export function unifiedPlaceToRideStop(place: UnifiedPlace) {
  return {
    label: place.locationLabel ?? place.title,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    estateGeoid: place.estateGeoid ?? null,
    estateName: place.estateName ?? null,
  };
}
