import assert from "node:assert/strict";
import test from "node:test";
import template from "../data/profile.template.json";
import { asProfile } from "../data/profile-types";
import { fixtureProfile } from "./fixture-profile";
import { proposeAnswers } from "./propose";
import type { ExtractedQuestion } from "./types";

function question(partial: Partial<ExtractedQuestion> & Pick<ExtractedQuestion, "label">): ExtractedQuestion {
  return {
    id: partial.id ?? partial.label,
    label: partial.label,
    section: partial.section ?? "",
    required: partial.required ?? true,
    kind: partial.kind ?? "text",
    options: partial.options ?? [],
    currentValue: partial.currentValue ?? "",
    verified: partial.verified ?? false,
  };
}

test("the committed template is only placeholders", () => {
  const profile = asProfile(template);
  assert.equal(profile.name.full, "Your name");
  assert.equal(profile.phone, "Your phone");
  assert.equal(profile.email, "you@example.com");
  assert.equal(profile.location.city, "Your city");
  assert.equal(profile.location.postalCode, "Your postal code");
  assert.equal(profile.atLeast18, "");
  assert.equal(profile.workAuthorization, "");
  assert.equal(profile.needsVisaSponsorship, "");
  assert.equal(profile.answerLanguage, "");
  assert.equal(profile.browserLocale, "");
  assert.equal(profile.skills, "Your full skills section.");
  assert.doesNotMatch(JSON.stringify(profile), /password|验证码|短信码/i);
});

test("blank work-authorization answers stay missing", () => {
  const answers = proposeAnswers(
    [
      question({ label: "Are you authorized to work?", kind: "radio", options: ["Yes", "No"] }),
      question({ label: "Are you at least 18?", kind: "radio", options: ["Yes", "No"] }),
    ],
    asProfile(template),
  );
  assert.equal(answers[0]?.status, "missing");
  assert.equal(answers[0]?.value, "");
  assert.equal(answers[1]?.status, "missing");
});

test("maps fields from the profile and does not guess", () => {
  const answers = proposeAnswers(
    [
      question({ label: "姓氏" }),
      question({ label: "名字" }),
      question({ label: "电话号码", kind: "tel" }),
      question({ label: "电子邮件", kind: "email" }),
      question({ label: "首选电子邮件地址", kind: "email", currentValue: "kept@example.com", verified: true, required: false }),
      question({ label: "国家/地区", kind: "select", options: ["请选择", "Your country", "Other country"] }),
      question({ label: "省/直辖市/自治区" }),
      question({ label: "城市" }),
      question({ label: "邮政编码" }),
      question({ label: "区（可选）", required: false }),
      question({ label: "性别", kind: "select", options: ["请选择", "Your gender", "Another answer"] }),
      question({ label: "你是否年满 18 岁？", kind: "radio", options: ["是", "否"] }),
      question({ label: "Have you worked at your employer?", kind: "radio", options: ["Yes", "No"] }),
      question({ label: "你是否拥有在你所申请国家/地区合法工作的许可？", kind: "radio", options: ["是", "否"] }),
      question({ label: "你目前或将来是否需要公司为你提供工作签证担保？", kind: "radio", options: ["是", "否"] }),
      question({ label: "技能", kind: "textarea" }),
      question({ label: "工作描述（Your employer）", kind: "textarea" }),
      question({ label: "Your language proficiency", kind: "select", options: ["请选择", "Basic", "Fluent"] }),
      question({ label: "期望薪资（必填）" }),
      question({ label: "密码", kind: "password" }),
      question({ label: "Country", kind: "select", options: ["Select", "Canada", "Mexico"] }),
    ],
    fixtureProfile,
  );

  const byLabel = new Map(answers.map((answer) => [answer.label, answer]));
  assert.equal(byLabel.get("姓氏")?.value, "Your family name");
  assert.equal(byLabel.get("名字")?.value, "Your given name");
  assert.equal(byLabel.get("电话号码")?.value, "Your phone");
  assert.equal(byLabel.get("电子邮件")?.value, "you@example.com");
  assert.equal(byLabel.get("首选电子邮件地址")?.status, "leave-verified");
  assert.equal(byLabel.get("国家/地区")?.value, "Your country");
  assert.equal(byLabel.get("省/直辖市/自治区")?.value, "Your region");
  assert.equal(byLabel.get("城市")?.value, "Your city");
  assert.equal(byLabel.get("邮政编码")?.value, "Your postal code");
  assert.equal(byLabel.get("区（可选）")?.status, "unmapped");
  assert.equal(byLabel.get("性别")?.value, "Your gender");
  assert.equal(byLabel.get("你是否年满 18 岁？")?.value, "是");
  assert.equal(byLabel.get("Have you worked at your employer?")?.value, "No");
  assert.equal(byLabel.get("你是否拥有在你所申请国家/地区合法工作的许可？")?.value, "是");
  assert.equal(byLabel.get("你目前或将来是否需要公司为你提供工作签证担保？")?.value, "否");
  assert.equal(byLabel.get("技能")?.value, fixtureProfile.skills);
  assert.equal(byLabel.get("工作描述（Your employer）")?.value, "Your full job description for this role.");
  assert.equal(byLabel.get("Your language proficiency")?.value, "Fluent");
  assert.equal(byLabel.get("期望薪资（必填）")?.status, "missing");
  assert.equal(byLabel.get("期望薪资（必填）")?.value, "");
  assert.equal(byLabel.get("密码")?.status, "needs-user");
  assert.equal(byLabel.get("密码")?.value, "");
  assert.equal(byLabel.get("Country")?.status, "missing");
});

test("highest-on-form uses only options that control lists", () => {
  const withNative = proposeAnswers(
    [question({ label: "Your language level", kind: "select", options: ["Basic", "Fluent", "Native"] })],
    fixtureProfile,
  );
  assert.equal(withNative[0]?.value, "Native");

  const fluentOnly = proposeAnswers(
    [question({ label: "Your language level", kind: "select", options: ["Basic", "Fluent"] })],
    fixtureProfile,
  );
  assert.equal(fluentOnly[0]?.value, "Fluent");

  const unknown = proposeAnswers(
    [question({ label: "Your language level", kind: "select", options: ["Morning", "Evening"] })],
    fixtureProfile,
  );
  assert.equal(unknown[0]?.status, "missing");

  const freeText = proposeAnswers([question({ label: "Your language level", kind: "text" })], fixtureProfile);
  assert.equal(freeText[0]?.status, "needs-user");
  assert.equal(freeText[0]?.value, "");
});

test("does not guess which role or school a bare field belongs to", () => {
  const answers = proposeAnswers(
    [
      question({ label: "Job description", kind: "textarea" }),
      question({ label: "Company" }),
      question({ label: "School" }),
    ],
    fixtureProfile,
  );
  assert.equal(answers[0]?.status, "missing");
  assert.match(answers[0]?.source ?? "", /full text/);
  assert.equal(answers[1]?.status, "missing");
  assert.equal(answers[2]?.status, "missing");
});

test("maps a description when the section names the role", () => {
  const answers = proposeAnswers(
    [question({ label: "Responsibilities", section: "Your employer", kind: "textarea" })],
    fixtureProfile,
  );
  assert.equal(answers[0]?.value, "Your full job description for this role.");
});

test("a longer alias wins over a shorter overlapping one", () => {
  const profile = asProfile({
    ...template,
    education: [
      {
        school: "Your school",
        aliases: ["your school"],
        dates: "Your dates",
        degreeLine: "Your degree",
      },
    ],
    experience: [
      {
        company: "Your school center",
        aliases: ["your school center"],
        title: "Your title",
        location: "Your city",
        start: "Start date",
        end: "End date",
        description: "Center description.",
      },
    ],
  });
  const school = proposeAnswers([question({ label: "School", section: "Your school center" })], profile);
  assert.equal(school[0]?.status, "missing");
  const degree = proposeAnswers([question({ label: "School", section: "Your school" })], profile);
  assert.equal(degree[0]?.value, "Your school");
  const description = proposeAnswers(
    [question({ label: "Responsibilities", section: "Your school center", kind: "textarea" })],
    profile,
  );
  assert.equal(description[0]?.value, "Center description.");
});
