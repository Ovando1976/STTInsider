"use client";

import type { Business } from "@/types/stt";
import Image from "next/image";
import { safeImageSrc } from "@/lib/stt/safe-image";

interface Props {
  item: Business;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onOpen: (item: Business) => void;
}

export function BusinessCard({
  item,
  isBookmarked,
  onToggleBookmark,
  onOpen,
}: Props) {
  return (
    <article className="group relative overflow-hidden rounded-[34px] border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
      {item.featured && (
        <div className="absolute right-3 top-3 z-20 rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900">
          Featured
        </div>
      )}

      <button
        onClick={() => onToggleBookmark(item.id)}
        className={`absolute left-3 top-3 z-20 rounded-2xl bg-white/90 p-2.5 shadow ${
          isBookmarked ? "text-rose-500" : "text-slate-300"
        }`}
        aria-label="Toggle bookmark"
      >
        ♥
      </button>

      <div className="relative h-[220px] w-full">
        <Image
          src={safeImageSrc(item.image)}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-sky-700">
            {item.category}
          </span>

          <span className="text-sm font-bold text-amber-500">
            ★ {item.rating?.toFixed(1) ?? "5.0"}
          </span>
        </div>

        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
          {item.name}
        </h3>

        <p className="mt-2 text-sm font-medium text-slate-500">
          {item.location}
        </p>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
          {item.description}
        </p>

        <button
          onClick={() => onOpen(item)}
          className="mt-6 rounded-2xl bg-sky-600 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl"
        >
          Details & Booking
        </button>
      </div>
    </article>
  );
}
