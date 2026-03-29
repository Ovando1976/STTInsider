"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CommunityPost } from "@/types/community";
import type { UsviEstate } from "@/types/usvi-estates";
import { CommunityEstateFilter } from "./community-estate-filter";
import { EstateExplorerMap } from "@/components/estates/estate-explorer-map";
import {
  getEstatesForIsland,
  sortEstatesByName,
  type IslandValue,
} from "@/lib/usvi/estate-filters";

type Props = {
  posts: CommunityPost[];
  estates: UsviEstate[];
};

function toMapIslandCode(
  value: IslandValue
): "all" | "stt" | "stj" | "stx" {
  if (value === "All Islands") return "all";
  if (value === "St. John") return "stj";
  if (value === "St. Croix") return "stx";
  return "stt";
}

function fromMapIslandCode(
  value: "all" | "stt" | "stj" | "stx"
): IslandValue {
  if (value === "all") return "All Islands";
  if (value === "stj") return "St. John";
  if (value === "stx") return "St. Croix";
  return "St. Thomas";
}

const ISLAND_OPTIONS: IslandValue[] = [
  "All Islands",
  "St. Thomas",
  "St. John",
  "St. Croix",
  "Water Island",
];

export function CommunityShell({ posts, estates }: Props) {
  const [selectedIsland, setSelectedIsland] =
    useState<IslandValue>("St. Thomas");
  const [selectedEstateGeoid, setSelectedEstateGeoid] = useState<
    string | "all"
  >("all");
  const [showMap, setShowMap] = useState(true);

  const availableEstates = useMemo(() => {
    return sortEstatesByName(getEstatesForIsland(estates, selectedIsland));
  }, [estates, selectedIsland]);

  const filteredPosts = useMemo(() => {
    let next = [...posts];

    if (selectedIsland !== "All Islands") {
      next = next.filter((post) => post.island === selectedIsland);
    }

    if (selectedEstateGeoid !== "all") {
      next = next.filter((post) => post.estateGeoid === selectedEstateGeoid);
    }

    next.sort((a, b) => b.createdAt - a.createdAt);
    return next;
  }, [posts, selectedIsland, selectedEstateGeoid]);

  return (
    <section className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
          Community pulse
        </div>

        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
          See the island through real places
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          Explore conversation by island and estate, so the community feels
          anchored to where life is actually happening.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {ISLAND_OPTIONS.map((island) => (
            <button
              key={island}
              type="button"
              onClick={() => {
                setSelectedIsland(island);
                setSelectedEstateGeoid("all");
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

          <button
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
              showMap
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-900 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            {showMap ? "Hide Estate Map" : "Show Estate Map"}
          </button>

          <Link
            href="/estates/map"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
          >
            Open Full Estate Map
          </Link>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
          <CommunityEstateFilter
            estates={availableEstates}
            selectedEstateGeoid={selectedEstateGeoid}
            onChange={setSelectedEstateGeoid}
          />

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Visible posts
            </div>
            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {filteredPosts.length}
            </div>
          </div>
        </div>
      </div>

      {showMap ? (
        <div className="rounded-[32px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700">
                Estate geography
              </div>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                Community territory map
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Use the official estate polygons to understand where posts are
                happening and how different parts of the islands relate
                spatially.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Current island
              </div>
              <div className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {selectedIsland}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-slate-200">
            <EstateExplorerMap
              selectedIsland={toMapIslandCode(selectedIsland)}
              onChangeIsland={(value) => {
                setSelectedIsland(fromMapIslandCode(value));
                setSelectedEstateGeoid("all");
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        {filteredPosts.length ? (
          filteredPosts.map((post) => (
            <article
              key={post.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700">
                  {post.island}
                </span>

                {post.estateName ? (
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-700">
                    {post.estateName}
                  </span>
                ) : null}

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                  {post.type}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900">
                {post.title}
              </h3>

              <p className="mt-2 text-sm leading-7 text-slate-600">
                {post.body}
              </p>

              <div className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                {post.authorName}
                {post.placeName ? ` · ${post.placeName}` : ""}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <div className="text-lg font-black tracking-tight text-slate-900">
              No community posts match this filter
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Try another island or estate, or use the estate map below to
              explore the territory directly.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="inline-flex rounded-full bg-sky-600 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white"
              >
                Show Estate Map
              </button>
              <Link
                href="/estates/map"
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                Open Full Estate Map
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}