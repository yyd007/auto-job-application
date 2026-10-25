import { loadProfile } from "../src/data/load-profile";
import { buildPlan } from "../src/lib/plan";

const url = process.argv[2];

if (!url) {
  console.error("Usage: npm run extract -- <job url>");
  process.exit(1);
}

buildPlan(url, loadProfile().profile)
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
