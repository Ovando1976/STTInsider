export type IslandScope = "st_thomas" | "st_john" | "st_croix" | "territory";

export type GovernmentBranch =
  | "executive"
  | "legislative"
  | "judicial"
  | "independent";

export type BillStatus =
  | "introduced"
  | "in_committee"
  | "scheduled_for_hearing"
  | "amended"
  | "passed_legislature"
  | "vetoed"
  | "signed"
  | "failed"
  | "archived";

export type ContractStatus = "active" | "expired" | "pending" | "cancelled";

export type BudgetStage =
  | "proposed"
  | "committee"
  | "approved"
  | "amended"
  | "final";

export type PromiseStatus =
  | "announced"
  | "funded"
  | "in_progress"
  | "delayed"
  | "completed"
  | "unclear";

export type VoteChoice = "yes" | "no" | "present" | "abstain" | "absent";

export type AlertTargetType = "bill" | "agency" | "official" | "vendor" | "issue";

export type DocumentType =
  | "bill_pdf"
  | "hearing_notice"
  | "agenda"
  | "minutes"
  | "contract_pdf"
  | "budget_pdf"
  | "press_release";

export interface EntityLink {
  label: string;
  url: string;
}

export interface Agency {
  id: string;
  name: string;
  shortName?: string;
  branch: GovernmentBranch;
  description?: string;
  islandScope?: IslandScope[];
  website?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Official {
  id: string;
  name: string;
  role: string;
  branch: GovernmentBranch;
  district?: string;
  party?: string | null;
  agencyId?: string | null;
  bio?: string;
  photoUrl?: string;
  links?: EntityLink[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BillAI {
  whyItMatters?: string;
  affectedGroups?: string[];
  keyDeadlines?: string[];
  keyNumbers?: string[];
}

export interface Bill {
  id: string;
  billNumber: string;
  title: string;
  summaryShort?: string;
  summaryLong?: string;
  status: BillStatus;
  session?: string;
  sponsors?: string[];
  committeeIds?: string[];
  agencyIds?: string[];
  issueIds?: string[];
  tags?: string[];
  introducedAt?: string;
  lastActionAt?: string;
  sourceUrl?: string;
  sourceDocUrls?: string[];
  ai?: BillAI;
  createdAt: string;
  updatedAt: string;
}

export interface HearingAI {
  summary?: string;
  keyTopics?: string[];
  decisions?: string[];
  nextSteps?: string[];
}

export interface Hearing {
  id: string;
  title: string;
  committeeName: string;
  committeeId?: string;
  scheduledAt: string;
  location?: string;
  agenda?: string;
  relatedBillIds?: string[];
  relatedAgencyIds?: string[];
  relatedIssueIds?: string[];
  transcriptUrl?: string;
  minutesUrl?: string;
  sourceUrl?: string;
  ai?: HearingAI;
  createdAt: string;
  updatedAt: string;
}

export interface ContractAI {
  summary?: string;
  flags?: string[];
}

export interface Contract {
  id: string;
  contractNumber?: string;
  title: string;
  vendorId?: string;
  vendorName: string;
  agencyId?: string;
  agencyName: string;
  amount?: number;
  currency?: "USD";
  category?: string;
  procurementMethod?: string;
  awardDate?: string;
  startDate?: string;
  endDate?: string;
  status?: ContractStatus;
  relatedIssueIds?: string[];
  relatedBillIds?: string[];
  sourceUrl?: string;
  documentUrls?: string[];
  ai?: ContractAI;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  normalizedName: string;
  industry?: string;
  website?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRecord {
  id: string;
  fiscalYear: string;
  agencyId: string;
  agencyName: string;
  category?: string;
  amount: number;
  stage: BudgetStage;
  relatedBillIds?: string[];
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  slug: string;
  name: string;
  description?: string;
  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromiseRecord {
  id: string;
  officialId?: string;
  officialName: string;
  title: string;
  description: string;
  category?: string;
  sourceUrl?: string;
  sourceDate?: string;
  status: PromiseStatus;
  relatedAgencyIds?: string[];
  relatedIssueIds?: string[];
  evidenceUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  billId: string;
  officialId: string;
  vote: VoteChoice;
  votedAt: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceDocument {
  id: string;
  type: DocumentType;
  title: string;
  sourceUrl: string;
  textContent?: string;
  relatedEntityType?: "bill" | "hearing" | "contract" | "budget" | "agency" | "official";
  relatedEntityId?: string;
  indexed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAlert {
  id: string;
  userId: string;
  type: AlertTargetType;
  targetId: string;
  targetLabel: string;
  delivery: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IngestJob {
  id: string;
  source: string;
  jobType: "fetch" | "normalize" | "ai_enrich";
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface OpenVISeedData {
  agencies: Agency[];
  officials: Official[];
  issues: Issue[];
  bills: Bill[];
  hearings: Hearing[];
  contracts: Contract[];
  budgets: BudgetRecord[];
  promises: PromiseRecord[];
  vendors: Vendor[];
}