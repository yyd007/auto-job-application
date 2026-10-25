import type { Profile } from "../data/profile-types";
import type { ApplicationBatch, BatchItem, DedupedGap } from "./batch-types";
import { buildPlan } from "./plan";
import { parseJobUrl } from "./url-hint";
import type { ApplicationPlan, ProposedAnswer, StopReason } from "./types";

export type { ApplicationBatch, BatchItem, DedupedGap };

function gapKey(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .replace(/[（(]\s*(必填|required|optional|可选)\s*[)）]/gi, "")
    .replace(/\*/g, "")
    .trim()
    .toLowerCase();
}

export function dedupeGaps(plans: ApplicationPlan[]): DedupedGap[] {
  const grouped = new Map<string, DedupedGap>();
  for (const plan of plans) {
    const questions = [...plan.missing, ...plan.needsUser];
    const seenInPlan = new Set<string>();
    for (const question of questions) {
      const key = `${question.status}:${gapKey(question.label)}`;
      if (seenInPlan.has(key)) continue;
      seenInPlan.add(key);
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        continue;
      }
      grouped.set(key, {
        label: question.label,
        status: question.status === "needs-user" ? "needs-user" : "missing",
        required: question.required,
        kind: question.kind,
        source: question.source,
        count: 1,
      });
    }
  }
  return [...grouped.values()];
}

function countStop(items: BatchItem[], reason: StopReason): number {
  return items.filter((item) => item.plan?.stoppedBecause === reason).length;
}

export async function buildBatch(rawUrls: string[], profile: Profile): Promise<ApplicationBatch> {
  const items: BatchItem[] = [];
  for (const [index, raw] of rawUrls.entries()) {
    try {
      parseJobUrl(raw);
      const plan = await buildPlan(raw, profile);
      items.push({ index, url: plan.url, plan, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not build a plan.";
      items.push({ index, url: raw.trim(), plan: null, error: message });
    }
  }

  const plans = items.flatMap((item) => (item.plan ? [item.plan] : []));
  return {
    items,
    gaps: dedupeGaps(plans),
    reachedForm: plans.filter((plan) => plan.applicationReached).length,
    loginWalls: countStop(items, "auth-wall"),
    profileWizards: countStop(items, "wizard-diversion"),
    submitted: plans.some((plan) => plan.submitted || plan.mutated),
  };
}

export function questionsForAria(gaps: DedupedGap[]): DedupedGap[] {
  return gaps.filter((gap) => gap.status === "missing" || gap.status === "needs-user");
}

export function readyAnswers(plan: ApplicationPlan): ProposedAnswer[] {
  return plan.answers.filter((answer) => answer.status === "proposed" || answer.status === "leave-verified");
}
