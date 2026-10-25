export type AnswerStatus =
  | "proposed"
  | "leave-verified"
  | "missing"
  | "unmapped"
  | "needs-user";

export type StopReason =
  | "form"
  | "auth-wall"
  | "wizard-diversion"
  | "no-apply-control"
  | "max-hops";

export type ExtractedQuestion = {
  id: string;
  label: string;
  section: string;
  required: boolean;
  kind: string;
  options: string[];
  currentValue: string;
  verified: boolean;
};

export type Hop = {
  url: string;
  action: string;
};

export type Extraction = {
  startUrl: string;
  finalUrl: string;
  pageTitle: string;
  hops: Hop[];
  stoppedBecause: StopReason;
  warnings: string[];
  questions: ExtractedQuestion[];
  submitted: boolean;
  mutated: boolean;
};

export type ProposedAnswer = {
  id: string;
  label: string;
  section: string;
  required: boolean;
  kind: string;
  options: string[];
  status: AnswerStatus;
  value: string;
  source: string;
};

export type ApplicationPlan = {
  url: string;
  applicationReached: boolean;
  stoppedBecause: StopReason;
  warnings: string[];
  hops: Hop[];
  pageTitle: string;
  finalUrl: string;
  answers: ProposedAnswer[];
  missing: ProposedAnswer[];
  needsUser: ProposedAnswer[];
  seenLabels: string[];
  submitted: boolean;
  mutated: boolean;
  rules: string[];
};
