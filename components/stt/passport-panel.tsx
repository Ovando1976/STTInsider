"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Business, Checkin } from "@/types/stt";
import Image from "next/image";
import { safeImageSrc } from "@/lib/stt/safe-image";

interface Props {
  checkins: Checkin[];
  businesses: Business[];
  onUploadStampPhoto?: (checkinId: string, file: File) => Promise<void> | void;
}

type BadgeCardProps = {
  emoji: string;
  title: string;
  subtitle: string;
  count: number;
  total: number;
  accent: string;
};

type RecentStamp = Checkin & {
  business?: Business;
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const month = date.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = String(date.getUTCDate());
  const year = String(date.getUTCFullYear());
  return `${month} ${day}, ${year}`;
}

function progressPercent(value: number, total: number) {
  return Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
}

function stampEmoji(category?: Business["category"]) {
  if (category === "Beach") return "🏝️";
  if (category === "Food") return "🍽️";
  if (category === "Shopping") return "🛍️";
  if (category === "Stay") return "🏨";
  if (category === "Activity") return "🎟️";
  return "📍";
}

function explorerRank(earnedBadges: number, totalStops: number) {
  if (earnedBadges >= 3 && totalStops >= 8) {
    return {
      name: "Island Legend",
      subtitle: "You know the island like a local.",
    };
  }
  if (earnedBadges >= 2) {
    return {
      name: "Trail Builder",
      subtitle: "Your passport is starting to look serious.",
    };
  }
  if (earnedBadges >= 1) {
    return {
      name: "Rising Explorer",
      subtitle: "You are building momentum.",
    };
  }
  return {
    name: "New Arrival",
    subtitle: "Your island journey is just beginning.",
  };
}

function nextGoalText(
  beachCount: number,
  foodCount: number,
  shoppingCount: number
) {
  if (beachCount < 3)
    return `Visit ${3 - beachCount} more beach${
      3 - beachCount === 1 ? "" : "es"
    } to complete Beach Bum.`;
  if (foodCount < 3)
    return `Try ${3 - foodCount} more food stop${
      3 - foodCount === 1 ? "" : "s"
    } to complete Foodie.`;
  if (shoppingCount < 2)
    return `Check in at ${2 - shoppingCount} more shopping spot${
      2 - shoppingCount === 1 ? "" : "s"
    } to complete Shop Explorer.`;
  return "All core badges completed. Time to expand your island collection.";
}

function BadgeCard({
  emoji,
  title,
  subtitle,
  count,
  total,
  accent,
}: BadgeCardProps) {
  const percent = progressPercent(count, total);
  const completed = count >= total;

  return (
    <div className="group relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className={`absolute inset-x-0 top-0 h-1.5 ${accent}`} />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-slate-50 text-4xl shadow-inner">
          {emoji}
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900">
            {count}/{total}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
            Progress
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black tracking-tight text-slate-900">
          {title}
        </h3>
        {completed && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Unlocked
          </span>
        )}
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
          <span>Completion</span>
          <span>{percent}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${accent}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StampImage({
  src,
  alt,
  emoji,
}: {
  src?: string;
  alt: string;
  emoji: string;
}) {
  if (src) {
    return (
      <div className="relative h-24 w-24 overflow-hidden rounded-[22px] shadow-sm">
        <Image
          src={safeImageSrc(src)}
          alt={alt}
          fill
          sizes="96px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-24 items-center justify-center rounded-[22px] bg-slate-100 text-4xl shadow-sm">
      {emoji}
    </div>
  );
}

export function PassportPanel({
  checkins,
  businesses,
  onUploadStampPhoto,
}: Props) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const checkedBusinessIds = useMemo(
    () => new Set(checkins.map((c) => c.businessId)),
    [checkins]
  );

  const beachCount = useMemo(
    () =>
      businesses.filter(
        (b) => b.category === "Beach" && checkedBusinessIds.has(b.id)
      ).length,
    [businesses, checkedBusinessIds]
  );

  const foodCount = useMemo(
    () =>
      businesses.filter(
        (b) => b.category === "Food" && checkedBusinessIds.has(b.id)
      ).length,
    [businesses, checkedBusinessIds]
  );

  const shoppingCount = useMemo(
    () =>
      businesses.filter(
        (b) => b.category === "Shopping" && checkedBusinessIds.has(b.id)
      ).length,
    [businesses, checkedBusinessIds]
  );

  const recentStamps = useMemo<RecentStamp[]>(
    () =>
      [...checkins]
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((checkin) => ({
          ...checkin,
          business: businesses.find((b) => b.id === checkin.businessId),
        }))
        .slice(0, 8),
    [checkins, businesses]
  );

  const totalUniqueVisited = checkedBusinessIds.size;
  const earnedBadges =
    Number(beachCount >= 3) +
    Number(foodCount >= 3) +
    Number(shoppingCount >= 2);
  const rank = explorerRank(earnedBadges, totalUniqueVisited);
  const nextGoal = nextGoalText(beachCount, foodCount, shoppingCount);

  async function handleFileSelected(checkinId: string, file?: File) {
    if (!file || !onUploadStampPhoto) return;

    try {
      setUploadingId(checkinId);
      await onUploadStampPhoto(checkinId, file);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 py-10">
      <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-sky-700 via-cyan-600 to-blue-700 p-8 text-white shadow-[0_28px_90px_rgba(2,132,199,0.28)] md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white/90">
              Island Passport
            </div>

            <h2 className="text-3xl font-black tracking-tight md:text-5xl">
              Collect your island journey
            </h2>

            <p className="mt-3 max-w-2xl text-sm text-sky-50 md:text-base">
              Check in across beaches, restaurants, shopping spots, and more to
              unlock progress, build your travel identity, and save the best
              moments with photos.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                  Places Visited
                </div>
                <div className="mt-1 text-3xl font-black">
                  {totalUniqueVisited}
                </div>
              </div>

              <div className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                  Badges Earned
                </div>
                <div className="mt-1 text-3xl font-black">{earnedBadges}</div>
              </div>

              <div className="rounded-2xl bg-white/12 px-4 py-4 backdrop-blur">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                  Total Check-ins
                </div>
                <div className="mt-1 text-3xl font-black">
                  {checkins.length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-md">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                Explorer Status
              </div>
              <div className="mt-2 text-2xl font-black">{rank.name}</div>
              <p className="mt-2 text-sm text-sky-50">{rank.subtitle}</p>
              <div className="mt-4 rounded-2xl bg-black/10 px-4 py-3 text-sm text-white/90">
                {nextGoal}
              </div>
            </div>

            <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-md">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                Social Access
              </div>
              <div className="mt-2 text-xl font-black">
                Share the island vibe
              </div>
              <p className="mt-2 text-sm text-sky-50">
                Open the social side to turn your passport moments into posts
                and memories.
              </p>
              <Link
                href="/social"
                className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
              >
                Open Social Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <BadgeCard
          emoji="🏖️"
          title="Beach Bum"
          subtitle="Check in at beaches across the island."
          count={beachCount}
          total={3}
          accent="bg-sky-500"
        />
        <BadgeCard
          emoji="🍛"
          title="Foodie"
          subtitle="Discover local eats and island flavor."
          count={foodCount}
          total={3}
          accent="bg-orange-500"
        />
        <BadgeCard
          emoji="🛍️"
          title="Shop Explorer"
          subtitle="Hit key shopping districts and markets."
          count={shoppingCount}
          total={2}
          accent="bg-emerald-500"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                Recent Stamps
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Your latest island check-ins, now with photo memories.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {recentStamps.length} recent
            </div>
          </div>

          <div className="space-y-4">
            {recentStamps.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <div className="text-5xl">📍</div>
                <p className="mt-4 text-sm font-medium text-slate-500">
                  No stamps yet. Start checking in to build your passport.
                </p>
              </div>
            ) : (
              recentStamps.map((item) => {
                const emoji = stampEmoji(item.business?.category);
                const imageSrc = item.photoUrl || item.business?.image;

                return (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <StampImage
                        src={imageSrc}
                        alt={item.business?.name ?? "Stamp image"}
                        emoji={emoji}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-black text-slate-900">
                              {item.business?.name ?? "Spot"}
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                              {item.business?.category ?? "Island stop"}
                            </div>
                            <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                              {formatDate(item.timestamp)}
                            </div>
                          </div>

                          <div className="flex shrink-0 gap-2">
                            {onUploadStampPhoto && (
                              <>
                                <input
                                  ref={(el) => {
                                    inputRefs.current[item.id] = el;
                                  }}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleFileSelected(
                                      item.id,
                                      e.target.files?.[0]
                                    )
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    inputRefs.current[item.id]?.click()
                                  }
                                  disabled={uploadingId === item.id}
                                  className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {uploadingId === item.id
                                    ? "Uploading..."
                                    : item.photoUrl
                                    ? "Change Photo"
                                    : "Add Photo"}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {!imageSrc && (
                          <div className="mt-4 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500">
                            No image yet for this stamp.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              Passport Summary
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Your island activity at a glance.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Unique Stops
                </div>
                <div className="mt-2 text-3xl font-black text-slate-900">
                  {totalUniqueVisited}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Completed Badges
                </div>
                <div className="mt-2 text-3xl font-black text-slate-900">
                  {earnedBadges}
                </div>
              </div>

              <div className="rounded-[24px] bg-slate-50 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Photo Stamps
                </div>
                <div className="mt-2 text-3xl font-black text-slate-900">
                  {checkins.filter((c) => Boolean(c.photoUrl)).length}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
                Current Rank
              </div>
              <div className="mt-2 text-xl font-black">{rank.name}</div>
              <p className="mt-2 text-sm text-slate-300">{rank.subtitle}</p>
            </div>
          </div>

          <div className="rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              Next Goal
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              What to do next to keep your passport growing.
            </p>

            <div className="mt-5 rounded-[24px] bg-sky-50 p-5">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
                Recommended Target
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {nextGoal}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                Add a photo to each stamp to make your passport feel alive.
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">
                Use the social page to share your favorite island stops.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
