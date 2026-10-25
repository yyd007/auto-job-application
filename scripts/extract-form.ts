import { readFileSync } from "node:fs";
import { loadProfile } from "../src/data/load-profile";
import { buildBatch } from "../src/lib/batch";
import { parseUrlList } from "../src/lib/url-list";
import { buildPlan } from "../src/lib/plan";

function urlsFromArgs(): string[] {
  const args = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);
  if (args.length > 0) return args;
  if (process.stdin.isTTY) return [];
  return parseUrlList(readFileSync(0, "utf8"));
}

const urls = urlsFromArgs();

if (urls.length === 0) {
  console.error("Usage: npm run extract -- <job url> [more urls]");
  console.error("Or pipe one URL per line.");
  process.exit(1);
}

const profile = loadProfile().profile;

if (urls.length === 1) {
  buildPlan(urls[0], profile)
    .then((plan) => {
      console.log(JSON.stringify(plan, null, 2));
      if (plan.submitted || plan.mutated) process.exit(1);
      if (!plan.applicationReached || plan.missing.length > 0 || plan.needsUser.length > 0) {
        process.exit(2);
      }
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Could not build a plan.");
      process.exit(1);
    });
} else {
  buildBatch(urls, profile)
    .then((batch) => {
      console.log(JSON.stringify(batch, null, 2));
      if (batch.submitted) process.exit(1);
      const incomplete = batch.items.some(
        (item) =>
          item.error ||
          !item.plan ||
          !item.plan.applicationReached ||
          item.plan.missing.length > 0 ||
          item.plan.needsUser.length > 0,
      );
      if (incomplete) process.exit(2);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Could not build a plan.");
      process.exit(1);
    });
}
