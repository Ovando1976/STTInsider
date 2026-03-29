"use client";

import { useMemo } from "react";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { formatDateTime } from "@/lib/openvi/format";
import { useOpenVICollection } from "@/hooks/use-openvi-collection";
import type { Agency, Bill, Hearing, Issue } from "@/types/openvi";

type HearingsPagePayload = {
  hearings: Hearing[];
  agencies: Agency[];
  issues: Issue[];
};

export function HearingsClient({
  initialData,
}: {
  initialData: HearingsPagePayload;
}) {
  const hearingsQuery = useOpenVICollection<Hearing>({
    collectionName: OPENVI_COLLECTIONS.hearings,
    orderByField: "scheduledAt",
    orderDirection: "asc",
    limitCount: 100,
    initialData: initialData.hearings,
  });

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
    limitCount: 200,
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
              Hearings Tracker
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              Follow committee hearings, agendas, linked bills, agencies, and
              next steps in real time.
            </p>
          </div>

          <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
            {hearingsQuery.loading ? "Refreshing…" : "Live Firestore data"}
          </div>
        </div>

        {hearingsQuery.error ? (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {hearingsQuery.error}
          </div>
        ) : null}

        <div className="grid gap-5">
          {hearingsQuery.data.map((hearing) => (
            <article
              key={hearing.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    {hearing.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    {hearing.committeeName}
                  </p>
                </div>

                <div className="rounded-full border border-sky-900 bg-sky-950/40 px-3 py-1 text-xs font-medium text-sky-300">
                  {formatDateTime(hearing.scheduledAt)}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Location
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {hearing.location || "—"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Linked Bills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(hearing.relatedBillIds ?? []).length > 0 ? (
                      hearing.relatedBillIds?.map((billId) => (
                        <span
                          key={billId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {billMap.get(billId) ?? billId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No linked bills
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Related Agencies
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(hearing.relatedAgencyIds ?? []).length > 0 ? (
                      hearing.relatedAgencyIds?.map((agencyId) => (
                        <span
                          key={agencyId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {agencyMap.get(agencyId) ?? agencyId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No linked agencies
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Issue Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(hearing.relatedIssueIds ?? []).length > 0 ? (
                      hearing.relatedIssueIds?.map((issueId) => (
                        <span
                          key={issueId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {issueMap.get(issueId) ?? issueId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No linked issues
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {hearing.agenda ? (
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Agenda
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {hearing.agenda}
                  </p>
                </div>
              ) : null}

              {hearing.ai?.summary ? (
                <div className="mt-5 rounded-xl border border-sky-900/50 bg-sky-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    AI Summary
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {hearing.ai.summary}
                  </p>

                  {(hearing.ai.keyTopics?.length ?? 0) > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Key topics
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {hearing.ai?.keyTopics?.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
