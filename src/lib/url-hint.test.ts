import assert from "node:assert/strict";
import test from "node:test";
import { hintForUrl } from "./url-hint";

test("waiqi links are aggregator pages, not the application", () => {
  const hint = hintForUrl("https://www.waiqi.com/job/271282");
  assert.equal(hint.ok, true);
  assert.match(hint.detail, /立即投递/);
  assert.match(hint.detail, /user-info/);
});

test("apple job links stay on the employer apply flow", () => {
  const hint = hintForUrl("https://jobs.apple.com/zh-cn/details/200688123-3715/measurement-strategist");
  assert.equal(hint.ok, true);
  assert.match(hint.detail, /提交简历/);
  assert.match(hint.detail, /验证/);
});

test("a user-info link is not treated as the application", () => {
  const hint = hintForUrl("https://www.waiqi.com/user-info");
  assert.equal(hint.ok, true);
  assert.match(hint.headline, /向导/);
  assert.match(hint.detail, /user-info/);
});

test("rejects non-http urls", () => {
  const hint = hintForUrl("javascript:alert(1)");
  assert.equal(hint.ok, false);
});
