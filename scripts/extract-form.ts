import { buildPlan } from "../src/lib/plan";

const url = process.argv[2];

if (!url) {
  console.error("用法: npm run extract -- <职位链接>");
  process.exit(1);
}

buildPlan(url)
  .then((plan) => {
    console.log(JSON.stringify(plan, null, 2));
    if (plan.submitted || plan.mutated) process.exit(1);
    if (!plan.applicationReached || plan.missing.length > 0 || plan.needsUser.length > 0) {
      process.exit(2);
    }
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "生成计划失败。");
    process.exit(1);
  });
