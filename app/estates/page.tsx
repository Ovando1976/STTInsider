import { notFound } from "next/navigation";
import {
  buildFallbackEstateHistory,
  findEstateHistory,
  findEstateHistoryByGeoid,
} from "@/lib/usvi/estate-history";

export default async function EstatePage({
  params,
  searchParams,
}: {
  params: Promise<{ geoid: string }>;
  searchParams: Promise<{
    baseName?: string;
    island?: "stt" | "stj" | "stx";
  }>;
}) {
  const { geoid } = await params;
  const { baseName, island } = await searchParams;

  let estate = findEstateHistoryByGeoid(geoid);

  if (!estate && baseName && island) {
    estate = findEstateHistory(baseName, island);
  }

  if (!estate) {
    notFound();
  }
  if (!estate && baseName && island) {
    estate = buildFallbackEstateHistory({
      geoid,
      baseName,
      island,
      fullName: `Estate ${baseName}`,
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
          Estate dossier
        </div>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
          {estate.baseName}
        </h1>

        <p className="mt-3 text-sm text-slate-600">
          {estate.fullName ?? `Estate ${estate.baseName}`}
        </p>

        {estate.quarter ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Quarter
            </div>
            <div className="mt-1 text-sm font-black text-slate-900">
              {estate.quarter}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          <p className="text-sm leading-7 text-slate-700">
            {estate.historicalSummary}
          </p>

          {estate.topographicNotes ? (
            <p className="text-sm leading-7 text-slate-700">
              {estate.topographicNotes}
            </p>
          ) : null}

          {estate.cartographicNotes ? (
            <p className="text-sm leading-7 text-slate-700">
              {estate.cartographicNotes}
            </p>
          ) : null}

          {estate.tenureNotes ? (
            <p className="text-sm leading-7 text-slate-700">
              {estate.tenureNotes}
            </p>
          ) : null}
        </div>

        {estate.sources?.length ? (
          <div className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Sources: {estate.sources.join(" · ")}
          </div>
        ) : null}
      </div>
    </main>
  );
}