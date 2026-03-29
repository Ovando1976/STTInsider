"use client";

import { useSttFlow } from "./stt-flow-context";

type CurrentPlanBarProps = {
  onOpenConcierge: () => void;
  onOpenTransit: () => void;
};

export function CurrentPlanBar({
  onOpenConcierge,
  onOpenTransit,
}: CurrentPlanBarProps) {
  const { selectedPlace, conciergeDraft, transitDraft, clearFlow } = useSttFlow();

  const currentLabel =
    selectedPlace?.title ??
    transitDraft.dropoff?.label ??
    conciergeDraft.place?.title ??
    null;

  if (!currentLabel) return null;

  return (
    <section className="mb-6 rounded-[30px] border border-sky-200/70 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
            Current island plan
          </div>
          <div className="mt-2 truncate text-2xl font-black text-slate-900">
            {currentLabel}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedPlace?.category ? (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
                {selectedPlace.category}
              </span>
            ) : null}
            {selectedPlace?.subtitle ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {selectedPlace.subtitle}
              </span>
            ) : null}
            {transitDraft.dropoff?.label ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Transit ready
              </span>
            ) : null}
            {conciergeDraft.prompt ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                Concierge active
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenConcierge}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Ask Concierge
          </button>
          <button
            type="button"
            onClick={onOpenTransit}
            className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            Get There
          </button>
          <button
            type="button"
            onClick={clearFlow}
            className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}