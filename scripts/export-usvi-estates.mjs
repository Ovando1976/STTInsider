import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function countyToIsland(county) {
  if (String(county).trim() === "030") return "stt";
  if (String(county).trim() === "020") return "stj";
  return "stx";
}

function normalizePoint(value) {
  if (!value) return { lat: null, lng: null };

  if (
    typeof value.latitude === "number" &&
    typeof value.longitude === "number"
  ) {
    return { lat: value.latitude, lng: value.longitude };
  }

  return {
    lat: typeof value.lat === "number" ? value.lat : null,
    lng: typeof value.lng === "number" ? value.lng : null,
  };
}

function parseGeometry(value) {
  if (!value) return null;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.type === "Polygon" || parsed?.type === "MultiPolygon") {
        return parsed;
      }
    } catch {}
    return null;
  }

  if (value?.type === "Polygon" || value?.type === "MultiPolygon") {
    return value;
  }

  return null;
}

function normalizeEstate(raw, fallbackId) {
  const geoid = raw.geoid || fallbackId || "";
  const estateCode = raw.estateCode || raw.ESTATE || "";
  const id = geoid || estateCode;
  const baseName = raw.baseName || raw.basename || raw.BASENAME || "";
  const fullName =
    raw.fullName || raw.name || raw.NAME || baseName || estateCode || geoid;
  const county = raw.county || raw.countyCode || raw.COUNTY || "";
  const geometry = parseGeometry(raw.geometryJson || raw.geometry);

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
      island: countyToIsland(county),
      centroid: normalizePoint(raw.centroid),
      internalPoint: normalizePoint(raw.internalPoint || raw.interiorPoint),
      aliases: Array.isArray(raw.aliases)
        ? raw.aliases.filter((x) => typeof x === "string")
        : [],
    },
  };
}

async function main() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: required("FIREBASE_PROJECT_ID"),
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });
  }

  const db = getFirestore();
  const snap = await db.collection("usvi_estates").get();

  const features = snap.docs
    .map((doc) => normalizeEstate(doc.data(), doc.id))
    .filter(Boolean);

  const output = {
    type: "FeatureCollection",
    features,
  };

  const outPath = path.join(root, "data", "usvi-estates-firestore.geojson");
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

  console.log(`Wrote ${features.length} estate features to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
