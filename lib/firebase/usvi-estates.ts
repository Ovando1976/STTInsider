import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  endAt,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./client";

export type IslandCode = "STT" | "STJ" | "STX" | "WAT" | "UNK";

export type UsviEstateDoc = {
  geoid: string;
  name: string;
  basename: string;
  normalizedName: string;
  normalizedBasename: string;
  aliases: string[];
  state: string;
  county: string;
  countyCode: string;
  island: "St. Croix" | "St. John" | "St. Thomas" | "Water Island" | "Unknown";
  islandCode: IslandCode;
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

const ESTATES_COLLECTION = "usvi_estates";

function estatesCollection() {
  return collection(db, ESTATES_COLLECTION);
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

function mapEstateDoc(
  snapshot: QueryDocumentSnapshot<DocumentData>
): UsviEstateDoc {
  const data = snapshot.data() as UsviEstateDoc;

  return {
    ...data,
    geoid: data.geoid || snapshot.id,
  };
}

export async function getAllEstates(
  maxResults = 500
): Promise<UsviEstateDoc[]> {
  const q = query(
    estatesCollection(),
    orderBy("name", "asc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEstateDoc);
}

export async function getEstateByGeoid(
  geoid: string
): Promise<UsviEstateDoc | null> {
  const ref = doc(db, ESTATES_COLLECTION, geoid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as UsviEstateDoc;

  return {
    ...data,
    geoid: data.geoid || snapshot.id,
  };
}

export async function getEstatesByIsland(
  islandCode: Extract<IslandCode, "STT" | "STJ" | "STX" | "WAT">,
  maxResults = 300
): Promise<UsviEstateDoc[]> {
  const q = query(
    estatesCollection(),
    where("islandCode", "==", islandCode),
    orderBy("name", "asc"),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEstateDoc);
}

export async function searchEstatesByName(
  rawQuery: string,
  maxResults = 25
): Promise<UsviEstateDoc[]> {
  const normalized = normalizeText(rawQuery);

  if (!normalized) {
    return [];
  }

  const q = query(
    estatesCollection(),
    orderBy("normalizedName"),
    startAt(normalized),
    endAt(`${normalized}\uf8ff`),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapEstateDoc);
}

export async function searchEstates(
  rawQuery: string,
  maxResults = 25
): Promise<UsviEstateDoc[]> {
  const normalized = normalizeText(rawQuery);

  if (!normalized) {
    return [];
  }

  const prefixMatches = await searchEstatesByName(rawQuery, maxResults);

  if (prefixMatches.length >= maxResults) {
    return prefixMatches.slice(0, maxResults);
  }

  const snapshot = await getDocs(
    query(estatesCollection(), orderBy("name", "asc"), limit(500))
  );

  const seen = new Map<string, UsviEstateDoc>();

  for (const docSnap of snapshot.docs) {
    const estate = mapEstateDoc(docSnap);

    const haystack = [
      estate.name,
      estate.basename,
      estate.normalizedName,
      estate.normalizedBasename,
      estate.island,
      estate.countyCode,
      estate.geoid,
      ...(estate.aliases || []),
      ...(estate.searchTerms || []),
    ]
      .join(" ")
      .toLowerCase();

    if (haystack.includes(normalized)) {
      seen.set(estate.geoid, estate);
    }
  }

  for (const estate of prefixMatches) {
    seen.set(estate.geoid, estate);
  }

  return [...seen.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, maxResults);
}

export function getEstateCoordinates(estate: UsviEstateDoc): {
  lat: number | null;
  lng: number | null;
} {
  if (
    estate.marker?.lat !== null &&
    estate.marker?.lat !== undefined &&
    estate.marker?.lng !== null &&
    estate.marker?.lng !== undefined
  ) {
    return {
      lat: estate.marker.lat,
      lng: estate.marker.lng,
    };
  }

  if (
    estate.interiorPoint?.lat !== null &&
    estate.interiorPoint?.lat !== undefined &&
    estate.interiorPoint?.lng !== null &&
    estate.interiorPoint?.lng !== undefined
  ) {
    return {
      lat: estate.interiorPoint.lat,
      lng: estate.interiorPoint.lng,
    };
  }

  return {
    lat: estate.centroid?.lat ?? null,
    lng: estate.centroid?.lng ?? null,
  };
}
