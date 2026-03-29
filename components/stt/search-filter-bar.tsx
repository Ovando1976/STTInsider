"use client";

import type { MainTab, IslandFilter } from "@/lib/stt/filters";

type DiscoveryCategory =
  | "All"
  | "Beach"
  | "Food"
  | "Shopping"
  | "Activity"
  | "Stay";

type AppTab =
  | MainTab
  | "community"
  | "concierge"
  | "transit"
  | "passport"
  | "beaches"
  | "restaurants"
  | "shops";

type SearchFilterBarProps = {
  tab: AppTab;
  query: string;
  onQueryChange: (value: string) => void;
  onTabChange: (tab: AppTab) => void;
  currentCategory: DiscoveryCategory;
  onCategoryChange: (value: DiscoveryCategory) => void;
  selectedIsland: IslandFilter;
  onIslandChange: (value: IslandFilter) => void;
  bookmarkOnly: boolean;
  onToggleBookmarks: () => void;
  distanceSort: boolean;
  onToggleDistance: () => void;
  bookmarkCount: number;
};

const tabItems: Array<{
  id: AppTab;
  label: string;
  shortLabel?: string;
}> = [
  { id: "places", label: "Places" },
  { id: "beaches", label: "Beaches" },
  { id: "restaurants", label: "Restaurants" },
  { id: "shops", label: "Shops" },
  { id: "community", label: "Community" },
  { id: "concierge", label: "Concierge" },
  { id: "transit", label: "Transit" },
  { id: "passport", label: "Passport" },
];

const categoryItems: DiscoveryCategory[] = [
  "All",
  "Beach",
  "Food",
  "Shopping",
  "Activity",
  "Stay",
];

const islandItems: IslandFilter[] = [
  "All Islands",
  "St. Thomas",
  "St. John",
  "St. Croix",
  "Water Island",
];

function isDiscoveryTab(tab: AppTab) {
  return (
    tab === "places" ||
    tab === "beaches" ||
    tab === "restaurants" ||
    tab === "shops"
  );
}

function getSearchPlaceholder(tab: AppTab, category: DiscoveryCategory) {
  if (tab === "community") {
    return "Search estates, neighborhoods, local talk, and island energy...";
  }

  if (tab === "concierge") {
    return "Search plans, ideas, itineraries, and local flow...";
  }

  if (tab === "transit") {
    return "Search pickups, dropoffs, ferries, beaches, and routes...";
  }

  if (tab === "passport") {
    return "Search stamps, visited places, and saved island moments...";
  }

  if (tab === "beaches" || category === "Beach") {
    return "Search beaches, bays, snorkeling spots, and swim stops...";
  }

  if (tab === "restaurants" || category === "Food") {
    return "Search restaurants, bars, brunch, local food, and fine dining...";
  }

  if (tab === "shops" || category === "Shopping") {
    return "Search boutiques, gift shops, markets, and island finds...";
  }

  return "Search beaches, dining, shopping, activities, and island places...";
}

function getSectionEyebrow(tab: AppTab) {
  switch (tab) {
    case "community":
      return "Live island conversation";
    case "concierge":
      return "Planning flow";
    case "transit":
      return "Ride and route flow";
    case "passport":
      return "Your island passport";
    case "beaches":
      return "Beach discovery";
    case "restaurants":
      return "Dining discovery";
    case "shops":
      return "Shopping discovery";
    default:
      return "Island discovery";
  }
}

function getTabTone(tab: AppTab) {
  switch (tab) {
    case "community":
      return "from-[#0b5f7a] via-[#16a3c8] to-[#f27a6b]";
    case "concierge":
      return "from-violet-600 via-fuchsia-500 to-sky-500";
    case "transit":
      return "from-emerald-600 via-cyan-500 to-sky-500";
    case "passport":
      return "from-amber-500 via-orange-500 to-rose-500";
    default:
      return "from-sky-600 via-cyan-500 to-blue-500";
  }
}

export function SearchFilterBar({
  tab,
  query,
  onQueryChange,
  onTabChange,
  currentCategory,
  onCategoryChange,
  selectedIsland,
  onIslandChange,
  bookmarkOnly,
  onToggleBookmarks,
  distanceSort,
  onToggleDistance,
  bookmarkCount,
}: SearchFilterBarProps) {
  const discoveryMode = isDiscoveryTab(tab);

  return (
    <section className="sticky top-0 z-40 border-b border-white/60 bg-white/78 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabItems.map((item) => {
              const active = tab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition ${
                    active
                      ? `bg-gradient-to-r ${getTabTone(item.id)} text-white shadow-lg`
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <label
                  htmlFor="stt-global-search"
                  className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500"
                >
                  Search
                </label>

                <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                  {getSectionEyebrow(tab)}
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-sky-400 focus-within:bg-white">
                <span className="text-base text-slate-400">⌕</span>

                <input
                  id="stt-global-search"
                  type="text"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder={getSearchPlaceholder(tab, currentCategory)}
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                  {selectedIsland}
                </span>

                {discoveryMode ? (
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600 ring-1 ring-slate-200">
                    {currentCategory}
                  </span>
                ) : null}

                {bookmarkOnly ? (
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">
                    Saved only
                  </span>
                ) : null}

                {distanceSort ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    Near me
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
                <label
                  htmlFor="stt-island-filter"
                  className="mb-2 block px-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500"
                >
                  Island
                </label>

                <select
                  id="stt-island-filter"
                  value={selectedIsland}
                  onChange={(e) =>
                    onIslandChange(e.target.value as IslandFilter)
                  }
                  className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                >
                  {islandItems.map((island) => (
                    <option key={island} value={island}>
                      {island}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Quick filters
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onToggleBookmarks}
                    className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                      bookmarkOnly
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Saved {bookmarkCount > 0 ? `(${bookmarkCount})` : ""}
                  </button>

                  <button
                    type="button"
                    onClick={onToggleDistance}
                    className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                      distanceSort
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Near me
                  </button>
                </div>
              </div>
            </div>
          </div>

          {discoveryMode ? (
            <div className="rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                Discovery category
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryItems.map((category) => {
                  const active = currentCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => onCategoryChange(category)}
                      className={`whitespace-nowrap rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                        active
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}