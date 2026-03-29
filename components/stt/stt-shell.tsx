"use client";

import { useEffect, useMemo, useState } from "react";
import { STT_BUSINESSES, STT_REVIEWS } from "@/lib/stt/data";
import {
  filterBusinesses,
  type MainTab,
  type IslandFilter,
} from "@/lib/stt/filters";
import type { Business, Checkin, WeatherDay } from "@/types/stt";
import type { SttAppTab } from "@/types/unified-place";
import { Hero } from "./hero";
import { SearchFilterBar } from "./search-filter-bar";
import { BusinessGrid } from "./business-grid";
import { BusinessModal } from "./business-modal";
import { ConciergePanel } from "./concierge-panel";
import { CommunityPanel } from "./community-panel";
import RideSharingApp from "../RideSharing";
import { PassportPanel } from "./passport-panel";
import { WelcomeDeck } from "./welcome-deck";
import { CurrentPlanBar } from "./current-plan-bar";
import { SttDiscoveryMap } from "./stt-discovery-map";
import type { DiscoveryPlace } from "./stt-discovery-map";
import {
  createCheckin,
  ensureUser,
  loadBookmarks,
  loadBusinesses,
  loadCheckins,
  toggleBookmark,
} from "@/lib/stt/repository";
import { useSttFlow } from "./stt-flow-context";

type AppTab =
  | MainTab
  | "community"
  | "concierge"
  | "transit"
  | "passport"
  | "map";

type SearchBarTab = Exclude<AppTab, "map">;

function isSearchBarTab(tab: AppTab): tab is SearchBarTab {
  return tab !== "map";
}

function tabMeta(tab: AppTab) {
  switch (tab) {
    case "map":
      return {
        eyebrow: "Spatial discovery",
        title: "See the island on a live map",
        description:
          "Browse beaches, dining, shopping, and activities geographically, then jump directly into details, concierge, and transport.",
      };
    case "community":
      return {
        eyebrow: "The USVI community",
        title: "The islands through districts, quarters, and estates",
        description:
          "Explore community activity through the real territorial structure of the Virgin Islands so conversation feels rooted in home, not abstract zones.",
      };
    case "concierge":
      return {
        eyebrow: "Concierge flow",
        title: "Plan the next move naturally",
        description:
          "Use place-aware guidance to turn discovery into a real island plan.",
      };
    case "transit":
      return {
        eyebrow: "Transit flow",
        title: "Move from discovery to booking",
        description:
          "Book local transport with destination-aware handoff from the rest of the app.",
      };
    case "passport":
      return {
        eyebrow: "Passport flow",
        title: "Track the island experience",
        description:
          "Save the places you’ve visited and build a richer personal island record.",
      };
    case "beaches":
      return {
        eyebrow: "Beach discovery",
        title: "Find the right coastline for today",
        description:
          "Browse beach options and move directly into planning, transport, and check-in.",
      };
    case "restaurants":
      return {
        eyebrow: "Dining discovery",
        title: "Find where to eat next",
        description:
          "Discover food, open richer details, and turn intent into action.",
      };
    case "shops":
      return {
        eyebrow: "Shopping discovery",
        title: "Browse local shops and island finds",
        description:
          "Move from browsing to planning without losing your place in the flow.",
      };
    default:
      return {
        eyebrow: "Island discovery",
        title: "One connected St. Thomas experience",
        description:
          "Explore places, ask Concierge, book rides, join the community, and save moments in one premium journey.",
      };
  }
}

function toDiscoveryIslandCode(
  island: Business["island"]
): DiscoveryPlace["island"] {
  if (island === "St. John") return "stj";
  if (island === "St. Croix") return "stx";
  return "stt";
}

function toDiscoveryCategory(
  category: Business["category"]
): DiscoveryPlace["category"] {
  if (category === "Beach") return "beach";
  if (category === "Food") return "food";
  if (category === "Shopping") return "shopping";
  if (category === "Stay") return "stay";
  return "activity";
}

export function SttShell({ weather }: { weather: WeatherDay[] }) {
  const [query, setQuery] = useState("");
  const [currentCategory, setCurrentCategory] = useState<
    "All" | "Beach" | "Food" | "Shopping" | "Activity" | "Stay"
  >("All");
  const [islandFilter, setIslandFilter] = useState<IslandFilter>("All Islands");
  const [businesses, setBusinesses] = useState<Business[]>(STT_BUSINESSES);
  const [bookmarkIds, setBookmarkIds] = useState<string[]>([]);
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [distanceSort, setDistanceSort] = useState(false);
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [uid, setUid] = useState<string | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  const {
    activeTab,
    setActiveTab,
    selectedBusiness,
    selectedPlace,
    conciergeDraft,
    transitDraft,
    openBusinessFlow,
    startTransitToBusiness,
    startConciergeForBusiness,
    startTransitToPlace,
    startConciergeForPlace,
    clearFlow,
  } = useSttFlow();

  const tab = activeTab as AppTab;
  const reviews = STT_REVIEWS;
  const meta = tabMeta(tab);
  const showGlobalSearchBar = tab !== "community" && tab !== "map";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const user = await ensureUser();
        if (!mounted) return;

        if (user) {
          setUid(user.uid);
        }

        const remoteBusinesses = await loadBusinesses();
        if (!mounted) return;

        if (remoteBusinesses.length > 0) {
          setBusinesses(remoteBusinesses);
        }

        if (user) {
          const [remoteBookmarks, remoteCheckins] = await Promise.all([
            loadBookmarks(user.uid),
            loadCheckins(user.uid),
          ]);

          if (!mounted) return;

          setBookmarkIds(remoteBookmarks);
          setCheckins(remoteCheckins);
        }
      } finally {
        if (mounted) setIsHydrating(false);
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredBusinesses = useMemo(() => {
    return filterBusinesses(businesses, {
      query,
      currentCategory,
      islandFilter,
      bookmarkIds,
      bookmarkOnly,
      distanceSort,
      userCoords,
    });
  }, [
    businesses,
    query,
    currentCategory,
    islandFilter,
    bookmarkIds,
    bookmarkOnly,
    distanceSort,
    userCoords,
  ]);

  const mapPlaces = useMemo<DiscoveryPlace[]>(
    () =>
      filteredBusinesses
        .filter(
          (business) =>
            Number.isFinite(business.lat) && Number.isFinite(business.lng)
        )
        .map((business) => ({
          id: business.id,
          name: business.name,
          island: toDiscoveryIslandCode(business.island),
          category: toDiscoveryCategory(business.category),
          lat: business.lat,
          lng: business.lng,
          description: business.description,
        })),
    [filteredBusinesses]
  );

  function handleTabChange(nextTab: AppTab) {
    setActiveTab(nextTab as SttAppTab);

    if (nextTab === "places") setCurrentCategory("All");
    if (nextTab === "beaches") setCurrentCategory("Beach");
    if (nextTab === "restaurants") setCurrentCategory("Food");
    if (nextTab === "shops") setCurrentCategory("Shopping");
  }

  async function handleToggleBookmark(id: string) {
    const currentlyBookmarked = bookmarkIds.includes(id);

    setBookmarkIds((prev) =>
      currentlyBookmarked ? prev.filter((item) => item !== id) : [...prev, id]
    );

    if (!uid) return;

    try {
      await toggleBookmark(uid, id, currentlyBookmarked);
    } catch {
      setBookmarkIds((prev) =>
        currentlyBookmarked ? [...prev, id] : prev.filter((item) => item !== id)
      );
    }
  }

  function handleToggleDistance() {
    if (distanceSort) {
      setDistanceSort(false);
      return;
    }

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setDistanceSort(true);
      },
      () => {
        setDistanceSort(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleCheckIn(businessId: string) {
    const optimisticCheckin: Checkin = {
      id: `${businessId}-${Date.now()}`,
      businessId,
      timestamp: Date.now(),
    };

    setCheckins((prev) => [optimisticCheckin, ...prev]);
    clearFlow();
    setActiveTab("passport");

    if (!uid) return;

    try {
      const saved = await createCheckin(uid, businessId);

      if (!saved) return;

      setCheckins((prev) => {
        const withoutOptimistic = prev.filter(
          (item) => item.id !== optimisticCheckin.id
        );
        return [saved, ...withoutOptimistic];
      });
    } catch {
      setCheckins((prev) =>
        prev.filter((item) => item.id !== optimisticCheckin.id)
      );
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_30%),linear-gradient(to_bottom,#f8fafc,#eef6fb)]">
      <Hero weather={weather} />

      {showGlobalSearchBar && isSearchBarTab(tab) ? (
        <SearchFilterBar
          tab={tab}
          query={query}
          onQueryChange={setQuery}
          onTabChange={handleTabChange}
          currentCategory={currentCategory}
          onCategoryChange={setCurrentCategory}
          selectedIsland={islandFilter}
          onIslandChange={setIslandFilter}
          bookmarkOnly={bookmarkOnly}
          onToggleBookmarks={() => setBookmarkOnly((prev) => !prev)}
          distanceSort={distanceSort}
          onToggleDistance={handleToggleDistance}
          bookmarkCount={bookmarkIds.length}
        />
      ) : (
        <section className="sticky top-0 z-40 border-b border-white/60 bg-white/78 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  { id: "places", label: "Places" },
                  { id: "beaches", label: "Beaches" },
                  { id: "restaurants", label: "Restaurants" },
                  { id: "shops", label: "Shops" },
                  { id: "community", label: "Community" },
                  { id: "concierge", label: "Concierge" },
                  { id: "transit", label: "Transit" },
                  { id: "passport", label: "Passport" },
                  { id: "map", label: "Map" },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition ${
                      active
                        ? "bg-slate-900 text-white shadow-lg"
                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-5 md:px-6">
        <WelcomeDeck
          onOpenExplore={() => setActiveTab("places")}
          onOpenConcierge={() => setActiveTab("concierge")}
          onOpenTransit={() => setActiveTab("transit")}
        />

        <CurrentPlanBar
          onOpenConcierge={() => setActiveTab("concierge")}
          onOpenTransit={() => setActiveTab("transit")}
        />

        {isHydrating && (
          <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm backdrop-blur">
            Syncing your island profile…
          </div>
        )}

        <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-200/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.9),rgba(56,189,248,0.05))] px-5 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
                  {meta.eyebrow}
                </div>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  {meta.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                  {meta.description}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Results
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-900 md:text-base">
                    {filteredBusinesses.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Saved
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-900 md:text-base">
                    {bookmarkIds.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Passport
                  </div>
                  <div className="mt-1 text-sm font-black text-slate-900 md:text-base">
                    {checkins.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-3 py-3 md:px-4 md:py-4">
            {tab === "community" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm">
                <CommunityPanel
                  onPlanFromPlace={(place, prompt) => {
                    startConciergeForPlace(place, prompt);
                  }}
                  onGetRide={(place) => {
                    startTransitToPlace(place);
                  }}
                />
              </div>
            ) : tab === "concierge" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm">
                <ConciergePanel
                  selectedPlace={conciergeDraft.place ?? selectedPlace}
                  initialPrompt={conciergeDraft.prompt}
                />
              </div>
            ) : tab === "transit" ? (
              hasMounted ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm">
                  <RideSharingApp
                    initialPickup={transitDraft.pickup?.label}
                    initialDropoff={transitDraft.dropoff?.label}
                  />
                </div>
              ) : (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="text-sm text-slate-500">
                    Loading transit...
                  </div>
                </div>
              )
            ) : tab === "passport" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                <PassportPanel checkins={checkins} businesses={businesses} />
              </div>
            ) : tab === "map" ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                <SttDiscoveryMap
                  places={mapPlaces}
                  selectedPlaceId={selectedBusiness?.id ?? null}
                  onSelectPlace={(placeId) => {
                    const business = filteredBusinesses.find(
                      (item) => item.id === placeId
                    );
                    if (business) openBusinessFlow(business);
                  }}
                />
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
                <BusinessGrid
                  items={filteredBusinesses}
                  bookmarkIds={bookmarkIds}
                  onToggleBookmark={handleToggleBookmark}
                  onOpen={(business) => {
                    openBusinessFlow(business);
                  }}
                />
              </div>
            )}
          </div>
        </section>
      </main>

      <BusinessModal
        business={selectedBusiness}
        reviews={reviews}
        onClose={clearFlow}
        onCheckIn={handleCheckIn}
        onAskConcierge={(business) => {
          startConciergeForBusiness(
            business,
            `Help me plan the best experience around ${business.name}.`
          );
        }}
        onGetThere={(business) => {
          startTransitToBusiness(business);
        }}
      />
    </div>
  );
}
