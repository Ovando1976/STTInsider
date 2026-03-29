"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import { FollowButton } from "@/components/openvi/follow-button";
import { formatMoney } from "@/lib/openvi/format";
import type { Contract, Vendor } from "@/types/openvi";

type VendorsPagePayload = {
  vendors: Vendor[];
  contracts: Contract[];
};

export function VendorsClient({
  initialData,
}: {
  initialData: VendorsPagePayload;
}) {
  const vendorsQuery = useOpenVICollection<Vendor>({
    collectionName: OPENVI_COLLECTIONS.vendors,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.vendors,
  });

  const contractsQuery = useOpenVICollection<Contract>({
    collectionName: OPENVI_COLLECTIONS.contracts,
    orderByField: "awardDate",
    orderDirection: "desc",
    limitCount: 400,
    initialData: initialData.contracts,
  });

  const vendorStats = useMemo(() => {
    return new Map(
      vendorsQuery.data.map((vendor) => {
        const relatedContracts = contractsQuery.data.filter(
          (contract) =>
            contract.vendorId === vendor.id ||
            contract.vendorName.toLowerCase() === vendor.normalizedName
        );

        const totalValue = relatedContracts.reduce(
          (sum, contract) => sum + (contract.amount ?? 0),
          0
        );

        return [
          vendor.id,
          {
            contractCount: relatedContracts.length,
            totalValue,
          },
        ];
      })
    );
  }, [vendorsQuery.data, contractsQuery.data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Vendors
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Monitor government vendors and track their connected contracts and
              public procurement footprint.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {vendorsQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {vendorsQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {vendorsQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {vendorsQuery.data.map((vendor) => {
            const stats = vendorStats.get(vendor.id) ?? {
              contractCount: 0,
              totalValue: 0,
            };

            return (
              <article
                key={vendor.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {vendor.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {vendor.industry || "Uncategorized"}
                    </p>
                  </div>

                  <FollowButton
                    type="vendor"
                    targetId={vendor.id}
                    targetLabel={vendor.name}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                      Total Value
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-emerald-300">
                      {formatMoney(stats.totalValue)}
                    </p>
                  </div>
                </div>

                {(vendor.tags?.length ?? 0) > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {vendor.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {vendor.website ? (
                  <p className="mt-4 text-sm text-sky-300">{vendor.website}</p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}