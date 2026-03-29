"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import { formatDateTime, formatMoney } from "@/lib/openvi/format";
import type { Bill, Contract, Hearing, Issue } from "@/types/openvi";
import { AuthStatus } from "@/components/openvi/auth-status";

type DashboardPayload = {
  bills: Bill[];
  hearings: Hearing[];
  contracts: Contract[];
  issues: Issue[];
  stats: {
    trackedBills: number;
    upcomingHearings: number;
    recentContracts: number;
    activeIssues: number;
  };
};

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm transition hover:border-slate-700 hover:bg-slate-900">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function SectionCard({
  title,
  description,
  children,
  href,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          ) : null}
        </div>
        {href ? (
          <Link
            href={href}
            className="text-sm font-medium text-sky-400 hover:text-sky-300"
          >
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function computeStats(data: {
  bills: Bill[];
  hearings: Hearing[];
  contracts: Contract[];
  issues: Issue[];
}) {
  return {
    trackedBills: data.bills.length,
    upcomingHearings: data.hearings.length,
    recentContracts: data.contracts.length,
    activeIssues: data.issues.filter((issue) => issue.active).length,
  };
}

export function DashboardClient({
  initialData,
}: {
  initialData: DashboardPayload;
}) {
  const [bills, setBills] = useState(initialData.bills);
  const [hearings, setHearings] = useState(initialData.hearings);
  const [contracts, setContracts] = useState(initialData.contracts);
  const [issues, setIssues] = useState(initialData.issues);

  useEffect(() => {
    const unsubBills = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.bills),
        orderBy("lastActionAt", "desc"),
        limit(8)
      ),
      (snapshot) => {
        setBills(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Bill, "id">),
          }))
        );
      }
    );

    const unsubHearings = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.hearings),
        orderBy("scheduledAt", "asc"),
        limit(8)
      ),
      (snapshot) => {
        setHearings(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Hearing, "id">),
          }))
        );
      }
    );

    const unsubContracts = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.contracts),
        orderBy("awardDate", "desc"),
        limit(8)
      ),
      (snapshot) => {
        setContracts(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Contract, "id">),
          }))
        );
      }
    );

    const unsubIssues = onSnapshot(
      query(
        collection(db, OPENVI_COLLECTIONS.issues),
        orderBy("name", "asc"),
        limit(24)
      ),
      (snapshot) => {
        setIssues(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Issue, "id">),
          }))
        );
      }
    );

    return () => {
      unsubBills();
      unsubHearings();
      unsubContracts();
      unsubIssues();
    };
  }, []);

  const stats = useMemo(
    () => computeStats({ bills, hearings, contracts, issues }),
    [bills, hearings, contracts, issues]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-400">
              OPENVI
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
              Track the Virgin Islands Government
            </h1>
            <p className="mt-3 max-w-3xl text-base text-slate-300">
              A public accountability dashboard for bills, hearings, contracts,
              agencies, and major public issues across the U.S. Virgin Islands.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-sky-900/60 bg-sky-950/30 px-4 py-3 text-sm text-sky-200">
              Live Firestore data
            </div>
            <AuthStatus />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tracked Bills"
            value={stats.trackedBills}
            href="/bills"
          />
          <StatCard label="Upcoming Hearings" value={stats.upcomingHearings} />
          <StatCard label="Recent Contracts" value={stats.recentContracts} />
          <StatCard label="Active Issues" value={stats.activeIssues} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <SectionCard
            title="Latest Bill Activity"
            description="Recent legislative items and public-interest measures."
            href="/bills"
          >
            <div className="space-y-4">
              {bills.map((bill) => (
                <div
                  key={bill.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {bill.billNumber}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-white">
                        {bill.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {bill.summaryShort ?? "No summary available."}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full border border-sky-800 bg-sky-950 px-3 py-1 text-xs font-medium capitalize text-sky-300">
                      {bill.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Last action: {formatDateTime(bill.lastActionAt)}
                  </div>

                  {bill.ai?.whyItMatters ? (
                    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Why it matters
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {bill.ai.whyItMatters}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Upcoming Hearings"
            description="Committee activity scheduled next."
          >
            <div className="space-y-4">
              {hearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <h3 className="text-base font-semibold text-white">
                    {hearing.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {hearing.committeeName}
                  </p>
                  <p className="mt-3 text-sm text-slate-300">
                    {formatDateTime(hearing.scheduledAt)}
                  </p>
                  {hearing.location ? (
                    <p className="mt-1 text-sm text-slate-400">
                      {hearing.location}
                    </p>
                  ) : null}
                  {hearing.ai?.summary ? (
                    <p className="mt-3 text-sm text-slate-300">
                      {hearing.ai.summary}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard
            title="Recent Contracts"
            description="Public spending and procurement activity."
          >
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {contract.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {contract.agencyName} · {contract.vendorName}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-300">
                      {formatMoney(contract.amount)}
                    </span>
                  </div>
                  {contract.ai?.summary ? (
                    <p className="mt-3 text-sm text-slate-300">
                      {contract.ai.summary}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tracked Issues"
            description="Major topics citizens may want to follow."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <h3 className="text-base font-semibold text-white">
                    {issue.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {issue.description ?? "No description available."}
                  </p>
                  {issue.tags?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {issue.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
