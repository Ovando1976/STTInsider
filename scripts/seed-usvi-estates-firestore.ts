import { readFile } from "node:fs/promises";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { BulkWriter, getFirestore } from "firebase-admin/firestore";
import { geohashForLocation } from "geofire-common";

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

type FirestoreEstateDoc = {
  geoid: string;
  name: string;
  basename: string;
  normalizedName: string;
  normalizedBasename: string;
  aliases: string[];
  state: string;
  county: string;
  countyCode: string;
  island: UsviEstate["island"];
  islandCode: "STX" | "STJ" | "STT" | "WAT" | "UNK";
  centroid: {
    lat: number | null;
    lng: number | null;
  };
  interiorPoint: {
    lat: number | null;
    lng: number | null;
  };
  marker: {
    lat: number | null;
    lng: number | null;
  };
  geohash: string | null;
  location: {
    latitude: number | null;
    longitude: number | null;
  };
  searchText: string;
  searchTerms: string[];
  source: {
    provider: string;
    layer: string;
    year: number;
  };
  createdAt: string;
  updatedAt: string;
};

function ensureFirebaseAdmin() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        [
          "Missing Firebase Admin credentials.",
          "Set these environment variables:",
          "FIREBASE_PROJECT_ID",
          "FIREBASE_CLIENT_EMAIL",
          "FIREBASE_PRIVATE_KEY",
        ].join("\n")
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return getFirestore();
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function mapCountyToIslandCode(
  county: string
): FirestoreEstateDoc["islandCode"] {
  switch (county) {
    case "010":
      return "STX";
    case "020":
      return "STJ";
    case "030":
      return "STT";
    default:
      return "UNK";
  }
}

function buildAliases(estate: UsviEstate): string[] {
  const aliases = new Set<string>();

  if (estate.name) aliases.add(estate.name);
  if (estate.basename) aliases.add(estate.basename);

  const trimmedName = estate.name.replace(/\s+Estate$/i, "").trim();
  const trimmedBase = estate.basename.replace(/\s+Estate$/i, "").trim();

  if (trimmedName) aliases.add(trimmedName);
  if (trimmedBase) aliases.add(trimmedBase);

  return [...aliases];
}

function chooseMarker(estate: UsviEstate) {
  if (estate.interiorPoint.lat !== null && estate.interiorPoint.lng !== null) {
    return estate.interiorPoint;
  }

  return estate.centroid;
}

function toFirestoreDoc(estate: UsviEstate): FirestoreEstateDoc {
  const aliases = buildAliases(estate);
  const marker = chooseMarker(estate);
  const now = new Date().toISOString();

  const searchTerms = [
    estate.geoid,
    estate.name,
    estate.basename,
    estate.island,
    estate.county,
    ...aliases,
    ...aliases.map(normalizeText),
  ].filter(Boolean);

  const geohash =
    marker.lat !== null && marker.lng !== null
      ? geohashForLocation([marker.lat, marker.lng])
      : null;

  return {
    geoid: estate.geoid,
    name: estate.name,
    basename: estate.basename,
    normalizedName: normalizeText(estate.name),
    normalizedBasename: normalizeText(estate.basename),
    aliases,
    state: estate.state,
    county: estate.county,
    countyCode: estate.county,
    island: estate.island,
    islandCode: mapCountyToIslandCode(estate.county),
    centroid: estate.centroid,
    interiorPoint: estate.interiorPoint,
    marker,
    geohash,
    location: {
      latitude: marker.lat,
      longitude: marker.lng,
    },
    searchText: searchTerms.join(" ").toLowerCase(),
    searchTerms,
    source: {
      provider: "U.S. Census Bureau TIGERweb",
      layer: "Places_CouSub_ConCity_SubMCD/MapServer/0",
      year: 2025,
    },
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  const db = ensureFirebaseAdmin();

  const jsonPath = path.resolve(process.cwd(), "data", "usvi-estates.json");
  const raw = await readFile(jsonPath, "utf8");
  const estates = JSON.parse(raw) as UsviEstate[];

  if (!Array.isArray(estates) || estates.length === 0) {
    throw new Error(`No estates found in ${jsonPath}`);
  }

  const writer: BulkWriter = db.bulkWriter();

  writer.onWriteError((error) => {
    console.error(
      `Write failed: ${error.documentRef.path} :: ${error.message}`
    );
    return error.failedAttempts < 3;
  });

  for (const estate of estates) {
    const doc = toFirestoreDoc(estate);
    writer.set(db.collection("usvi_estates").doc(doc.geoid), doc, {
      merge: true,
    });
  }

  await writer.close();

  console.log(`Seeded ${estates.length} docs into usvi_estates`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
