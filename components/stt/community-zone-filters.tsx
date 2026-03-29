"use client";

import type { CommunityZone } from "@/types/community";

const STT_ZONES: { value: CommunityZone; label: string }[] = [
  { value: "all", label: "All STT" },
  { value: "town", label: "Town" },
  { value: "havensight", label: "Havensight" },
  { value: "crown_bay", label: "Crown Bay" },
  { value: "east_end", label: "East End" },
  { value: "northside", label: "Northside" },
  { value: "mid_island", label: "Tutu / Mid-Island" },
  { value: "southside", label: "Southside" },
  { value: "water_island", label: "Water Island" },
];

type Props = {
  selectedZone: CommunityZone;
  onChange: (zone: CommunityZone) => void;
};

export function CommunityZoneFilters({ selectedZone, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {STT_ZONES.map((zone) => {
        const active = zone.value === selectedZone;

        return (
          <button
            key={zone.value}
            type="button"
            onClick={() => onChange(zone.value)}
            className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition ${
              active
                ? "bg-sky-600 text-white shadow"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {zone.label}
          </button>
        );
      })}
    </div>
  );
}