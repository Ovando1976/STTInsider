import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type ArcGisFeature = {
  attributes: {
    GEOID?: string;
    NAME?: string;
    BASENAME?: string;
    STATE?: string;
    COUNTY?: string;
    CENTLAT?: string | number;
    CENTLON?: string | number;
    INTPTLAT?: string | number;
    INTPTLON?: string | number;
  };
};

type ArcGisResponse = {
  features?: ArcGisFeature[];
  error?: {
    code?: number;
    message?: string;
    details?: string[];
  };
};

type UsviEstate = {
  geoid: string;
  name: string;
  basename: string;
  state: string;
  county: string;
  island: "St. Croix" | "St. John" | "St. Thomas" | "Water Island" | "Unknown";
  centroid: {
    lat: number | null;
    lng: number | null;
  };
  interiorPoint: {
    lat: number | null;
    lng: number | null;
  };
};

const ESTATES_LAYER_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/0/query";
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function guessIsland(county: string, name: string): UsviEstate["island"] {
  switch (county) {
    case "010":
      return "St. Croix";
    case "020":
      return "St. John";
    case "030":
      return name.toLowerCase().includes("water island")
        ? "Water Island"
        : "St. Thomas";
    default:
      return "Unknown";
  }
}

function normalizeEstate(feature: ArcGisFeature): UsviEstate {
  const attrs = feature.attributes ?? {};
  const county = String(attrs.COUNTY ?? "").padStart(3, "0");
  const name = String(attrs.NAME ?? attrs.BASENAME ?? "").trim();
  const basename = String(attrs.BASENAME ?? name).trim();

  return {
    geoid: String(attrs.GEOID ?? "").trim(),
    name,
    basename,
    state: String(attrs.STATE ?? "").trim(),
    county,
    island: guessIsland(county, name),
    centroid: {
      lat: toNumber(attrs.CENTLAT),
      lng: toNumber(attrs.CENTLON),
    },
    interiorPoint: {
      lat: toNumber(attrs.INTPTLAT),
      lng: toNumber(attrs.INTPTLON),
    },
  };
}

async function fetchAllUsviEstates(): Promise<UsviEstate[]> {
  const params = new URLSearchParams({
    where: "STATE='78'",
    returnGeometry: "false",
    outFields:
      "GEOID,NAME,BASENAME,STATE,COUNTY,CENTLAT,CENTLON,INTPTLAT,INTPTLON",
    orderByFields: "NAME ASC",
    f: "json",
  });

  const response = await fetch(`${ESTATES_LAYER_URL}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ArcGisResponse;

  if (data.error) {
    throw new Error(
      `ArcGIS error ${data.error.code ?? ""}: ${
        data.error.message ?? "Unknown"
      } ${data.error.details?.join(" | ") ?? ""}`.trim()
    );
  }

  const estates = (data.features ?? [])
    .map(normalizeEstate)
    .filter((estate) => estate.geoid && estate.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  return estates;
}

async function main() {
  const estates = await fetchAllUsviEstates();

  const outputDir = path.resolve(process.cwd(), "data");
  const outputPath = path.join(outputDir, "usvi-estates.json");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(estates, null, 2), "utf8");

  const summary = estates.reduce<Record<string, number>>((acc, estate) => {
    acc[estate.island] = (acc[estate.island] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Saved ${estates.length} estates to ${outputPath}`);
  console.log("Breakdown by island:", summary);
  console.log("First 5:", estates.slice(0, 5));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
