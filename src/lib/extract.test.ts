import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { buildBatch } from "./batch";
import { fixtureProfile } from "./fixture-profile";
import { buildPlan } from "./plan";

const root = path.join(process.cwd(), "public");
let server: Server;
let origin = "";

before(async () => {
  server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
    if (!file.startsWith(root)) {
      response.writeHead(403);
      response.end("no");
      return;
    }
    try {
      const body = await readFile(file);
      const type = file.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
      response.writeHead(200, { "content-type": type });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("missing");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  origin = `http://127.0.0.1:${port}`;
});

after(() => {
  server.close();
});

describe("playwright runner", { concurrency: 1 }, () => {
  test("follows an apply control, proposes answers, and does not submit", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/posting.html`, fixtureProfile);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.equal(plan.applicationReached, true);
    assert.equal(plan.stoppedBecause, "form");
    assert.match(plan.finalUrl, /form\.html$/);
    assert.doesNotMatch(plan.finalUrl, /thanks\.html/);
    assert.ok(plan.hops.some((hop) => hop.action.includes("Apply now")));

    const family = plan.answers.find((answer) => answer.label === "Last name");
    const skills = plan.answers.find((answer) => answer.label === "Skills");
    const role = plan.answers.find((answer) => answer.label.includes("Your employer"));
    const language = plan.answers.find((answer) => answer.label === "Your language proficiency");
    const pay = plan.answers.find((answer) => answer.label === "Expected pay");
    const district = plan.answers.find((answer) => answer.label.startsWith("District"));
    const verified = plan.answers.find((answer) => answer.label.includes("Preferred email"));

    assert.equal(family?.value, "Your family name");
    assert.equal(skills?.value, "Your full skills section.");
    assert.equal(role?.value, "Your full job description for this role.");
    assert.equal(language?.value, "Fluent");
    assert.equal(pay?.status, "missing");
    assert.ok(plan.missing.some((answer) => answer.label === "Expected pay"));
    assert.equal(district?.status, "unmapped");
    assert.equal(verified?.status, "leave-verified");
  });

  test("follows a non-english apply control and still does not submit", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/employer-posting.html`, fixtureProfile);
    assert.equal(plan.submitted, false);
    assert.match(plan.finalUrl, /form\.html$/);
    assert.ok(plan.hops.some((hop) => hop.action.includes("立即申请")));
    assert.equal(plan.answers.find((answer) => answer.label === "First name")?.value, "Your given name");
  });

  test("stops when apply lands on a profile wizard", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/wizard-posting.html`, fixtureProfile);
    assert.equal(plan.stoppedBecause, "wizard-diversion");
    assert.equal(plan.applicationReached, false);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.equal(plan.answers.length, 0);
    assert.doesNotMatch(plan.finalUrl, /thanks\.html/);
    assert.match(plan.finalUrl, /user-info/);
    assert.ok(plan.seenLabels.some((label) => label.includes("Display name")));
    assert.match(plan.warnings.join(" "), /profile wizard/i);
  });

  test("stops on a login wall without typing", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/login.html`, fixtureProfile);
    assert.equal(plan.stoppedBecause, "auth-wall");
    assert.equal(plan.applicationReached, false);
    assert.equal(plan.submitted, false);
    assert.equal(plan.mutated, false);
    assert.ok(plan.needsUser.some((answer) => answer.kind === "password"));
    assert.equal(plan.needsUser.every((answer) => answer.value === ""), true);
  });

  test("a batch continues after a profile wizard", { timeout: 60_000 }, async () => {
    const batch = await buildBatch(
      [`${origin}/fixtures/wizard-posting.html`, `${origin}/fixtures/posting.html`],
      fixtureProfile,
    );
    assert.equal(batch.items.length, 2);
    assert.equal(batch.profileWizards, 1);
    assert.equal(batch.reachedForm, 1);
    assert.equal(batch.submitted, false);
    assert.equal(batch.items[0]?.plan?.stoppedBecause, "wizard-diversion");
    assert.equal(batch.items[1]?.plan?.applicationReached, true);
    assert.ok(batch.gaps.some((gap) => gap.label === "Expected pay" && gap.count === 1));
  });

  test("reads a form that is already open and ignores submit", { timeout: 60_000 }, async () => {
    const plan = await buildPlan(`${origin}/fixtures/form.html`, fixtureProfile);
    assert.equal(plan.hops.length, 1);
    assert.match(plan.finalUrl, /form\.html$/);
    assert.equal(plan.submitted, false);
    assert.equal(plan.answers.find((answer) => answer.label === "Gender")?.value, "Your gender");
  });
});
