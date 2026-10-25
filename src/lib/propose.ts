import type { LanguageFact, Profile, Role, School } from "../data/profile-types";
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

const YES_WORDS = ["yes", "true", "是", "有"];
const NO_WORDS = ["no", "false", "否", "无", "不需要"];

function norm(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\*/g, "").trim();
}

function meaningfulOptions(options: string[]): string[] {
  return options.map((option) => option.trim()).filter((option) => option && !PLACEHOLDER.test(option));
}

function pickOption(options: string[], aliases: string[]): string | null {
  const choices = meaningfulOptions(options);
  if (!choices.length) return null;
  const needles = aliases.map((alias) => alias.trim()).filter(Boolean);
  for (const alias of needles) {
    const exact = choices.find((choice) => choice.toLowerCase() === alias.toLowerCase());
    if (exact) return exact;
  }
  for (const alias of needles) {
    if (alias.length < 3) continue;
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
  if (!value.trim()) return unresolved(question, "This is blank in the local profile.");
  if (meaningfulOptions(question.options).length) {
    const picked = pickOption(question.options, [value, ...aliases]);
    if (!picked) return missing(question, "None of the options match the local profile. Not guessed.");
    return proposed(question, picked, source);
  }
  return proposed(question, value, source);
}

function affirmative(value: string): "yes" | "no" | null {
  const text = value.trim().toLowerCase();
  if (YES_WORDS.some((word) => text === word.toLowerCase())) return "yes";
  if (NO_WORDS.some((word) => text === word.toLowerCase())) return "no";
  return null;
}

function yesNo(question: ExtractedQuestion, value: string, source: string): ProposedAnswer {
  if (!value.trim()) return unresolved(question, "This is blank in the local profile.");
  const side = affirmative(value);
  if (!side) return fromFact(question, value, [value], source);
  const aliases = side === "yes" ? YES_WORDS : NO_WORDS;
  return fromFact(question, value, aliases, source);
}

function isEmail(label: string): boolean {
  return /邮箱|电子邮件|e-mail|email/i.test(label) && !/验证码|code/i.test(label);
}

function namesOf(record: { aliases: string[] }, primary: string): string[] {
  return [...record.aliases, primary].map((alias) => alias.trim()).filter(Boolean);
}

function bestMatch<T extends { aliases: string[] }>(
  blob: string,
  records: T[],
  primary: (record: T) => string,
): { record: T; length: number } | null {
  const hay = blob.toLowerCase();
  let best: { record: T; length: number } | null = null;
  for (const record of records) {
    for (const alias of namesOf(record, primary(record))) {
      if (hay.includes(alias.toLowerCase()) && (!best || alias.length > best.length)) {
        best = { record, length: alias.length };
      }
    }
  }
  return best;
}

function matchRole(blob: string, profile: Profile): Role | null {
  const role = bestMatch(blob, profile.experience, (item) => item.company);
  const school = bestMatch(blob, profile.education, (item) => item.school);
  if (!role) return null;
  if (school && school.length > role.length) return null;
  return role.record;
}

function matchSchool(blob: string, profile: Profile): School | null {
  const school = bestMatch(blob, profile.education, (item) => item.school);
  const role = bestMatch(blob, profile.experience, (item) => item.company);
  if (!school) return null;
  if (role && role.length > school.length) return null;
  return school.record;
}

function isProficiencyLabel(label: string): boolean {
  return /proficiency|fluency|熟练程度|语言水平|熟练|水平|\blevel\b/i.test(label);
}

function languageLevel(question: ExtractedQuestion, language: LanguageFact): ProposedAnswer {
  if (language.level === "highest-on-form") {
    const choices = meaningfulOptions(question.options);
    if (!choices.length) return needsUser(question, "Choose the highest proficiency this form offers.");
    let best: { option: string; rank: number } | null = null;
    for (const option of choices) {
      const rank = LEVELS.findIndex((level) => option.toLowerCase().includes(level.toLowerCase()));
      if (rank < 0) continue;
      if (!best || rank < best.rank) best = { option, rank };
    }
    if (!best) return missing(question, "No option on this field matches a known proficiency scale. Not guessed.");
    return proposed(question, best.option, "Local profile. Highest proficiency listed on this field.");
  }
  if (!language.level.trim()) return unresolved(question, "This language has no level in the local profile.");
  return fromFact(question, language.level, [language.level], "Local profile.");
}

function proposeLanguage(question: ExtractedQuestion, profile: Profile): ProposedAnswer | null {
  if (!isProficiencyLabel(question.label)) return null;
  const label = question.label.toLowerCase();
  const named = profile.languages.filter((language) => language.name.trim() && label.includes(language.name.trim().toLowerCase()));
  if (named.length > 1) return missing(question, "More than one language in the local profile matches this field.");
  if (named.length === 1) return languageLevel(question, named[0]);
  if (profile.languages.length === 1) return languageLevel(question, profile.languages[0]);
  return missing(question, "The local profile does not say which language this field is for.");
}

function customAnswer(question: ExtractedQuestion, profile: Profile): ProposedAnswer | null {
  const label = question.label.toLowerCase();
  for (const answer of profile.customAnswers) {
    const phrases = answer.labelIncludes.map((phrase) => phrase.trim().toLowerCase()).filter(Boolean);
    if (!phrases.length || !phrases.every((phrase) => label.includes(phrase))) continue;
    if (!answer.value.trim()) return unresolved(question, "This custom answer is blank in the local profile.");
    const note = answer.note.trim() || "Local profile.";
    return fromFact(question, answer.value, [answer.value], note);
  }
  return null;
}

function proposeOne(question: ExtractedQuestion, profile: Profile): ProposedAnswer {
  const label = norm(question.label);
  const blob = norm(`${question.section} ${question.label}`);
  const compact = label.replace(/\s/g, "");
  const source = "Local profile.";

  if (question.kind === "password" || /密码|password|验证码|短信|一次性|security code|one-time/i.test(label)) {
    return needsUser(question, "Passwords and one-time codes are never entered.");
  }

  if (question.kind === "checkbox" && /同意|隐私|条款|privacy|terms|acknowledge|承诺/i.test(label)) {
    return needsUser(question, "Confirm terms yourself.");
  }

  if (question.kind === "file" || /上传简历|简历附件|resume file|attach/i.test(label)) {
    return needsUser(question, "Upload the resume file yourself. The profile only has text.");
  }

  if (isEmail(label)) {
    if (question.verified || question.currentValue.trim()) {
      return base(question, "leave-verified", "Leave the email already on the page.", "An email already verified or filled in stays unchanged.");
    }
    if (!profile.email.trim()) return unresolved(question, "The local profile has no email.");
    return proposed(question, profile.email, "Local profile. If this site already verified a different email, do not replace it.");
  }

  const custom = customAnswer(question, profile);
  if (custom) return custom;

  if (/电话|手机|mobile|phone/i.test(label) && !/验证码|code/i.test(label)) {
    return fromFact(question, profile.phone, [profile.phone], source);
  }

  if (/邮编|邮政编码|postal|zip/i.test(label)) {
    return fromFact(question, profile.location.postalCode, [profile.location.postalCode], source);
  }

  if (/街道|详细地址|address line|street|住址|^区|区（|区\(|district/i.test(compact) && !/行政区划/.test(compact)) {
    return unresolved(question, "The local profile has no street or district.");
  }

  if (/年满\s*18|18\s*岁|at least 18|18 or older|over 18/i.test(label)) {
    return yesNo(question, profile.atLeast18, source);
  }

  if (/合法工作|工作许可|authorized to work|legally authorized|eligible to work|work authorization|right to work/i.test(label)) {
    return yesNo(question, profile.workAuthorization, source);
  }

  if (/签证|sponsorship|visa/i.test(label)) {
    return yesNo(question, profile.needsVisaSponsorship, source);
  }

  if (/^性别|^gender\b/i.test(label)) {
    return fromFact(question, profile.gender, [profile.gender, ...profile.genderAliases], source);
  }

  const languageAnswer = proposeLanguage(question, profile);
  if (languageAnswer) return languageAnswer;

  if (/^(语言|languages?)$/i.test(label) || /掌握的语言|languages spoken/i.test(label)) {
    if (profile.languages.length !== 1 || !profile.languages[0].name.trim()) {
      return unresolved(question, "The local profile does not name a single language for this field.");
    }
    const name = profile.languages[0].name;
    const picked = pickOption(question.options, [name]);
    if (meaningfulOptions(question.options).length && !picked) {
      return missing(question, "None of the options match the language in the local profile.");
    }
    return proposed(question, picked ?? name, source);
  }

  if (/专业技能|技能|skill set|^skills?$/i.test(label) && !/语言|language/i.test(label)) {
    if (!profile.skills.trim()) return unresolved(question, "The local profile has no skills section.");
    if (meaningfulOptions(question.options).length) {
      return missing(question, "Skills have to be the full section from the profile. This field is a list of options, so it was not guessed.");
    }
    return proposed(question, profile.skills, "Local profile. Full skills section.");
  }

  if (/个人简介|自我介绍|专业概述|about you|^summary$/i.test(label)) {
    return fromFact(question, profile.summary, [profile.summary], "Local profile. Full summary.");
  }

  if (/教育背景|^education$/i.test(label)) {
    return fromFact(question, profile.educationText, [profile.educationText], "Local profile. Full education text.");
  }

  if (/工作描述|职责|工作内容|job description|responsibilities/i.test(label)) {
    const role = matchRole(blob, profile);
    if (!role || !role.description.trim()) {
      return unresolved(question, "This field does not name one role in the local profile. The answer has to be that role's full text, so it was left blank.");
    }
    return proposed(question, role.description, "Local profile. Full text for the matching role.");
  }

  if (/^(公司|公司名称|雇主|company|employer)$/i.test(label)) {
    const role = matchRole(blob, profile);
    if (!role || !role.company.trim()) return unresolved(question, "This field does not name one role in the local profile.");
    return proposed(question, role.company, source);
  }

  if (/职位名称|职务|job title|^title$|^position$/i.test(label) && !/申请职位|职位链接/.test(label)) {
    const role = matchRole(blob, profile);
    if (!role || !role.title.trim()) return unresolved(question, "This field does not name one role in the local profile.");
    return proposed(question, role.title, source);
  }

  if (/开始时间|入职|start date|from date/i.test(label)) {
    const role = matchRole(blob, profile);
    if (!role || !role.start.trim()) return unresolved(question, "This field does not name one role in the local profile.");
    return proposed(question, role.start, source);
  }

  if (/结束时间|离职|end date|to date/i.test(label)) {
    const role = matchRole(blob, profile);
    if (!role || !role.end.trim()) return unresolved(question, "This field does not name one role in the local profile.");
    return proposed(question, role.end, source);
  }

  if (/学校|院校|school|university|college/i.test(label)) {
    const school = matchSchool(blob, profile);
    if (!school || !school.school.trim()) return unresolved(question, "This field does not name one school in the local profile.");
    return proposed(question, school.school, source);
  }

  if (/学位|degree|学历/i.test(label)) {
    const school = matchSchool(blob, profile);
    if (!school || !school.degreeLine.trim()) return unresolved(question, "This field does not name one school in the local profile.");
    return proposed(question, school.degreeLine, source);
  }

  if (/英文名|english name|alternate name/i.test(label)) {
    return fromFact(question, profile.name.alternate, [profile.name.alternate], source);
  }

  if (/首选姓名|preferred name/i.test(label)) {
    return fromFact(question, profile.name.preferred, [profile.name.preferred], source);
  }

  if (/本地写法/.test(label) && /名/.test(label) && !/姓/.test(label)) {
    return fromFact(question, profile.name.given, [profile.name.given], source);
  }

  if (/本地写法/.test(label) && /姓/.test(label)) {
    return fromFact(question, profile.name.family, [profile.name.family], source);
  }

  if (/^(姓氏|姓|last name|family name|surname)$/i.test(label)) {
    return fromFact(question, profile.name.family, [profile.name.family], source);
  }

  if (/^(名字|名|first name|given name)$/i.test(label)) {
    return fromFact(question, profile.name.given, [profile.name.given], source);
  }

  if (/姓名|全名|法定姓名|full name|legal name/i.test(label)) {
    return fromFact(question, profile.name.full, [profile.name.full], source);
  }

  if (/^国家|^country\b|国家\/地区|国家或地区/i.test(label)) {
    return fromFact(question, profile.location.country, [profile.location.country, ...profile.location.countryAliases], source);
  }

  if (/省|直辖市|自治区|province|state|region/i.test(label) && !/城市|city/.test(label)) {
    return fromFact(question, profile.location.region, [profile.location.region, ...profile.location.regionAliases], source);
  }

  if (/^城市|^city\b|所在城市/i.test(label)) {
    return fromFact(question, profile.location.city, [profile.location.city, ...profile.location.cityAliases], source);
  }

  return unresolved(question, "This is not in the local profile.");
}

export function proposeAnswers(questions: ExtractedQuestion[], profile: Profile): ProposedAnswer[] {
  return questions.map((question) => proposeOne(question, profile));
}
