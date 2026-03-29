"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import estatesData from "@/data/usvi-estates.json";
import { EstateExplorerMap } from "@/components/estates/estate-explorer-map";
import type { UnifiedPlace } from "@/types/unified-place";

type IslandValue =
  | "All Islands"
  | "St. Thomas"
  | "St. John"
  | "St. Croix"
  | "Water Island";

type EstateRecord = {
  geoid: string;
  name: string;
  basename: string;
  state: string;
  county: string;
  island: "St. Thomas" | "St. John" | "St. Croix" | "Water Island";
  centroid: {
    lat: number;
    lng: number;
  };
  interiorPoint: {
    lat: number;
    lng: number;
  };
};

type CommunityTrendingPost = {
  id: string;
  author: string;
  handle?: string;
  role?: string;
  island?: string;
  estateGeoid?: string | null;
  estateName?: string | null;
  lat?: number | null;
  lng?: number | null;
  text: string;
  likes?: number;
  replies?: number;
  tags?: string[];
};

type CommunityEvent = {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  vibe: string;
  island?: string;
  estateGeoid?: string | null;
  estateName?: string | null;
  category?: string;
  lat?: number | null;
  lng?: number | null;
};

type CommunityCreator = {
  id: string;
  name: string;
  specialty: string;
  followers: string;
  island?: string;
};

type CommunityPanelProps = {
  onPlanFromPlace?: (place: UnifiedPlace, prompt: string) => void;
  onGetRide?: (place: UnifiedPlace) => void;
};

const ESTATES = estatesData as EstateRecord[];

function toMapIslandCode(
  value: "All Islands" | "St. Thomas" | "St. John" | "St. Croix" | "Water Island"
): "all" | "stt" | "stj" | "stx" {
  if (value === "All Islands") return "all";
  if (value === "St. John") return "stj";
  if (value === "St. Croix") return "stx";
  return "stt";
}

function fromMapIslandCode(
  value: "all" | "stt" | "stj" | "stx"
): "All Islands" | "St. Thomas" | "St. John" | "St. Croix" {
  if (value === "all") return "All Islands";
  if (value === "stj") return "St. John";
  if (value === "stx") return "St. Croix";
  return "St. Thomas";
}

function formatEventDate(value: unknown, fallback = "Date TBA") {
  if (!value) return fallback;

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    }
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return fallback;
}

function formatFollowers(value: unknown) {
  if (typeof value === "number") {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return `${value}`;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return "New";
}

function pickVibe(data: Record<string, unknown>) {
  return typeof data.vibe === "string"
    ? data.vibe
    : typeof data.category === "string"
    ? data.category
    : typeof data.island === "string"
    ? data.island
    : "Island";
}

function normalizeIsland(value: unknown): IslandValue | null {
  if (typeof value !== "string") return null;

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

  return null;
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

function findEstateByGeoid(geoid: unknown) {
  if (typeof geoid !== "string") return null;
  return ESTATES.find((estate) => estate.geoid === geoid) ?? null;
}

function findNearestEstate(
  lat: number | null,
  lng: number | null,
  island?: string
) {
  if (lat === null || lng === null) return null;

  const islandValue = normalizeIsland(island);
  const pool =
    islandValue && islandValue !== "All Islands"
      ? ESTATES.filter((estate) => estate.island === islandValue)
      : ESTATES;

  if (pool.length === 0) return null;

  let winner: EstateRecord | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const estate of pool) {
    const distance = haversineMiles(
      lat,
      lng,
      estate.centroid.lat,
      estate.centroid.lng
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      winner = estate;
    }
  }

  return winner;
}

function deriveEstateContext(data: Record<string, unknown>) {
  const lat =
    toNumber(data.lat) ??
    toNumber((data.coordinates as { lat?: number } | undefined)?.lat) ??
    toNumber((data.locationCoords as { lat?: number } | undefined)?.lat);

  const lng =
    toNumber(data.lng) ??
    toNumber((data.coordinates as { lng?: number } | undefined)?.lng) ??
    toNumber((data.locationCoords as { lng?: number } | undefined)?.lng);

  const directEstate = findEstateByGeoid(data.estateGeoid);

  if (directEstate) {
    return {
      estateGeoid: directEstate.geoid,
      estateName: directEstate.name,
      island: directEstate.island,
      lat,
      lng,
    };
  }

  const nearest = findNearestEstate(
    lat,
    lng,
    typeof data.island === "string" ? data.island : undefined
  );

  return {
    estateGeoid: nearest?.geoid ?? null,
    estateName: nearest?.name ?? null,
    island: nearest?.island ?? normalizeIsland(data.island) ?? undefined,
    lat,
    lng,
  };
}

function islandChipClass(island?: string) {
  switch (island) {
    case "St. Thomas":
      return "bg-sky-100 text-sky-700";
    case "St. John":
      return "bg-emerald-100 text-emerald-700";
    case "St. Croix":
      return "bg-violet-100 text-violet-700";
    case "Water Island":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function googleMapsEstateLink(
  estateName?: string | null,
  island?: string,
  lat?: number | null,
  lng?: number | null
) {
  if (typeof lat === "number" && typeof lng === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${lat},${lng}`
    )}`;
  }

  const text = [estateName, island, "U.S. Virgin Islands"]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    text || "U.S. Virgin Islands"
  )}`;
}

function estateThreadHref(
  estateGeoid?: string | null,
  estateName?: string | null,
  island?: string
) {
  const params = new URLSearchParams();
  if (estateGeoid) params.set("estate", estateGeoid);
  if (estateName) params.set("estateName", estateName);
  if (island) params.set("island", island);

  const qs = params.toString();
  return qs ? `/social?${qs}` : "/social";
}

function buildUnifiedPlace(payload: {
  estateGeoid?: string | null;
  estateName?: string | null;
  island?: string;
  lat?: number | null;
  lng?: number | null;
}): UnifiedPlace {
  const title = payload.estateName ?? "Selected Estate";
  const locationLabel = [payload.estateName, payload.island]
    .filter(Boolean)
    .join(", ");

  return {
    id: payload.estateGeoid ?? payload.estateName ?? "estate-place",
    kind: "estate",
    source: "community",
    title,
    subtitle: payload.island,
    description: `Community-selected destination${
      payload.island ? ` in ${payload.island}` : ""
    }.`,
    image: "/images/hero-usvi.jpg",
    island: payload.island as UnifiedPlace["island"],
    category: "Community",
    estateGeoid: payload.estateGeoid ?? null,
    estateName: payload.estateName ?? null,
    locationLabel,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    tags: ["community", "estate"],
  };
}

function ActionBar({
  estateGeoid,
  estateName,
  island,
  lat,
  lng,
  prompt,
  onPlanFromPlace,
  onGetRide,
}: {
  estateGeoid?: string | null;
  estateName?: string | null;
  island?: string;
  lat?: number | null;
  lng?: number | null;
  prompt: string;
  onPlanFromPlace?: CommunityPanelProps["onPlanFromPlace"];
  onGetRide?: CommunityPanelProps["onGetRide"];
}) {
  const place = buildUnifiedPlace({
    estateGeoid,
    estateName,
    island,
    lat,
    lng,
  });

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onPlanFromPlace?.(place, prompt)}
        className="rounded-full bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
      >
        Plan from here
      </button>

      <button
        type="button"
        onClick={() => onGetRide?.(place)}
        className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
      >
        Get ride
      </button>

      <Link
        href={estateThreadHref(estateGeoid, estateName, island)}
        className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        Open estate thread
      </Link>

      <a
        href={googleMapsEstateLink(estateName, island, lat, lng)}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        View on map
      </a>
    </div>
  );
}

export function CommunityPanel({
  onPlanFromPlace,
  onGetRide,
}: CommunityPanelProps) {
  const [posts, setPosts] = useState<CommunityTrendingPost[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [creators, setCreators] = useState<CommunityCreator[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedIsland, setSelectedIsland] =
    useState<IslandValue>("St. Thomas");
  const [selectedEstateGeoid, setSelectedEstateGeoid] = useState<string>("all");
  const [estateQuery, setEstateQuery] = useState("");
  const [estatePickerOpen, setEstatePickerOpen] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const estatePickerRef = useRef<HTMLDivElement | null>(null);
  const estateSearchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCommunityData() {
      try {
        if (!db) {
          if (!cancelled) {
            setPosts([]);
            setEvents([]);
            setCreators([]);
            setLoading(false);
          }
          return;
        }

        const postsQuery = query(
          collection(db, "community_trending_posts"),
          limit(24)
        );
        const eventsQuery = query(
          collection(db, "community_events"),
          limit(24)
        );
        const creatorsQuery = query(
          collection(db, "community_creators"),
          limit(24)
        );

        const [postsSnap, eventsSnap, creatorsSnap] = await Promise.all([
          getDocs(postsQuery),
          getDocs(eventsQuery),
          getDocs(creatorsQuery),
        ]);

        if (cancelled) return;

        const nextPosts: CommunityTrendingPost[] = postsSnap.docs.map(
          (docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            const estate = deriveEstateContext(data);

            return {
              id: docSnap.id,
              author: String(
                data.author ??
                  data.userName ??
                  data.name ??
                  data.creatorName ??
                  "Island Voice"
              ),
              handle:
                typeof data.handle === "string"
                  ? data.handle
                  : typeof data.username === "string"
                  ? data.username
                  : undefined,
              role:
                typeof data.role === "string"
                  ? data.role
                  : typeof data.title === "string"
                  ? data.title
                  : undefined,
              island: estate.island,
              estateGeoid: estate.estateGeoid,
              estateName: estate.estateName,
              lat: estate.lat,
              lng: estate.lng,
              text: String(
                data.text ??
                  data.caption ??
                  data.description ??
                  data.body ??
                  "Island update"
              ),
              likes:
                typeof data.likes === "number"
                  ? data.likes
                  : typeof data.likeCount === "number"
                  ? data.likeCount
                  : 0,
              replies:
                typeof data.replies === "number"
                  ? data.replies
                  : typeof data.replyCount === "number"
                  ? data.replyCount
                  : 0,
              tags: Array.isArray(data.tags)
                ? data.tags.map(String).slice(0, 4)
                : [],
            };
          }
        );

        const nextEvents: CommunityEvent[] = eventsSnap.docs.map((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const estate = deriveEstateContext(data);

          return {
            id: docSnap.id,
            title: String(data.title ?? "Island Event"),
            dateLabel: formatEventDate(data.startDate ?? data.date),
            location: String(data.location ?? data.site ?? "USVI"),
            vibe: pickVibe(data),
            island: estate.island,
            estateGeoid: estate.estateGeoid,
            estateName: estate.estateName,
            category:
              typeof data.category === "string" ? data.category : undefined,
            lat: estate.lat,
            lng: estate.lng,
          };
        });

        const nextCreators: CommunityCreator[] = creatorsSnap.docs.map(
          (docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;

            return {
              id: docSnap.id,
              name: String(data.name ?? data.creatorName ?? "Island Creator"),
              specialty: String(
                data.specialty ?? data.category ?? data.focus ?? "Local guide"
              ),
              followers: formatFollowers(
                data.followers ?? data.followerCount ?? data.audience
              ),
              island: normalizeIsland(data.island) ?? "St. Thomas",
            };
          }
        );

        setPosts(nextPosts);
        setEvents(nextEvents);
        setCreators(nextCreators);
      } catch (error) {
        console.error("Failed to load community panel data", error);
        setPosts([]);
        setEvents([]);
        setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCommunityData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!estatePickerRef.current) return;
      if (!estatePickerRef.current.contains(event.target as Node)) {
        setEstatePickerOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEstatePickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!estatePickerOpen) return;

    const timeout = window.setTimeout(() => {
      estateSearchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [estatePickerOpen]);

  const islandEstates = useMemo(() => {
    const pool =
      selectedIsland === "All Islands"
        ? ESTATES
        : ESTATES.filter((estate) => estate.island === selectedIsland);

    const sorted = [...pool].sort((a, b) =>
      a.basename.localeCompare(b.basename)
    );

    const q = estateQuery.trim().toLowerCase();
    if (!q) return sorted;

    return sorted.filter((estate) => {
      return (
        estate.name.toLowerCase().includes(q) ||
        estate.basename.toLowerCase().includes(q) ||
        estate.geoid.includes(q)
      );
    });
  }, [selectedIsland, estateQuery]);

  const selectedEstate = useMemo(() => {
    if (selectedEstateGeoid === "all") return null;
    return ESTATES.find((estate) => estate.geoid === selectedEstateGeoid) ?? null;
  }, [selectedEstateGeoid]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const islandMatch =
        selectedIsland === "All Islands" || post.island === selectedIsland;
      const estateMatch =
        selectedEstateGeoid === "all" ||
        post.estateGeoid === selectedEstateGeoid;

      return islandMatch && estateMatch;
    });
  }, [posts, selectedIsland, selectedEstateGeoid]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const islandMatch =
        selectedIsland === "All Islands" || event.island === selectedIsland;
      const estateMatch =
        selectedEstateGeoid === "all" ||
        event.estateGeoid === selectedEstateGeoid;

      return islandMatch && estateMatch;
    });
  }, [events, selectedIsland, selectedEstateGeoid]);

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      return (
        selectedIsland === "All Islands" || creator.island === selectedIsland
      );
    });
  }, [creators, selectedIsland]);

  const liveVoicesCount = useMemo(() => {
    if (loading) return "…";
    return `${filteredPosts.length + filteredCreators.length}+`;
  }, [loading, filteredPosts.length, filteredCreators.length]);

  const trendingLabel = useMemo(() => {
    if (filteredPosts.length === 0) return "Estate pulse";
    const topTag = filteredPosts.flatMap((post) => post.tags ?? [])[0];
    return topTag ?? "Estate pulse";
  }, [filteredPosts]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="relative overflow-hidden px-6 py-7 md:px-8 md:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_28%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex rounded-full bg-sky-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                Community x Social x Estates
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                The real social pulse
                <span className="block bg-gradient-to-r from-sky-700 to-cyan-500 bg-clip-text text-transparent">
                  of the islands.
                </span>
              </h2>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Follow live island energy through real estates, neighborhoods,
                creators, events, and community movement — all connected to the
                geography inside the app.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowMap((prev) => !prev)}
                className={`rounded-2xl px-5 py-3 text-sm font-bold shadow-sm transition ${
                  showMap
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {showMap ? "Hide Estate Map" : "Show Estate Map"}
              </button>

              <Link
                href="/social"
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-700"
              >
                Open Social Page
              </Link>

              <button
                type="button"
                className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Start a post
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/70 bg-white/70 px-5 py-5 md:px-6">
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              [
                "All Islands",
                "St. Thomas",
                "St. John",
                "St. Croix",
                "Water Island",
              ] as IslandValue[]
            ).map((island) => (
              <button
                key={island}
                type="button"
                onClick={() => {
                  setSelectedIsland(island);
                  setSelectedEstateGeoid("all");
                  setEstateQuery("");
                  setEstatePickerOpen(false);
                }}
                className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition ${
                  selectedIsland === island
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {island}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="max-w-xl">
              <label
                htmlFor="estate-combobox-trigger"
                className="mb-2 block text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500"
              >
                Estate filter
              </label>

              <div className="relative" ref={estatePickerRef}>
                <button
                  id="estate-combobox-trigger"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={estatePickerOpen}
                  onClick={() => setEstatePickerOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-sky-400"
                >
                  <span className="truncate">
                    {selectedEstateGeoid === "all"
                      ? "All Estates"
                      : selectedEstate?.name ?? "Select an estate"}
                  </span>
                  <span className="ml-4 text-slate-400">
                    {estatePickerOpen ? "▲" : "▼"}
                  </span>
                </button>

                {estatePickerOpen ? (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                    <div className="border-b border-slate-100 p-3">
                      <input
                        ref={estateSearchInputRef}
                        type="text"
                        value={estateQuery}
                        onChange={(e) => setEstateQuery(e.target.value)}
                        placeholder="Search Smith Bay, Havensight, Nazareth..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                    </div>

                    <div
                      className="max-h-72 overflow-y-auto p-2"
                      role="listbox"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEstateGeoid("all");
                          setEstatePickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                          selectedEstateGeoid === "all"
                            ? "bg-cyan-50 font-semibold text-cyan-700"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>All Estates</span>
                        {selectedEstateGeoid === "all" ? <span>✓</span> : null}
                      </button>

                      {islandEstates.length === 0 ? (
                        <div className="px-4 py-4 text-sm text-slate-500">
                          No estates found for this search.
                        </div>
                      ) : (
                        islandEstates.map((estate) => (
                          <button
                            key={estate.geoid}
                            type="button"
                            onClick={() => {
                              setSelectedEstateGeoid(estate.geoid);
                              setEstatePickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                              selectedEstateGeoid === estate.geoid
                                ? "bg-cyan-50 font-semibold text-cyan-700"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {estate.basename}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {estate.name}
                              </div>
                            </div>
                            {selectedEstateGeoid === estate.geoid ? (
                              <span>✓</span>
                            ) : null}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {!loading ? (
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>
                  Showing {islandEstates.length} estate
                  {islandEstates.length === 1 ? "" : "s"} for {selectedIsland}.
                </span>

                {selectedEstateGeoid !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedEstateGeoid("all")}
                    className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 transition hover:bg-slate-200"
                  >
                    Clear estate filter
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 border-t border-slate-200/70 bg-white/60 p-5 md:grid-cols-3 md:p-6">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Live voices
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {liveVoicesCount}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Local posts, creators, and movement connected to real estates.
            </p>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Trending now
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {trendingLabel}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Social proof becomes more valuable when it is tied to place.
            </p>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Upcoming
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {loading ? "…" : filteredEvents.length}
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Events grounded in island and estate context.
            </p>
          </div>
        </div>
      </section>

      {showMap ? (
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.94),rgba(56,189,248,0.05))] px-5 py-5 md:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700">
                  Community territory map
                </div>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  See the social layer through real estate geography
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600 md:text-base">
                  Browse official estate polygons directly inside the community
                  experience so place, conversation, and movement stay connected.
                </p>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Active island filter
                </div>
                <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  {selectedIsland}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <EstateExplorerMap
              selectedIsland={toMapIslandCode(selectedIsland)}
              onChangeIsland={(value) => {
                const nextIsland: IslandValue =
                  value === "stj"
                    ? "St. John"
                    : value === "stx"
                    ? "St. Croix"
                    : "St. Thomas";

                setSelectedIsland(nextIsland);
                setSelectedEstateGeoid("all");
                setEstateQuery("");
                setEstatePickerOpen(false);
              }}
            />
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Featured social feed
              </div>
              <h3 className="mt-1 text-2xl font-black text-slate-900">
                What people are saying
              </h3>
            </div>

            <Link
              href="/social"
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              View all
            </Link>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
                Loading community feed...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
                No community posts yet for this island/estate.
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-black text-slate-900">
                        {post.author}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {post.island ? (
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${islandChipClass(
                              post.island
                            )}`}
                          >
                            {post.island}
                          </span>
                        ) : null}

                        {post.estateName ? (
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
                            {post.estateName}
                          </span>
                        ) : null}

                        {post.role ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                            {post.role}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm"
                    >
                      Follow
                    </button>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {post.text}
                  </p>

                  {post.tags && post.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-5 text-sm font-semibold text-slate-500">
                    <span>♥ {post.likes ?? 0}</span>
                    <span>↺ {post.replies ?? 0}</span>
                    <button
                      type="button"
                      className="text-sky-700 transition hover:text-sky-800"
                    >
                      Open thread
                    </button>
                  </div>

                  <ActionBar
                    estateGeoid={post.estateGeoid}
                    estateName={post.estateName}
                    island={post.island}
                    lat={post.lat}
                    lng={post.lng}
                    prompt={`Help me plan the best local experience around ${
                      post.estateName ?? post.island ?? "this area"
                    }.`}
                    onPlanFromPlace={onPlanFromPlace}
                    onGetRide={onGetRide}
                  />
                </article>
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Social creators
            </div>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              Island voices to follow
            </h3>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Loading creators...
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No creators yet.
                </div>
              ) : (
                filteredCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div>
                      <div className="font-black text-slate-900">
                        {creator.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {creator.specialty}
                      </div>
                      {creator.island ? (
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {creator.island}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {creator.followers}
                      </div>
                      <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        followers
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Community events
            </div>
            <h3 className="mt-1 text-2xl font-black text-slate-900">
              Go from social to real life
            </h3>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Loading events...
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No events yet.
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-black text-slate-900">
                          {event.title}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {event.dateLabel}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {event.location}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {event.island ? (
                            <span
                              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${islandChipClass(
                                event.island
                              )}`}
                            >
                              {event.island}
                            </span>
                          ) : null}

                          {event.estateName ? (
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
                              {event.estateName}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sky-700">
                        {event.vibe}
                      </span>
                    </div>

                    <ActionBar
                      estateGeoid={event.estateGeoid}
                      estateName={event.estateName}
                      island={event.island}
                      lat={event.lat}
                      lng={event.lng}
                      prompt={`Help me plan around ${event.title} in ${
                        event.estateName ?? event.island ?? "the area"
                      }.`}
                      onPlanFromPlace={onPlanFromPlace}
                      onGetRide={onGetRide}
                    />
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-sky-200 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.95),rgba(56,189,248,0.06))] p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
              Social handoff
            </div>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Open the full social page
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Let people move from discovery into a richer social space without
              losing the island flow or the estate-level context.
            </p>

            <Link
              href="/social"
              className="mt-5 inline-flex rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sky-700"
            >
              Go to Social
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}