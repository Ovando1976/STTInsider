"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import { FollowButton } from "@/components/openvi/follow-button";
import type { Bill, Contract, Hearing, Issue } from "@/types/openvi";

type IssuesPagePayload = {
  issues: Issue[];
  bills: Bill[];
  hearings: Hearing[];
  contracts: Contract[];
};

export function IssuesClient({
  initialData,
}: {
  initialData: IssuesPagePayload;
}) {
  const issuesQuery = useOpenVICollection<Issue>({
    collectionName: OPENVI_COLLECTIONS.issues,
    orderByField: "name",
    orderDirection: "asc",
    limitCount: 200,
    initialData: initialData.issues,
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

  const issueStats = useMemo(() => {
    return new Map(
      issuesQuery.data.map((issue) => {
        const billCount = billsQuery.data.filter((bill) =>
          (bill.issueIds ?? []).includes(issue.id)
        ).length;

        const hearingCount = hearingsQuery.data.filter((hearing) =>
          (hearing.relatedIssueIds ?? []).includes(issue.id)
        ).length;

        const contractCount = contractsQuery.data.filter((contract) =>
          (contract.relatedIssueIds ?? []).includes(issue.id)
        ).length;

        return [
          issue.id,
          {
            billCount,
            hearingCount,
            contractCount,
          },
        ];
      })
    );
  }, [issuesQuery.data, billsQuery.data, hearingsQuery.data, contractsQuery.data]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Issues
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Track territory-wide public issues and see the bills, hearings, and
              contracts connected to each one.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {issuesQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {issuesQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {issuesQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          {issuesQuery.data.map((issue) => {
            const stats = issueStats.get(issue.id) ?? {
              billCount: 0,
              hearingCount: 0,
              contractCount: 0,
            };

            return (
              <article
                key={issue.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-white">
                      {issue.name}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {issue.description || "No description available."}
                    </p>
                  </div>

                  <FollowButton
                    type="issue"
                    targetId={issue.id}
                    targetLabel={issue.name}
                  />
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
                </div>

                {(issue.tags?.length ?? 0) > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {issue.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}