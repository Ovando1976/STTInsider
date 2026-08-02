import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/openvi-admin";

type IslandCode = "stt" | "stj" | "stx";

type FirestoreEstateDoc = {
  geoid?: string;
  name?: string;
  basename?: string;
  state?: string;
  county?: string;
  island?: string;
  centroid?: {
    lat?: number;
    lng?: number;
  };
  interiorPoint?: {
    lat?: number;
    lng?: number;
  };
  internalPoint?: {
    lat?: number;
    lng?: number;
  };
  geometry?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
};

type AppEstateFeatureProperties = {
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
};

type AppEstateFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  AppEstateFeatureProperties
> & {
  id: string;
};

type AppEstateCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  AppEstateFeatureProperties
>;

function normalizeIsland(value: unknown, county?: string): IslandCode {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "stt" ||
      normalized === "st. thomas" ||
      normalized === "st thomas" ||
      normalized === "saint thomas" ||
      normalized === "st. thomas and water island"
    ) {
      return "stt";
    }

    if (
      normalized === "stj" ||
      normalized === "st. john" ||
      normalized === "st john" ||
      normalized === "saint john"
    ) {
      return "stj";
    }

    if (
      normalized === "stx" ||
      normalized === "st. croix" ||
      normalized === "st croix" ||
      normalized === "saint croix"
    ) {
      return "stx";
    }

    if (normalized === "water island") {
      return "stt";
    }
  }

  if (county === "030") return "stt";
  if (county === "020") return "stj";
  return "stx";
}

function hasRenderableGeometry(
  geometry: unknown
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (!geometry || typeof geometry !== "object") return false;
  const type = (geometry as { type?: string }).type;
  return type === "Polygon" || type === "MultiPolygon";
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("usvi_estates").get();

    const features: AppEstateFeature[] = snapshot.docs
      .map((doc) => {
        const data = doc.data() as FirestoreEstateDoc;

        const geometry = data.geometry;
        if (!hasRenderableGeometry(geometry)) {
          return null;
        }

        const geoid = String(data.geoid ?? doc.id).trim();
        const county = String(data.county ?? "").trim();
        const baseName = String(data.basename ?? "").trim();
        const fullName = String(data.name ?? data.basename ?? geoid).trim();
        const internalPoint = data.internalPoint ?? data.interiorPoint ?? {};

        const feature: AppEstateFeature = {
          type: "Feature",
          id: geoid,
          geometry,
          properties: {
            id: geoid,
            geoid,
            estateCode: geoid,
            baseName,
            fullName,
            county,
            island: normalizeIsland(data.island, county),
            centroid: {
              lat:
                typeof data.centroid?.lat === "number"
                  ? data.centroid.lat
                  : null,
              lng:
                typeof data.centroid?.lng === "number"
                  ? data.centroid.lng
                  : null,
            },
            internalPoint: {
              lat:
                typeof internalPoint.lat === "number"
                  ? internalPoint.lat
                  : null,
              lng:
                typeof internalPoint.lng === "number"
                  ? internalPoint.lng
                  : null,
            },
          },
        };

        return feature;
      })
      .filter((feature): feature is AppEstateFeature => Boolean(feature));

    const payload: AppEstateCollection = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to read usvi_estates from Firestore", error);

    return NextResponse.json(
      {
        error: "Failed to load estate geometry from Firestore.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
