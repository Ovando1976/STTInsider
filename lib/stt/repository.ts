import type { Business, Checkin, MenuSection } from "@/types/stt";
import { auth, db, firebaseEnabled } from "@/lib/firebase/client";
import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { STT_PLACEHOLDER_IMAGE } from "@/lib/stt/images";

const APP_NAMESPACE = "stt-insider";

const STT_BEACH_IMAGE_MAP: Record<string, string> = {
  "magens bay": "/images/magens-bay.jpg",
  "lindquist beach": "/images/lindquist-beach.jpg",
  "coki beach": "/images/coki-beach.jpg",
  "sapphire beach": "/images/sapphire-beach.jpg",
};

function userBookmarksCollection(uid: string) {
  if (!db) return null;
  return collection(db, "apps", APP_NAMESPACE, "users", uid, "bookmarks");
}

function userCheckinsCollection(uid: string) {
  if (!db) return null;
  return collection(db, "apps", APP_NAMESPACE, "users", uid, "checkins");
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeIsland(value: unknown): string {
  const island = String(value ?? "STT")
    .trim()
    .toUpperCase();

  if (island === "ST. THOMAS" || island === "ST THOMAS") return "STT";
  if (island === "ST. JOHN" || island === "ST JOHN") return "STJ";
  if (island === "ST. CROIX" || island === "ST CROIX") return "STX";

  return island || "STT";
}

function normalizePlaceKind(kind?: string): Business["category"] {
  const value = (kind ?? "").toLowerCase();

  if (
    value.includes("food") ||
    value.includes("restaurant") ||
    value.includes("bar") ||
    value.includes("cafe") ||
    value.includes("coffee")
  ) {
    return "Food";
  }

  if (
    value.includes("shop") ||
    value.includes("store") ||
    value.includes("market") ||
    value.includes("mall")
  ) {
    return "Shopping";
  }

  if (
    value.includes("stay") ||
    value.includes("hotel") ||
    value.includes("resort") ||
    value.includes("villa") ||
    value.includes("inn") ||
    value.includes("guesthouse")
  ) {
    return "Stay";
  }

  if (value.includes("beach")) {
    return "Beach";
  }

  return "Activity";
}

function resolveFirestoreImagePath(params: {
  imageUrl?: unknown;
  name?: unknown;
  category?: Business["category"];
}): string {
  const image = String(params.imageUrl ?? "").trim();
  const normalizedName = normalizeKey(params.name);

  if (
    params.category === "Beach" &&
    normalizedName &&
    STT_BEACH_IMAGE_MAP[normalizedName]
  ) {
    return STT_BEACH_IMAGE_MAP[normalizedName];
  }

  if (!image) {
    return STT_PLACEHOLDER_IMAGE;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("//")
  ) {
    return image;
  }

  if (image.startsWith("/images/")) {
    return image;
  }

  if (image.startsWith("images/")) {
    return `/${image}`;
  }

  if (image.startsWith("/")) {
    return `/images/${image.slice(1)}`;
  }

  return `/images/${image}`;
}

function toMenuContent(menu: unknown): Business["richContent"] | undefined {
  if (!Array.isArray(menu)) return undefined;

  const categories: MenuSection[] = menu
    .map((section, index) => {
      const s = section as {
        name?: string;
        title?: string;
        items?: Array<{ name?: string; price?: string | number }>;
      };

      const items =
        s.items?.map((item) => ({
          n: item.name ?? "Item",
          p: String(item.price ?? ""),
        })) ?? [];

      return {
        name: s.name ?? s.title ?? `Section ${index + 1}`,
        items,
      };
    })
    .filter((section) => section.items.length > 0);

  if (!categories.length) return undefined;

  return {
    type: "Menu",
    categories,
  };
}

function mapPlaceDoc(id: string, data: Record<string, unknown>): Business {
  const name = String(data.name ?? "Unnamed Place");
  const category = normalizePlaceKind(String(data.kind ?? data.category ?? ""));

  return {
    id,
    name,
    category,
    featured: Boolean(data.featured ?? false),
    lat: Number(data.lat ?? data.latitude ?? 0),
    lng: Number(data.lng ?? data.longitude ?? 0),
    location: String(data.address ?? data.location ?? "St. Thomas"),
    image: resolveFirestoreImagePath({
      imageUrl: data.imageUrl ?? data.image,
      name,
      category,
    }),
    description: String(data.description ?? ""),
    island: normalizeIsland(data.island),
    richContent: toMenuContent(data.menu),
  };
}

function mapBeachDoc(id: string, data: Record<string, unknown>): Business {
  const name = String(data.name ?? "Unnamed Beach");

  return {
    id,
    name,
    category: "Beach",
    featured: Boolean(data.featured ?? false),
    lat: Number(data.lat ?? data.latitude ?? 0),
    lng: Number(data.lng ?? data.longitude ?? 0),
    location: String(data.location ?? data.slug ?? "Beach"),
    image: resolveFirestoreImagePath({
      imageUrl: data.imageUrl ?? data.image,
      name,
      category: "Beach",
    }),
    description: String(data.description ?? ""),
    island: normalizeIsland(data.island),
    richContent: {
      type: "Beach",
      amenities: Array.isArray(data.amenities)
        ? data.amenities.map((item) => String(item))
        : [],
    },
  };
}

export async function ensureUser(): Promise<User | null> {
  if (!firebaseEnabled || !auth) return null;
  if (auth.currentUser) return auth.currentUser;

  try {
    const credential = await signInAnonymously(auth);
    return credential.user;
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    return null;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  if (!firebaseEnabled || !auth) return null;

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return credential.user;
  } catch (error) {
    console.error("Google sign-in failed", error);
    return null;
  }
}

export async function loadBusinesses(): Promise<Business[]> {
  if (!firebaseEnabled || !db) return [];

  const [placesSnap, beachesSnap] = await Promise.all([
    getDocs(collection(db, "places")),
    getDocs(collection(db, "beaches")),
  ]);

  const places = placesSnap.docs.map((docSnap) =>
    mapPlaceDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
  );

  const beaches = beachesSnap.docs.map((docSnap) =>
    mapBeachDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
  );

  return [...places, ...beaches];
}

export async function loadBookmarks(uid: string): Promise<string[]> {
  if (!firebaseEnabled || !db) return [];

  const ref = userBookmarksCollection(uid);
  if (!ref) return [];

  const snapshot = await getDocs(ref);
  return snapshot.docs.map((docSnap) => docSnap.id);
}

export async function toggleBookmark(
  uid: string,
  businessId: string,
  active: boolean
): Promise<void> {
  if (!firebaseEnabled || !db) return;

  const ref = doc(
    db,
    "apps",
    APP_NAMESPACE,
    "users",
    uid,
    "bookmarks",
    businessId
  );

  if (active) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, {
      businessId,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function loadCheckins(uid: string): Promise<Checkin[]> {
  if (!firebaseEnabled || !db) return [];

  const ref = userCheckinsCollection(uid);
  if (!ref) return [];

  const snapshot = await getDocs(query(ref, orderBy("timestamp", "desc")));

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as {
      businessId?: string;
      timestamp?: number;
      photoUrl?: string;
      updatedAt?: number;
    };

    return {
      id: docSnap.id,
      businessId: data.businessId ?? "",
      timestamp: data.timestamp ?? Date.now(),
      photoUrl: data.photoUrl,
      updatedAt: data.updatedAt,
    };
  });
}

export async function createCheckin(
  uid: string,
  businessId: string
): Promise<Checkin | null> {
  if (!firebaseEnabled || !db) return null;

  const ref = userCheckinsCollection(uid);
  if (!ref) return null;

  const timestamp = Date.now();
  const docRef = await addDoc(ref, {
    businessId,
    timestamp,
    createdAt: serverTimestamp(),
    updatedAt: timestamp,
  });

  return {
    id: docRef.id,
    businessId,
    timestamp,
  };
}
