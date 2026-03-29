// app/estates/[geoid]/page.tsx
import { notFound } from "next/navigation";
import {
  buildFallbackEstateHistory,
  findEstateHistoryByGeoid,
} from "@/lib/usvi/estate-history";
import { EstateInsetMap } from "@/components/estates/estate-inset-map";

type EstatePageProps = {
  params: Promise<{ geoid: string }>;
  searchParams?: Promise<{
    baseName?: string;
    island?: "stt" | "stj" | "stx";
    fullName?: string;
  }>;
};

export default async function EstatePage({
  params,
  searchParams,
}: EstatePageProps) {
  const { geoid } = await params;
  const search = searchParams ? await searchParams : undefined;

  let estate = findEstateHistoryByGeoid(
    geoid,
    search?.baseName,
    search?.island
  );

  if (!estate && search?.baseName && search?.island) {
    estate = buildFallbackEstateHistory({
      geoid,
      baseName: search.baseName,
      fullName: search.fullName,
      island: search.island,
    });
  }

  if (!estate) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-700">
          Estate dossier
        </div>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
          {estate.baseName}
        </h1>

        {estate.fullName ? (
          <p className="mt-3 text-sm text-slate-600">{estate.fullName}</p>
        ) : null}
        <EstateInsetMap
          geoid={estate.geoid || geoid}
          title={estate.fullName || estate.baseName}
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <InfoRow label="Island" value={estate.island.toUpperCase()} />
          <InfoRow label="Quarter" value={estate.quarter || "Unknown"} />
          <InfoRow label="GEOID" value={estate.geoid || geoid} />
        </div>

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

        {estate.aliases?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {estate.aliases.map((alias) => (
              <span
                key={alias}
                className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700"
              >
                {alias}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Sources: {estate.sources.join(" · ")}
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}
