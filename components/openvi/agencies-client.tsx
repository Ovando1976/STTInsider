"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import { FollowButton } from "@/components/openvi/follow-button";
import type { Agency, Bill, Contract, Hearing, Official } from "@/types/openvi";

type AgenciesPagePayload = {
  agencies: Agency[];
  bills: Bill[];
  hearings: Hearing[];
  contracts: Contract[];
  officials: Official[];
};

export function AgenciesClient({
  initialData,
}: {
  initialData: AgenciesPagePayload;
}) {
  const agenciesQuery = useOpenVICollection<Agency>({
    collectionName: OPENVI_COLLECTIONS.agencies,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.agencies,
  });

  const billsQuery = useOpenVICollection<Bill>({
    collectionName: OPENVI_COLLECTIONS.bills,
    orderByField: "lastActionAt",
    orderDirection: "desc",
    limitCount: 300,
    initialData: initialData.bills,
  });

  const hearingsQuery = useOpenVICollection<Hearing>({
    collectionName: OPENVI_COLLECTIONS.hearings,
    orderByField: "scheduledAt",
    orderDirection: "asc",
    limitCount: 300,
    initialData: initialData.hearings,
  });

  const contractsQuery = useOpenVICollection<Contract>({
    collectionName: OPENVI_COLLECTIONS.contracts,
    orderByField: "awardDate",
    orderDirection: "desc",
    limitCount: 300,
    initialData: initialData.contracts,
  });

  const officialsQuery = useOpenVICollection<Official>({
    collectionName: OPENVI_COLLECTIONS.officials,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 300,
    initialData: initialData.officials,
  });

  const agencyStats = useMemo(() => {
    return new Map(
      agenciesQuery.data.map((agency) => {
        const billCount = billsQuery.data.filter((bill) =>
          (bill.agencyIds ?? []).includes(agency.id)
        ).length;

        const hearingCount = hearingsQuery.data.filter((hearing) =>
          (hearing.relatedAgencyIds ?? []).includes(agency.id)
        ).length;

        const contractCount = contractsQuery.data.filter(
          (contract) => contract.agencyId === agency.id
        ).length;

        const officialCount = officialsQuery.data.filter(
          (official) => official.agencyId === agency.id
        ).length;

        return [
          agency.id,
          {
            billCount,
            hearingCount,
            contractCount,
            officialCount,
          },
        ];
      })
    );
  }, [
    agenciesQuery.data,
    billsQuery.data,
    hearingsQuery.data,
    contractsQuery.data,
    officialsQuery.data,
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Agencies
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Explore government agencies and see the legislation, hearings,
              contracts, and officials tied to each one.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {agenciesQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {agenciesQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {agenciesQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {agenciesQuery.data.map((agency) => {
            const stats = agencyStats.get(agency.id) ?? {
              billCount: 0,
              hearingCount: 0,
              contractCount: 0,
              officialCount: 0,
            };

            return (
              <article
                key={agency.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {agency.name}
                    </h2>
                    <p className="mt-2 text-sm capitalize text-slate-400">
                      {agency.branch}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {agency.description || "No description available."}
                    </p>
                  </div>

                  <FollowButton
                    type="agency"
                    targetId={agency.id}
                    targetLabel={agency.name}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Bills
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.billCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Hearings
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.hearingCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Contracts
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.contractCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Officials
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.officialCount}
                    </p>
                  </div>
                </div>

                {(agency.tags?.length ?? 0) > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {agency.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {agency.website ? (
                  <p className="mt-4 text-sm text-sky-300">{agency.website}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}