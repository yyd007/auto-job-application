import { matchRole, matchSchool, profile } from "../data/profile";
import type { ExtractedQuestion, ProposedAnswer } from "./types";

const PLACEHOLDER = /^(请选择|请选|选择|select|choose|--|—|-|n\/a)$/i;

const LEVELS = [
  "精通",
  "母语",
  "native",
  "bilingual",
  "流利",
  "fluent",
  "熟练",
  "advanced",
  "professional",
  "良好",
  "intermediate",
  "一般",
  "basic",
  "elementary",
  "beginner",
];

function norm(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function meaningfulOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter((option) => option && !PLACEHOLDER.test(option));
}

function pickOption(options: string[], aliases: string[]): string | null {
  const choices = meaningfulOptions(options);
  if (!choices.length) return null;
  for (const alias of aliases) {
    const needle = alias.toLowerCase();
    const exact = choices.find((choice) => choice.toLowerCase() === needle);
    if (exact) return exact;
  }
  for (const alias of aliases) {
    const needle = alias.toLowerCase();
    const partial = choices.find((choice) => choice.toLowerCase().includes(needle));
    if (partial) return partial;
  }
  return null;
}

function base(question: ExtractedQuestion, status: ProposedAnswer["status"], value: string, source: string): ProposedAnswer {
  return {
    id: question.id,
    label: question.label,
    section: question.section,
    required: question.required,
    kind: question.kind,
    options: question.options,
    status,
    value,
    source,
  };
}

function proposed(question: ExtractedQuestion, value: string, source: string): ProposedAnswer {
  return base(question, "proposed", value, source);
}

function missing(question: ExtractedQuestion, source: string): ProposedAnswer {
  return base(question, "missing", "", source);
}

function unmapped(question: ExtractedQuestion, source: string): ProposedAnswer {
  return base(question, "unmapped", "", source);
}

function needsUser(question: ExtractedQuestion, source: string): ProposedAnswer {
  return base(question, "needs-user", "", source);
}

function unresolved(question: ExtractedQuestion, source: string): ProposedAnswer {
  return question.required ? missing(question, source) : unmapped(question, source);
}

function fromFact(question: ExtractedQuestion, value: string, aliases: string[], source: string): ProposedAnswer {
  if (meaningfulOptions(question.options).length) {
    const picked = pickOption(question.options, [value, ...aliases]);
    if (!picked) return missing(question, "选项里没有可确认的答案，不猜。");
    return proposed(question, picked, source);
  }
  return proposed(question, value, source);
}

function yesNo(question: ExtractedQuestion, value: "是" | "否", source: string): ProposedAnswer {
  const aliases = value === "是" ? ["是", "yes", "true", "有"] : ["否", "no", "false", "无", "不需要"];
  return fromFact(question, value, aliases, source);
}

function isEmail(label: string): boolean {
  return /邮箱|电子邮件|e-mail|email/i.test(label) && !/验证码/.test(label);
}

function languageLevel(question: ExtractedQuestion): ProposedAnswer {
  const source = "规则：英语用表单最高档。Apple 那次没有「精通」，选了「流利」。";
  const choices = meaningfulOptions(question.options);
  if (!choices.length) {
    return proposed(question, "英语，选表单最高档（没有「精通」时选「流利」）", source);
  }
  let best: { option: string; rank: number } | null = null;
  for (const option of choices) {
    const rank = LEVELS.findIndex((level) => option.toLowerCase().includes(level.toLowerCase()));
    if (rank < 0) continue;
    if (!best || rank < best.rank) best = { option, rank };
  }
  if (!best) return missing(question, "看不出哪一项是熟练程度，不猜。");
  return proposed(question, best.option, source);
}

function proposeOne(question: ExtractedQuestion): ProposedAnswer {
  const label = norm(question.label);
  const blob = norm(`${question.section} ${question.label}`);
  const compact = label.replace(/\s/g, "");

  if (question.kind === "password" || /密码|password|验证码|短信|一次性|security code|one-time/i.test(label)) {
    return needsUser(question, "不会填写密码、短信验证码或登录凭据。");
  }

  if (question.kind === "checkbox" && /同意|隐私|条款|privacy|terms|acknowledge|承诺/i.test(label)) {
    return needsUser(question, "条款需要你自己确认。工具不代勾。");
  }

  if (question.kind === "file" || /上传简历|简历附件|resume file|attach/i.test(label)) {
    return needsUser(question, "请自己上传简历原件。这里只有拆好的文字资料。");
  }

  if (isEmail(label)) {
    if (question.verified || question.currentValue.trim()) {
      return base(question, "leave-verified", "保持页面上的邮箱，不修改。", "规则：已经验证过的邮箱保持不动。");
    }
    return proposed(question, profile.email, "简历。若这个站点已经验证过别的邮箱，不要改。");
  }

  if (/电话|手机|mobile|phone/i.test(label) && !/验证码/.test(label)) {
    return fromFact(question, profile.phone, [profile.phone], "已确认资料。投递用这个手机号。");
  }

  if (/邮编|邮政编码|postal|zip/i.test(label)) {
    return fromFact(question, profile.location.postalCode, [profile.location.postalCode], "已确认资料。");
  }

  if (/街道|详细地址|address line|住址|^区|区（|区\(|district/i.test(compact) && !/行政区划/.test(compact)) {
    return unresolved(question, "简历和已确认资料里没有区、街道或详细地址。");
  }

  if (/年满\s*18|18\s*岁|at least 18|18 or older|over 18/i.test(label)) {
    return yesNo(question, profile.atLeast18, "已确认资料。");
  }

  if (/派遣|合同员工|contractor|contingent|独立合同/i.test(label)) {
    return yesNo(question, profile.everAppleContractor, "已确认资料。没有以派遣、顾问或合同工身份为 Apple 工作过。");
  }

  if (/受雇于|employed by apple|apple employee|曾在 apple 任职/i.test(label)) {
    return yesNo(question, profile.everEmployedByApple, "已确认资料。没有受雇于 Apple。");
  }

  if (/合法工作|工作许可|authorized to work|legally authorized|eligible to work|work authorization/i.test(label)) {
    return yesNo(question, profile.workAuthorization, "已确认资料。有合法工作许可。");
  }

  if (/签证|sponsorship|visa/i.test(label)) {
    return yesNo(question, profile.needsVisaSponsorship, "已确认资料。不需要签证担保。");
  }

  if (/^性别|^gender\b/i.test(label)) {
    return fromFact(question, profile.gender, ["女", "female", "woman"], "已确认资料。");
  }

  if (/英语|english/i.test(label) && /熟练|水平|能力|proficiency|level|流利|程度/i.test(label)) {
    return languageLevel(question);
  }

  if (/熟练程度|语言水平|language proficiency|proficiency/i.test(label)) {
    return languageLevel(question);
  }

  if (/^(语言|language)$/i.test(label) || /掌握的语言|languages spoken/i.test(label)) {
    const picked = pickOption(question.options, ["英语", "english"]);
    if (meaningfulOptions(question.options).length && !picked) {
      return missing(question, "选项里没有「英语」，不猜。");
    }
    return proposed(question, picked ?? "英语", "规则：加上英语，熟练程度用表单最高档。");
  }

  if (/专业技能|技能|skill set|^skills?$/i.test(label) && !/语言/.test(label)) {
    if (meaningfulOptions(question.options).length) {
      return missing(question, "技能要填整段原文。这是选项列表，对不上整段，先问。");
    }
    return proposed(question, profile.skills.fullText, "简历·专业技能。整段原文，不是摘要。");
  }

  if (/个人简介|自我介绍|专业概述|about you|^summary$/i.test(label)) {
    return proposed(question, profile.summary, "简历·个人简介。全文。");
  }

  if (/教育背景|^education$/i.test(label)) {
    return proposed(question, profile.educationText, "简历·教育背景。全文。");
  }

  if (/工作描述|职责|工作内容|job description|responsibilities/i.test(label)) {
    const role = matchRole(blob);
    if (!role) {
      return unresolved(question, "无法判断是哪一段工作。描述必须用该段简历全文，不能写摘要，所以先空着。");
    }
    return proposed(question, role.description, `简历·${role.company}。该段全文，不是摘要。`);
  }

  if (/^(公司|公司名称|雇主|company|employer)$/i.test(label)) {
    const role = matchRole(blob);
    if (!role) return unresolved(question, "有多段工作经历，无法判断这一格填哪一家。");
    return proposed(question, role.company, `简历·${role.company}。`);
  }

  if (/职位名称|职务|job title|^title$|^position$/i.test(label) && !/申请职位|职位链接/.test(label)) {
    const role = matchRole(blob);
    if (!role) return unresolved(question, "有多段工作经历，无法判断这一格的职位。");
    return proposed(question, role.title, `简历·${role.company}。`);
  }

  if (/开始时间|入职|start date|from date/i.test(label)) {
    const role = matchRole(blob);
    if (!role) return unresolved(question, "无法判断是哪一段工作的开始时间。");
    return proposed(question, role.start, `简历·${role.company}。`);
  }

  if (/结束时间|离职|end date|to date/i.test(label)) {
    const role = matchRole(blob);
    if (!role) return unresolved(question, "无法判断是哪一段工作的结束时间。");
    return proposed(question, role.end, `简历·${role.company}。`);
  }

  if (/学校|院校|school|university|college/i.test(label)) {
    const school = matchSchool(blob);
    if (!school) return unresolved(question, "有两段教育经历，无法判断这一格填哪一所学校。");
    return proposed(question, school.school, "简历·教育背景。");
  }

  if (/学位|degree|学历/i.test(label)) {
    const school = matchSchool(blob);
    if (!school) return unresolved(question, "有两段教育经历，无法判断这一格的学位。");
    return proposed(question, school.degreeLine, "简历·教育背景。");
  }

  if (/英文名|english name/i.test(label)) {
    return proposed(question, profile.name.english, "简历。");
  }

  if (/首选姓名|preferred name/i.test(label)) {
    return proposed(question, profile.name.preferred, "简历。法定中文名。");
  }

  if (/本地写法/.test(label) && /名/.test(label) && !/姓/.test(label)) {
    return proposed(question, profile.name.given, "简历。");
  }

  if (/本地写法/.test(label) && /姓/.test(label)) {
    return proposed(question, profile.name.family, "简历。");
  }

  if (/^(姓氏|姓|last name|family name|surname)$/i.test(label)) {
    return proposed(question, profile.name.family, "简历。");
  }

  if (/^(名字|名|first name|given name)$/i.test(label)) {
    return proposed(question, profile.name.given, "简历。");
  }

  if (/姓名|全名|法定姓名|full name|legal name/i.test(label)) {
    return proposed(question, profile.name.full, "简历。");
  }

  if (/^国家|^country\b|国家\/地区|国家或地区/i.test(label)) {
    return fromFact(question, profile.location.country, ["中国", "china", "中国大陆"], "已确认地址在上海，国家/地区填中国。");
  }

  if (/省|直辖市|自治区|province|state/i.test(label) && !/城市/.test(label)) {
    return fromFact(question, profile.location.province, ["上海", "shanghai"], "已确认资料。");
  }

  if (/^城市|^city\b|所在城市/i.test(label)) {
    return fromFact(question, profile.location.city, ["上海", "shanghai"], "已确认资料。");
  }

  return unresolved(question, "简历和已确认资料里没有这一项。");
}

export function proposeAnswers(questions: ExtractedQuestion[]): ProposedAnswer[] {
  return questions.map(proposeOne);
}
