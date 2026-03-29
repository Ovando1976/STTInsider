"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { formatDateTime } from "@/lib/openvi/format";
import type { Agency, Bill, Issue, Official } from "@/types/openvi";
import { FollowButton } from "@/components/openvi/follow-button";

const statusTone: Record<string, string> = {
  introduced: "border-slate-700 bg-slate-900 text-slate-300",
  in_committee: "border-amber-900 bg-amber-950/40 text-amber-300",
  scheduled_for_hearing: "border-sky-900 bg-sky-950/40 text-sky-300",
  amended: "border-purple-900 bg-purple-950/40 text-purple-300",
  passed_legislature: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
  vetoed: "border-rose-900 bg-rose-950/40 text-rose-300",
  signed: "border-emerald-900 bg-emerald-950/40 text-emerald-300",
  failed: "border-red-900 bg-red-950/40 text-red-300",
  archived: "border-slate-800 bg-slate-950 text-slate-400",
};

type BillsPagePayload = {
  bills: Bill[];
  agencies: Agency[];
  officials: Official[];
  issues: Issue[];
};

export function BillsClient({
  initialData,
}: {
  initialData: BillsPagePayload;
}) {
  const [bills, setBills] = useState(initialData.bills);
  const [agencies, setAgencies] = useState(initialData.agencies);
  const [officials, setOfficials] = useState(initialData.officials);
  const [issues, setIssues] = useState(initialData.issues);

  useEffect(() => {
    if (!db) return;

    const unsubBills = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.bills),
        orderBy("lastActionAt", "desc"),
        limit(100)
      ),
      (snapshot) => {
        setBills(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Bill, "id">),
          }))
        );
      }
    );

    const unsubAgencies = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.agencies),
        orderBy("name", "asc"),
        limit(100)
      ),
      (snapshot) => {
        setAgencies(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Agency, "id">),
          }))
        );
      }
    );

    const unsubOfficials = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.officials),
        orderBy("name", "asc"),
        limit(100)
      ),
      (snapshot) => {
        setOfficials(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Official, "id">),
          }))
        );
      }
    );

    const unsubIssues = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.issues),
        orderBy("name", "asc"),
        limit(100)
      ),
      (snapshot) => {
        setIssues(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Issue, "id">),
          }))
        );
      }
    );

    return () => {
      unsubBills();
      unsubAgencies();
      unsubOfficials();
      unsubIssues();
    };
  }, []);

  const agencyMap = useMemo(
    () => new Map(agencies.map((agency) => [agency.id, agency.name])),
    [agencies]
  );

  const officialMap = useMemo(
    () => new Map(officials.map((official) => [official.id, official.name])),
    [officials]
  );

  const issueMap = useMemo(
    () => new Map(issues.map((issue) => [issue.id, issue.name])),
    [issues]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
            OPENVI
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Bills Tracker
          </h1>
          <p className="mt-3 max-w-3xl text-base text-slate-300">
            Follow public-interest legislation with plain-English summaries,
            live status tracking, related issues, sponsors, and connected
            agencies.
          </p>
        </div>

        <div className="grid gap-5">
          {bills.map((bill) => (
            <article
              key={bill.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {bill.billNumber} {bill.session ? `· ${bill.session}` : ""}
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {bill.title}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    {bill.summaryLong ??
                      bill.summaryShort ??
                      "No summary available."}
                  </p>
                </div>

                <div>
                  <span
                    className={[
                      "inline-flex rounded-full border px-3 py-1 text-xs font-medium capitalize",
                      statusTone[bill.status] ??
                        "border-slate-700 bg-slate-900 text-slate-300",
                    ].join(" ")}
                  >
                    {bill.status.replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <FollowButton
                  type="bill"
                  targetId={bill.id}
                  targetLabel={`${bill.billNumber} — ${bill.title}`}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Introduced
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(bill.introducedAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Last Action
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {formatDateTime(bill.lastActionAt)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Issue Tags
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(bill.issueIds ?? []).length > 0 ? (
                      bill.issueIds?.map((issueId) => (
                        <span
                          key={issueId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {issueMap.get(issueId) ?? issueId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No linked issues yet
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Sponsors
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(bill.sponsors ?? []).length > 0 ? (
                      bill.sponsors?.map((officialId) => (
                        <span
                          key={officialId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {officialMap.get(officialId) ?? officialId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No sponsors linked
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Agencies
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(bill.agencyIds ?? []).length > 0 ? (
                      bill.agencyIds?.map((agencyId) => (
                        <span
                          key={agencyId}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {agencyMap.get(agencyId) ?? agencyId}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">
                        No agencies linked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {bill.ai?.whyItMatters ? (
                <div className="mt-5 rounded-xl border border-sky-900/50 bg-sky-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                    Why it matters
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    {bill.ai.whyItMatters}
                  </p>

                  {(bill.ai.affectedGroups?.length ?? 0) > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Affected groups
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {bill.ai?.affectedGroups?.map((group) => (
                          <span
                            key={group}
                            className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                          >
                            {group}
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
