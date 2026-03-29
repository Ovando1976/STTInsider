import "server-only";

import { adminDb } from "@/lib/firebase/openvi-admin";
import { OPENVI_COLLECTIONS } from "@/lib/openvi/collections";
import type {
  Agency,
  Bill,
  BudgetRecord,
  Contract,
  Hearing,
  Issue,
  Official,
  PromiseRecord,
  Vendor,
} from "@/types/openvi";

type FirestoreEntity = { id: string };

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeValue(v)])
    );
  }

  return value;
}

async function getCollection<T extends FirestoreEntity>(
  collectionName: string,
  options?: {
    orderByField?: string;
    direction?: "asc" | "desc";
    limitCount?: number;
  }
): Promise<T[]> {
  let ref = adminDb.collection(collectionName) as FirebaseFirestore.Query;

  if (options?.orderByField) {
    ref = ref.orderBy(options.orderByField, options.direction ?? "desc");
  }

  if (typeof options?.limitCount === "number" && options.limitCount > 0) {
    ref = ref.limit(options.limitCount);
  }

  const snapshot = await ref.get();

  return snapshot.docs.map((doc) => {
    const data = serializeValue(doc.data()) as Omit<T, "id">;

    return {
      id: doc.id,
      ...data,
    } as T;
  });
}

export async function getDashboardData() {
  const [bills, hearings, contracts, issues] = await Promise.all([
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 8,
    }),
    getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
      orderByField: "scheduledAt",
      direction: "asc",
      limitCount: 8,
    }),
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 8,
    }),
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 24,
    }),
  ]);

  return {
    bills,
    hearings,
    contracts,
    issues,
    stats: {
      trackedBills: bills.length,
      upcomingHearings: hearings.length,
      recentContracts: contracts.length,
      activeIssues: issues.filter((issue) => issue.active).length,
    },
  };
}

export async function getBillsPageData() {
  const [bills, agencies, officials, issues] = await Promise.all([
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 100,
    }),
    getCollection<Agency>(OPENVI_COLLECTIONS.agencies, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Official>(OPENVI_COLLECTIONS.officials, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
  ]);

  return { bills, agencies, officials, issues };
}

export async function getHearingsPageData() {
  const [hearings, agencies, bills, issues] = await Promise.all([
    getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
      orderByField: "scheduledAt",
      direction: "asc",
      limitCount: 100,
    }),
    getCollection<Agency>(OPENVI_COLLECTIONS.agencies, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 200,
    }),
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
  ]);

  return { hearings, agencies, bills, issues };
}

export async function getContractsPageData() {
  const [contracts, agencies, vendors, bills, issues] = await Promise.all([
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 100,
    }),
    getCollection<Agency>(OPENVI_COLLECTIONS.agencies, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Vendor>(OPENVI_COLLECTIONS.vendors, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 200,
    }),
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
  ]);

  return { contracts, agencies, vendors, bills, issues };
}

export async function getReferenceData() {
  const [
    agencies,
    officials,
    issues,
    hearings,
    contracts,
    budgets,
    promises,
    vendors,
  ] = await Promise.all([
    getCollection<Agency>(OPENVI_COLLECTIONS.agencies, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Official>(OPENVI_COLLECTIONS.officials, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
      orderByField: "scheduledAt",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 200,
    }),
    getCollection<BudgetRecord>(OPENVI_COLLECTIONS.budgets, {
      orderByField: "fiscalYear",
      direction: "desc",
      limitCount: 200,
    }),
    getCollection<PromiseRecord>(OPENVI_COLLECTIONS.promises, {
      orderByField: "sourceDate",
      direction: "desc",
      limitCount: 200,
    }),
    getCollection<Vendor>(OPENVI_COLLECTIONS.vendors, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
  ]);

  return {
    agencies,
    officials,
    issues,
    hearings,
    contracts,
    budgets,
    promises,
    vendors,
  };
}

export async function getIssuesPageData() {
  const [issues, bills, hearings, contracts] = await Promise.all([
    getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 300,
    }),
    getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
      orderByField: "scheduledAt",
      direction: "asc",
      limitCount: 300,
    }),
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 300,
    }),
  ]);

  return { issues, bills, hearings, contracts };
}

export async function getAgenciesPageData() {
  const [agencies, bills, hearings, contracts, officials] = await Promise.all([
    getCollection<Agency>(OPENVI_COLLECTIONS.agencies, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 300,
    }),
    getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
      orderByField: "scheduledAt",
      direction: "asc",
      limitCount: 300,
    }),
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 300,
    }),
    getCollection<Official>(OPENVI_COLLECTIONS.officials, {
      orderByField: "name",
      direction: "asc",
      limitCount: 300,
    }),
  ]);

  return { agencies, bills, hearings, contracts, officials };
}

export async function getVendorsPageData() {
  const [vendors, contracts] = await Promise.all([
    getCollection<Vendor>(OPENVI_COLLECTIONS.vendors, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
      orderByField: "awardDate",
      direction: "desc",
      limitCount: 400,
    }),
  ]);

  return { vendors, contracts };
}

export async function getOfficialsPageData() {
  const [officials, bills, promises] = await Promise.all([
    getCollection<Official>(OPENVI_COLLECTIONS.officials, {
      orderByField: "name",
      direction: "asc",
      limitCount: 200,
    }),
    getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
      orderByField: "lastActionAt",
      direction: "desc",
      limitCount: 300,
    }),
    getCollection<PromiseRecord>(OPENVI_COLLECTIONS.promises, {
      orderByField: "sourceDate",
      direction: "desc",
      limitCount: 300,
    }),
  ]);

  return { officials, bills, promises };
}

/**
 * Compatibility aliases for older imports.
 */
export const getOpenVIReferenceData = getReferenceData;

export async function getOpenVIBills() {
  return getCollection<Bill>(OPENVI_COLLECTIONS.bills, {
    orderByField: "lastActionAt",
    direction: "desc",
    limitCount: 200,
  });
}

export async function getOpenVIHearings() {
  return getCollection<Hearing>(OPENVI_COLLECTIONS.hearings, {
    orderByField: "scheduledAt",
    direction: "asc",
    limitCount: 200,
  });
}

export async function getOpenVIContracts() {
  return getCollection<Contract>(OPENVI_COLLECTIONS.contracts, {
    orderByField: "awardDate",
    direction: "desc",
    limitCount: 200,
  });
}

export async function getOpenVIIssues() {
  return getCollection<Issue>(OPENVI_COLLECTIONS.issues, {
    orderByField: "name",
    direction: "asc",
    limitCount: 200,
  });
}
