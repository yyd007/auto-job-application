import assert from "node:assert/strict";
import test from "node:test";
import { profile } from "../data/profile";
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

test("profile stores resume facts and no credentials", () => {
  assert.equal(profile.name.full, "戴杨阳");
  assert.equal(profile.name.family, "戴");
  assert.equal(profile.name.given, "杨阳");
  assert.equal(profile.phone, "18068166342");
  assert.equal(profile.email, "yangyangd95@163.com");
  assert.equal(profile.location.postalCode, "201102");
  assert.equal(profile.gender, "女");
  assert.doesNotMatch(JSON.stringify(profile), /password|验证码|短信码|apple id/i);
  assert.match(profile.skills.fullText, /数据与工程/);
  assert.match(profile.skills.fullText, /AI \/ ML/);
  assert.match(profile.skills.fullText, /PMP认证/);
});

test("maps the Apple application questions without guessing", () => {
  const answers = proposeAnswers([
    question({ label: "姓氏" }),
    question({ label: "名字" }),
    question({ label: "电话号码", kind: "tel" }),
    question({ label: "电子邮件", kind: "email" }),
    question({ label: "首选电子邮件地址", kind: "email", currentValue: "kept@example.com", verified: true, required: false }),
    question({ label: "国家/地区", kind: "select", options: ["请选择", "中国", "美国"] }),
    question({ label: "省/直辖市/自治区" }),
    question({ label: "城市" }),
    question({ label: "邮政编码" }),
    question({ label: "区（可选）", required: false }),
    question({ label: "性别", kind: "select", options: ["请选择", "女", "男"] }),
    question({ label: "你是否年满 18 岁？", kind: "radio", options: ["是", "否"] }),
    question({ label: "你是否曾受雇于 Apple？", kind: "radio", options: ["是", "否"] }),
    question({ label: "你是否曾以临时派遣人员、顾问或独立合同员工身份为 Apple 工作过？", kind: "radio", options: ["是", "否"] }),
    question({ label: "你是否拥有在你所申请国家/地区合法工作的许可？", kind: "radio", options: ["是", "否"] }),
    question({ label: "你目前或将来是否需要公司为你提供工作签证担保？", kind: "radio", options: ["是", "否"] }),
    question({ label: "技能", kind: "textarea" }),
    question({ label: "工作描述（eBest）", kind: "textarea" }),
    question({ label: "工作描述（QIMA）", kind: "textarea" }),
    question({ label: "英语熟练程度", kind: "select", options: ["请选择", "流利", "熟练", "一般"] }),
    question({ label: "期望薪资（必填）" }),
    question({ label: "密码", kind: "password" }),
  ]);

  const byLabel = new Map(answers.map((answer) => [answer.label, answer]));
  assert.equal(byLabel.get("姓氏")?.value, "戴");
  assert.equal(byLabel.get("名字")?.value, "杨阳");
  assert.equal(byLabel.get("电话号码")?.value, "18068166342");
  assert.equal(byLabel.get("电子邮件")?.value, "yangyangd95@163.com");
  assert.equal(byLabel.get("首选电子邮件地址")?.status, "leave-verified");
  assert.equal(byLabel.get("国家/地区")?.value, "中国");
  assert.equal(byLabel.get("省/直辖市/自治区")?.value, "上海");
  assert.equal(byLabel.get("城市")?.value, "上海");
  assert.equal(byLabel.get("邮政编码")?.value, "201102");
  assert.equal(byLabel.get("区（可选）")?.status, "unmapped");
  assert.equal(byLabel.get("性别")?.value, "女");
  assert.equal(byLabel.get("你是否年满 18 岁？")?.value, "是");
  assert.equal(byLabel.get("你是否曾受雇于 Apple？")?.value, "否");
  assert.equal(byLabel.get("你是否曾以临时派遣人员、顾问或独立合同员工身份为 Apple 工作过？")?.value, "否");
  assert.equal(byLabel.get("你是否拥有在你所申请国家/地区合法工作的许可？")?.value, "是");
  assert.equal(byLabel.get("你目前或将来是否需要公司为你提供工作签证担保？")?.value, "否");
  assert.equal(byLabel.get("技能")?.value, profile.skills.fullText);
  assert.match(byLabel.get("工作描述（eBest）")?.value ?? "", /门店拜访转化率/);
  assert.match(byLabel.get("工作描述（eBest）")?.value ?? "", /高流失风险门店/);
  assert.ok((byLabel.get("工作描述（eBest）")?.value.length ?? 0) > 400);
  assert.match(byLabel.get("工作描述（QIMA）")?.value ?? "", /缩短 87%/);
  assert.match(byLabel.get("工作描述（QIMA）")?.value ?? "", /8 小时压缩至 1 小时/);
  assert.equal(byLabel.get("英语熟练程度")?.value, "流利");
  assert.equal(byLabel.get("期望薪资（必填）")?.status, "missing");
  assert.equal(byLabel.get("期望薪资（必填）")?.value, "");
  assert.equal(byLabel.get("密码")?.status, "needs-user");
  assert.equal(byLabel.get("密码")?.value, "");
});

test("english uses the highest level actually on the form", () => {
  const withMastery = proposeAnswers([
    question({ label: "英语水平", kind: "select", options: ["一般", "流利", "精通"] }),
  ]);
  assert.equal(withMastery[0]?.value, "精通");

  const appleLevels = proposeAnswers([
    question({ label: "英语水平", kind: "select", options: ["一般", "流利"] }),
  ]);
  assert.equal(appleLevels[0]?.value, "流利");

  const noFluent = proposeAnswers([
    question({ label: "英语水平", kind: "select", options: ["一般", "熟练"] }),
  ]);
  assert.equal(noFluent[0]?.value, "熟练");
});

test("does not guess which role or school a bare field belongs to", () => {
  const answers = proposeAnswers([
    question({ label: "工作描述", kind: "textarea" }),
    question({ label: "公司" }),
    question({ label: "学校" }),
  ]);
  assert.equal(answers[0]?.status, "missing");
  assert.match(answers[0]?.source ?? "", /全文/);
  assert.equal(answers[1]?.status, "missing");
  assert.equal(answers[2]?.status, "missing");
});

test("maps a description when the section names the employer", () => {
  const answers = proposeAnswers([
    question({ label: "职责", section: "好未来", kind: "textarea" }),
  ]);
  assert.match(answers[0]?.value ?? "", /缩短 60%/);
  assert.match(answers[0]?.value ?? "", /50\+ 教学点/);
});
