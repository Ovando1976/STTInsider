import type { GeoPoint } from "firebase-admin/firestore";

export type IslandCode = "stt" | "stj" | "stx";

export type RawEstateDoc = {
  geoid?: string;
  GEOID?: string;

  estateCode?: string;
  ESTATE?: string;

  baseName?: string;
  basename?: string;
  BASENAME?: string;

  fullName?: string;
  name?: string;
  NAME?: string;

  county?: string;
  countyCode?: string;
  COUNTY?: string;

  geometryJson?: string | GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;

  centroid?:
    | { lat?: number; lng?: number }
    | { latitude?: number; longitude?: number }
    | GeoPoint
    | null;

  internalPoint?:
    | { lat?: number; lng?: number }
    | { latitude?: number; longitude?: number }
    | GeoPoint
    | null;

  interiorPoint?:
    | { lat?: number; lng?: number }
    | { latitude?: number; longitude?: number }
    | GeoPoint
    | null;

  aliases?: unknown;
};

export type NormalizedEstateFeatureProperties = {
  id: string;
  geoid: string;
  estateCode: string;
  baseName: string;
  fullName: string;
  county: string;
  island: IslandCode;
  centroid: {
    lat: number | null;
    lng: number | null;
  };
  internalPoint: {
    lat: number | null;
    lng: number | null;
  };
  aliases: string[];
};

export type NormalizedEstateFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  NormalizedEstateFeatureProperties
> & {
  id: string;
};

export type NormalizedEstateCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  NormalizedEstateFeatureProperties
>;

function countyToIsland(county: string | undefined): IslandCode {
  const normalized = String(county ?? "").trim();
  if (normalized === "030") return "stt";
  if (normalized === "020") return "stj";
  return "stx";
}

function toStringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizePoint(
  value:
    | { lat?: number; lng?: number }
    | { latitude?: number; longitude?: number }
    | GeoPoint
    | null
    | undefined
): { lat: number | null; lng: number | null } {
  if (!value) {
    return { lat: null, lng: null };
  }

  if ("latitude" in value && "longitude" in value) {
    return {
      lat: toNumberOrNull(value.latitude),
      lng: toNumberOrNull(value.longitude),
    };
  }

  return {
    lat: toNumberOrNull((value as { lat?: number }).lat),
    lng: toNumberOrNull((value as { lng?: number }).lng),
  };
}

function normalizeAliases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parseGeometry(
  value: unknown
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as GeoJSON.Geometry;
      if (parsed?.type === "Polygon" || parsed?.type === "MultiPolygon") {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    const geometry = value as GeoJSON.Geometry;
    if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") {
      return geometry;
    }
  }

  return null;
}

export function normalizeEstateDoc(
  raw: RawEstateDoc
): NormalizedEstateFeature | null {
  const geoid = toStringValue(raw.geoid, raw.GEOID);
  const estateCode = toStringValue(raw.estateCode, raw.ESTATE);
  const id = geoid || estateCode;

  const baseName = toStringValue(raw.baseName, raw.basename, raw.BASENAME);
  const fullName = toStringValue(
    raw.fullName,
    raw.name,
    raw.NAME,
    baseName,
    estateCode,
    geoid
  );

  const county = toStringValue(raw.county, raw.countyCode, raw.COUNTY);
  const island = countyToIsland(county);

  const centroid = normalizePoint(raw.centroid);
  const internalPoint = normalizePoint(raw.internalPoint ?? raw.interiorPoint);

  const geometry = parseGeometry(raw.geometryJson ?? raw.geometry);
  if (!id || !geometry) return null;

  return {
    type: "Feature",
    id,
    geometry,
    properties: {
      id,
      geoid,
      estateCode,
      baseName,
      fullName,
      county,
      island,
      centroid,
      internalPoint,
      aliases: normalizeAliases(raw.aliases),
    },
  };
}

export function normalizeEstateDocs(
  docs: RawEstateDoc[]
): NormalizedEstateCollection {
  return {
    type: "FeatureCollection",
    features: docs
      .map(normalizeEstateDoc)
      .filter((feature): feature is NormalizedEstateFeature =>
        Boolean(feature)
      ),
  };
}
