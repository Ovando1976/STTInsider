"use client";

import type { Business } from "@/types/stt";
import { BusinessCard } from "./business-card";

interface Props {
  items: Business[];
  bookmarkIds: string[];
  onToggleBookmark: (id: string) => void;
  onOpen: (item: Business) => void;
}

export function BusinessGrid({
  items,
  bookmarkIds,
  onToggleBookmark,
  onOpen,
}: Props) {
  if (!items.length) {
    return (
      <div className="rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center">
        <h3 className="text-xl font-black tracking-tight text-slate-900">
          Nothing matched that search
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Try another keyword or switch categories.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <BusinessCard
          key={item.id}
          item={item}
          isBookmarked={bookmarkIds.includes(item.id)}
          onToggleBookmark={onToggleBookmark}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
