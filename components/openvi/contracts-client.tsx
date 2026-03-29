"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { formatDateTime, formatMoney } from "@/lib/openvi/format";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import type { Agency, Bill, Contract, Issue, Vendor } from "@/types/openvi";

type ContractsPagePayload = {
  contracts: Contract[];
  agencies: Agency[];
  vendors: Vendor[];
  bills: Bill[];
  issues: Issue[];
};

export function ContractsClient({
  initialData,
}: {
  initialData: ContractsPagePayload;
}) {
  const contractsQuery = useOpenVICollection<Contract>({
    collectionName: OPENVI_COLLECTIONS.contracts,
    orderByField: "awardDate",
    orderDirection: "desc",
    limitCount: 100,
    initialData: initialData.contracts,
  });

  const agenciesQuery = useOpenVICollection<Agency>({
    collectionName: OPENVI_COLLECTIONS.agencies,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.agencies,
  });

  const vendorsQuery = useOpenVICollection<Vendor>({
    collectionName: OPENVI_COLLECTIONS.vendors,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.vendors,
  });

  const billsQuery = useOpenVICollection<Bill>({
    collectionName: OPENVI_COLLECTIONS.bills,
    orderByField: "lastActionAt",
    orderDirection: "desc",
    limitCount: 200,
    initialData: initialData.bills,
  });

  const issuesQuery = useOpenVICollection<Issue>({
    collectionName: OPENVI_COLLECTIONS.issues,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.issues,
  });

  const agencyMap = useMemo(
    () => new Map(agenciesQuery.data.map((agency) => [agency.id, agency.name])),
    [agenciesQuery.data]
  );

  const vendorMap = useMemo(
    () => new Map(vendorsQuery.data.map((vendor) => [vendor.id, vendor.name])),
    [vendorsQuery.data]
  );

  const billMap = useMemo(
    () => new Map(billsQuery.data.map((bill) => [bill.id, bill.billNumber])),
    [billsQuery.data]
  );

  const issueMap = useMemo(
    () => new Map(issuesQuery.data.map((issue) => [issue.id, issue.name])),
    [issuesQuery.data]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Contracts Monitor
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Track contract awards, vendors, agencies, linked bills, and
              procurement-related public activity in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {contractsQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {contractsQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {contractsQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5">
          {contractsQuery.data.map((contract) => (
            <article
              key={contract.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {contract.contractNumber || "Unnumbered Contract"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {contract.title}
                  </h2>
                  <p className="mt-3 text-sm text-slate-300">
                    {contract.ai?.summary || "No summary available."}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-semibold text-emerald-300">
                    {formatMoney(contract.amount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Awarded {formatDateTime(contract.awardDate)}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Agency
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {contract.agencyId
                      ? agencyMap.get(contract.agencyId) || contract.agencyName
                      : contract.agencyName}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Vendor
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {contract.vendorId
                      ? vendorMap.get(contract.vendorId) || contract.vendorName
                      : contract.vendorName}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Procurement Method
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {contract.procurementMethod || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Linked Bills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(contract.relatedBillIds ?? []).length > 0 ? (
                      contract.relatedBillIds?.map((billId) => (
                        <span
                          key={billId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {billMap.get(billId) ?? billId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No linked bills</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Issue Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(contract.relatedIssueIds ?? []).length > 0 ? (
                      contract.relatedIssueIds?.map((issueId) => (
                        <span
                          key={issueId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {issueMap.get(issueId) ?? issueId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No linked issues</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Start Date
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(contract.startDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    End Date
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(contract.endDate)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Status
                  </p>
                  <p className="mt-2 text-sm capitalize text-slate-200">
                    {contract.status || "—"}
                  </p>
                </div>
              </div>

              {(contract.ai?.flags?.length ?? 0) > 0 ? (
                <div className="mt-5 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    Flags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {contract.ai?.flags?.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full border border-amber-900/60 px-2.5 py-1 text-xs text-amber-200"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}