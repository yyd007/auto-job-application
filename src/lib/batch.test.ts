import assert from "node:assert/strict";
import test from "node:test";
import { dedupeGaps } from "./batch";
import { parseUrlList } from "./url-list";
import type { ApplicationPlan } from "./types";

function plan(partial: Pick<ApplicationPlan, "missing" | "needsUser">): ApplicationPlan {
  return {
    url: "https://example.com/jobs/1",
    applicationReached: true,
    stoppedBecause: "form",
    warnings: [],
    hops: [],
    pageTitle: "Sample role",
    finalUrl: "https://example.com/jobs/1",
    answers: [],
    missing: partial.missing,
    needsUser: partial.needsUser,
    seenLabels: [],
    submitted: false,
    mutated: false,
    rules: [],
  };
}

test("parses one url per line and skips blanks", () => {
  const urls = parseUrlList(" https://example.com/a \n\n# note\nhttps://example.com/b\n");
  assert.deepEqual(urls, ["https://example.com/a", "https://example.com/b"]);
});

test("asks once when the same gap repeats", () => {
  const gap = {
    id: "pay",
    label: "Expected pay (required)",
    section: "",
    required: true,
    kind: "text",
    options: [],
    status: "missing" as const,
    value: "",
    source: "This is not in the local profile.",
  };
  const other = { ...gap, id: "pay-2", label: "Expected pay" };
  const login = {
    ...gap,
    id: "password",
    label: "Password",
    kind: "password",
    status: "needs-user" as const,
    source: "Passwords and one-time codes are never entered.",
  };
  const gaps = dedupeGaps([
    plan({ missing: [gap], needsUser: [login] }),
    plan({ missing: [other], needsUser: [login] }),
  ]);
  assert.equal(gaps.length, 2);
  assert.equal(gaps.find((item) => item.status === "missing")?.label, "Expected pay (required)");
  assert.equal(gaps.find((item) => item.status === "missing")?.count, 2);
  assert.equal(gaps.find((item) => item.label === "Password")?.count, 2);
});
