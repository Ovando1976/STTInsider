"use client";

import type { UsviEstate } from "@/types/usvi-estates";

type Props = {
  estates: UsviEstate[];
  selectedEstateGeoid: string | "all";
  onChange: (value: string | "all") => void;
};

export function CommunityEstateFilter({
  estates,
  selectedEstateGeoid,
  onChange,
}: Props) {
  if (estates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition ${
          selectedEstateGeoid === "all"
            ? "bg-sky-600 text-white"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        All Estates
      </button>

      {estates.map((estate) => (
        <button
          key={estate.geoid}
          type="button"
          onClick={() => onChange(estate.geoid)}
          className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] transition ${
            selectedEstateGeoid === estate.geoid
              ? "bg-cyan-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {estate.basename}
        </button>
      ))}
    </div>
  );
}