#!/usr/bin/env tsx

import fs from "node:fs/promises";
import path from "node:path";
import * as turf from "@turf/turf";

type IslandCode = "stt" | "stj" | "stx";

type RawProps = Record<string, unknown>;

type ParcelProperties = {
  parcelId: string;
  sourceParcelId?: string;
  plotNumber?: string;
  lotNumber?: string;
  blockNumber?: string;
  estateName?: string;
  island: IslandCode | "unknown";
  address?: string;
  ownerName?: string;
  estateGeoid?: string | null;
  areaSqMeters?: number | null;
  centroid: { lat: number | null; lng: number | null };
  bbox: [number, number, number, number] | null;
  source: string;
  sourceLayer?: string;
  lastIngestedAt: string;
};

type ParcelFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelProperties
>;

type ParcelCollection = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  ParcelProperties
>;

type EstateProps = {
  id: string;
  geoid: string;
  estateCode?: string;
  baseName?: string;
  fullName?: string;
  island: IslandCode;
};

type EstateFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  EstateProps
>;

const ROOT = process.cwd();
const INPUT_PATH = path.join(ROOT, "data", "usvi-parcels.raw.geojson");
const ESTATES_PATH = path.join(ROOT, "data", "usvi-estates-firestore.json");
const OUTPUT_GEOJSON_PATH = path.join(
  ROOT,
  "data",
  "usvi-parcels.normalized.geojson"
);
const OUTPUT_INDEX_PATH = path.join(ROOT, "data", "usvi-parcels.index.json");

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value)
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function inferIslandFromProps(props: RawProps): IslandCode | "unknown" {
  const candidates = [
    props.island,
    props.Island,
    props.ISLAND,
    props.district,
    props.DISTRICT,
    props.county,
    props.COUNTY,
    props.address,
    props.ADDRESS,
    props.estate_name,
    props.ESTATE_NAME,
  ];

  const joined = candidates.map((v) => normalizeKey(v)).join(" ");

  if (
    joined.includes("st thomas") ||
    joined.includes("saint thomas") ||
    joined.includes("stt")
  ) {
    return "stt";
  }

  if (
    joined.includes("st john") ||
    joined.includes("saint john") ||
    joined.includes("stj")
  ) {
    return "stj";
  }

  if (
    joined.includes("st croix") ||
    joined.includes("saint croix") ||
    joined.includes("stx")
  ) {
    return "stx";
  }

  return "unknown";
}

function firstDefined(
  props: RawProps,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = asString(props[key]);
    if (value) return value;
  }
  return undefined;
}

function extractParcelId(props: RawProps, fallbackIndex: number): string {
  return (
    firstDefined(props, [
      "parcelId",
      "PARCELID",
      "PARCEL_ID",
      "OBJECTID",
      "OBJECTID_1",
      "GLOBALID",
      "PIN",
      "pin",
      "PROP_ID",
      "PROPERTY_ID",
      "id",
      "ID",
    ]) ?? `parcel-${fallbackIndex + 1}`
  );
}

function extractAddress(props: RawProps): string | undefined {
  return firstDefined(props, [
    "address",
    "ADDRESS",
    "site_addr",
    "SITE_ADDR",
    "property_address",
    "PROPERTY_ADDRESS",
    "situs",
    "SITUS",
    "location",
    "LOCATION",
  ]);
}

function extractOwnerName(props: RawProps): string | undefined {
  return firstDefined(props, [
    "owner",
    "OWNER",
    "owner_name",
    "OWNER_NAME",
    "taxpayer",
    "TAXPAYER",
  ]);
}

function isRenderableParcelGeometry(
  geometry: GeoJSON.Geometry | null | undefined
): geometry is GeoJSON.Polygon | GeoJSON.MultiPolygon {
  return Boolean(
    geometry &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
  );
}

function loadJson<T>(filePath: string): Promise<T> {
  return fs.readFile(filePath, "utf8").then((text) => JSON.parse(text) as T);
}

function getCentroid(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
) {
  try {
    const center = turf.centroid(feature);
    const [lng, lat] = center.geometry.coordinates;
    return {
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  } catch {
    return { lat: null, lng: null };
  }
}

function getBBox(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): [number, number, number, number] | null {
  try {
    const bbox = turf.bbox(feature);
    return bbox.length === 4
      ? [bbox[0], bbox[1], bbox[2], bbox[3]]
      : null;
  } catch {
    return null;
  }
}

function getAreaSqMeters(
  feature: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
): number | null {
  try {
    const area = turf.area(feature);
    return Number.isFinite(area) ? area : null;
  } catch {
    return null;
  }
}

function buildEstateSpatialIndex(
  estates: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, EstateProps>
) {
  return estates.features.map((feature) => ({
    feature,
    bbox: turf.bbox(feature),
  }));
}

function bboxContainsPoint(
  bbox: number[],
  lng: number,
  lat: number
): boolean {
  return lng >= bbox[0] && lat >= bbox[1] && lng <= bbox[2] && lat <= bbox[3];
}

function assignEstateGeoid(
  parcel:
    | GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
    | ParcelFeature,
  estateIndex: Array<{
    feature: EstateFeature;
    bbox: number[];
  }>
): string | null {
  const centroid = getCentroid(parcel);

  if (
    typeof centroid.lng === "number" &&
    typeof centroid.lat === "number"
  ) {
    const pt = turf.point([centroid.lng, centroid.lat]);

    for (const estate of estateIndex) {
      if (!bboxContainsPoint(estate.bbox, centroid.lng, centroid.lat)) {
        continue;
      }

      if (turf.booleanPointInPolygon(pt, estate.feature)) {
        return estate.feature.properties.geoid;
      }
    }
  }

  for (const estate of estateIndex) {
    try {
      if (turf.booleanIntersects(parcel, estate.feature)) {
        return estate.feature.properties.geoid;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function main() {
  const raw = await loadJson<GeoJSON.FeatureCollection>(INPUT_PATH);
  const estatesRaw = await loadJson<
    GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon, EstateProps>
  >(ESTATES_PATH);

  const estateFeatures: EstateFeature[] = (estatesRaw.features ?? []).filter(
    (feature): feature is EstateFeature =>
      Boolean(
        feature?.properties?.geoid &&
          feature?.properties?.island &&
          isRenderableParcelGeometry(feature.geometry)
      )
  );

  const estateIndex = buildEstateSpatialIndex({
    type: "FeatureCollection",
    features: estateFeatures,
  });

  const now = new Date().toISOString();

  const normalizedFeatures: ParcelFeature[] = (raw.features ?? [])
    .filter(
      (feature): feature is GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, RawProps> =>
        Boolean(feature?.properties && isRenderableParcelGeometry(feature.geometry))
    )
    .map((feature, index) => {
      const props = feature.properties ?? {};
      const parcelId = extractParcelId(props, index);
      const island = inferIslandFromProps(props);
      const plotNumber = firstDefined(props, [
        "plotNumber",
        "PLOTNUMBER",
        "PLOT_NO",
        "plot_no",
        "plot",
        "PLOT",
        "taxmap",
        "TAXMAP",
      ]);
      const lotNumber = firstDefined(props, [
        "lot",
        "LOT",
        "lotNumber",
        "LOTNUMBER",
        "lot_no",
        "LOT_NO",
      ]);
      const blockNumber = firstDefined(props, [
        "block",
        "BLOCK",
        "blockNumber",
        "BLOCKNUMBER",
        "block_no",
        "BLOCK_NO",
      ]);
      const estateName = firstDefined(props, [
        "estate",
        "ESTATE",
        "estate_name",
        "ESTATE_NAME",
      ]);

      const centroid = getCentroid(feature);
      const bbox = getBBox(feature);
      const estateGeoid = assignEstateGeoid(feature, estateIndex);

      return {
        type: "Feature",
        id: parcelId,
        geometry: feature.geometry,
        properties: {
          parcelId,
          sourceParcelId: firstDefined(props, [
            "sourceParcelId",
            "PARCEL_ID",
            "PIN",
            "GLOBALID",
            "OBJECTID",
          ]),
          plotNumber,
          lotNumber,
          blockNumber,
          estateName,
          island,
          address: extractAddress(props),
          ownerName: extractOwnerName(props),
          estateGeoid,
          areaSqMeters: getAreaSqMeters(feature),
          centroid,
          bbox,
          source: "usvi-official-parcels",
          sourceLayer: firstDefined(props, ["layer", "LAYER"]),
          lastIngestedAt: now,
        },
      };
    });

  const normalized: ParcelCollection = {
    type: "FeatureCollection",
    features: normalizedFeatures,
  };

  const parcelIndex = normalizedFeatures.map((feature) => ({
    parcelId: feature.properties.parcelId,
    geoid: feature.properties.estateGeoid,
    island: feature.properties.island,
    address: feature.properties.address ?? null,
    plotNumber: feature.properties.plotNumber ?? null,
    lotNumber: feature.properties.lotNumber ?? null,
    blockNumber: feature.properties.blockNumber ?? null,
    centroid: feature.properties.centroid,
    bbox: feature.properties.bbox,
  }));

  await fs.mkdir(path.dirname(OUTPUT_GEOJSON_PATH), { recursive: true });
  await fs.writeFile(
    OUTPUT_GEOJSON_PATH,
    JSON.stringify(normalized, null, 2),
    "utf8"
  );
  await fs.writeFile(
    OUTPUT_INDEX_PATH,
    JSON.stringify(parcelIndex, null, 2),
    "utf8"
  );

  const matched = normalizedFeatures.filter(
    (f) => f.properties.estateGeoid
  ).length;

  console.log(`Normalized parcels: ${normalizedFeatures.length}`);
  console.log(`Matched to estates: ${matched}`);
  console.log(`Wrote: ${OUTPUT_GEOJSON_PATH}`);
  console.log(`Wrote: ${OUTPUT_INDEX_PATH}`);
}

main().catch((error) => {
  console.error("Parcel ingest failed:", error);
  process.exit(1);
});