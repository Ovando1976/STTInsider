import { adminDb } from "@/lib/firebase/openvi-admin";

export type IslandCode = "STT" | "STJ" | "STX" | "WAT" | "UNK";

export type UsviEstateDoc = {
  geoid: string;
  name: string;
  islandCode: IslandCode;
  marker: {
    lat: number | null;
    lng: number | null;
  };
};

let estateCache: UsviEstateDoc[] | null = null;
let estateCacheLoadedAt = 0;

const CACHE_TTL_MS = 1000 * 60 * 30;

export async function getAllEstatesAdmin(
  maxResults = 500
): Promise<UsviEstateDoc[]> {
  const now = Date.now();

  if (estateCache && now - estateCacheLoadedAt < CACHE_TTL_MS) {
    return estateCache.slice(0, maxResults);
  }

  const snapshot = await adminDb
    .collection("usvi_estates")
    .orderBy("name", "asc")
    .limit(maxResults)
    .get();

  estateCache = snapshot.docs.map((doc) => {
    const data = doc.data() as UsviEstateDoc;
    return {
      ...data,
      geoid: data.geoid || doc.id,
    };
  });

  estateCacheLoadedAt = now;

  return estateCache;
}
