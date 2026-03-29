"use client";

import {
  districtLabel,
  islandLabel,
  quarterLabel,
} from "@/lib/usvi/community-geography";
import type { CommunityPost } from "@/types/community";

type Props = {
  post: CommunityPost;
  onAskConcierge?: (post: CommunityPost) => void;
  onGetThere?: (post: CommunityPost) => void;
  onSave?: (post: CommunityPost) => void;
};

function typeBadge(type: CommunityPost["type"]) {
  switch (type) {
    case "ferry":
      return "bg-cyan-100 text-cyan-700";
    case "beach":
      return "bg-amber-100 text-amber-700";
    case "nightlife":
      return "bg-violet-100 text-violet-700";
    case "food":
      return "bg-emerald-100 text-emerald-700";
    case "event":
      return "bg-rose-100 text-rose-700";
    case "tip":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-sky-100 text-sky-700";
  }
}

function timeAgo(timestamp: number) {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function locationLine(post: CommunityPost) {
  const parts = [
    districtLabel(post.district),
    islandLabel(post.island),
    quarterLabel(post.quarter),
    post.estateName ?? null,
    post.placeName ?? null,
  ].filter(Boolean);

  return parts.join(" · ");
}

export function CommunityFeedCard({
  post,
  onAskConcierge,
  onGetThere,
  onSave,
}: Props) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-700">
          {quarterLabel(post.quarter)}
        </span>

        <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
          {islandLabel(post.island)}
        </span>

        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${typeBadge(
            post.type
          )}`}
        >
          {post.type}
        </span>

        {post.verified ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">
            Verified
          </span>
        ) : null}

        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
          {timeAgo(post.createdAt)}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-black tracking-tight text-slate-900">
          {post.title}
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{post.body}</p>
      </div>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {locationLine(post)}
        </div>

        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {post.authorName}
          {post.authorHandle ? ` · ${post.authorHandle}` : ""}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAskConcierge?.(post)}
          className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
        >
          Ask Concierge
        </button>

        <button
          type="button"
          onClick={() => onGetThere?.(post)}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
        >
          Get There
        </button>

        <button
          type="button"
          onClick={() => onSave?.(post)}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
        >
          Save
        </button>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span>❤️ {post.likes}</span>
        <span>↩ {post.replies}</span>
      </div>
    </article>
  );
}
