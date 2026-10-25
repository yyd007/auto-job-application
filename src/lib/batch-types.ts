import type { ApplicationPlan } from "./types";

export type BatchItem = {
  index: number;
  url: string;
  plan: ApplicationPlan | null;
  error: string | null;
};

export type DedupedGap = {
  label: string;
  status: "missing" | "needs-user";
  required: boolean;
  kind: string;
  source: string;
  count: number;
};

export type ApplicationBatch = {
  items: BatchItem[];
  gaps: DedupedGap[];
  reachedForm: number;
  loginWalls: number;
  profileWizards: number;
  submitted: boolean;
};
