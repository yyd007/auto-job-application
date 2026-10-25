import assert from "node:assert/strict";
import test from "node:test";
import { hintForUrl } from "./url-hint";

test("a job link is opened without a site-specific path", () => {
  const hint = hintForUrl("https://example.com/jobs/123");
  assert.equal(hint.ok, true);
  assert.match(hint.detail, /apply/i);
  assert.match(hint.detail, /does not submit/i);
});

test("a profile path is not treated as the application", () => {
  const hint = hintForUrl("https://example.com/user-info");
  assert.equal(hint.ok, true);
  assert.match(hint.headline, /profile wizard/i);
  assert.match(hint.detail, /not be treated as the job application/i);
});

test("rejects non-http urls", () => {
  const hint = hintForUrl("javascript:alert(1)");
  assert.equal(hint.ok, false);
});
