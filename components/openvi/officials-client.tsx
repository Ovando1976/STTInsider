"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import { FollowButton } from "@/components/openvi/follow-button";
import type { Bill, Official, PromiseRecord } from "@/types/openvi";

type OfficialsPagePayload = {
  officials: Official[];
  bills: Bill[];
  promises: PromiseRecord[];
};

export function OfficialsClient({
  initialData,
}: {
  initialData: OfficialsPagePayload;
}) {
  const officialsQuery = useOpenVICollection<Official>({
    collectionName: OPENVI_COLLECTIONS.officials,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.officials,
  });

  const billsQuery = useOpenVICollection<Bill>({
    collectionName: OPENVI_COLLECTIONS.bills,
    orderByField: "lastActionAt",
    orderDirection: "desc",
    limitCount: 300,
    initialData: initialData.bills,
  });

  const promisesQuery = useOpenVICollection<PromiseRecord>({
    collectionName: OPENVI_COLLECTIONS.promises,
    orderByField: "sourceDate",
    orderDirection: "desc",
    limitCount: 300,
    initialData: initialData.promises,
  });

  const officialStats = useMemo(() => {
    return new Map(
      officialsQuery.data.map((official) => {
        const sponsoredBills = billsQuery.data.filter((bill) =>
          (bill.sponsors ?? []).includes(official.id)
        ).length;

        const promiseCount = promisesQuery.data.filter(
          (promise) => promise.officialId === official.id
        ).length;

        return [
          official.id,
          {
            sponsoredBills,
            promiseCount,
          },
        ];
      })
    );
  }, [officialsQuery.data, billsQuery.data, promisesQuery.data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Officials
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Follow public officials and track sponsored bills, current roles,
              and linked public commitments.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {officialsQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {officialsQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {officialsQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {officialsQuery.data.map((official) => {
            const stats = officialStats.get(official.id) ?? {
              sponsoredBills: 0,
              promiseCount: 0,
            };

            return (
              <article
                key={official.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {official.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">{official.role}</p>
                    <p className="mt-1 text-sm capitalize text-slate-500">
                      {official.branch}
                    </p>
                  </div>

                  <FollowButton
                    type="official"
                    targetId={official.id}
                    targetLabel={official.name}
                  />
                </div>

                {official.bio ? (
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {official.bio}
                  </p>
                ) : null}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Sponsored Bills
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.sponsoredBills}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Linked Promises
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {stats.promiseCount}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
                  {official.district ? <span>District: {official.district}</span> : null}
                  {official.party ? <span>Party: {official.party}</span> : null}
                  <span>{official.active ? "Active" : "Inactive"}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}