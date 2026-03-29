"use client";

import type { CommunityContext } from "@/types/community";

type Props = {
  context: CommunityContext;
};

export function CommunityContextBar({ context }: Props) {
  const items = [
    { label: "Cruise pulse", value: context.cruisePulse },
    { label: "Ferry watch", value: context.ferryWatch },
    { label: "Marine", value: context.marineNote },
    { label: "Season", value: context.seasonalNote },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 shadow-sm"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}