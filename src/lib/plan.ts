import { proposeAnswers } from "./propose";
import { extractForm } from "./extract";
import { RULES } from "./rules";
import { parseJobUrl } from "./url-hint";
import type { ApplicationPlan, ExtractedQuestion, ProposedAnswer } from "./types";

function loginAnswers(questions: ExtractedQuestion[]): ProposedAnswer[] {
  return questions.map((question) => ({
    id: question.id,
    label: question.label,
    section: question.section,
    required: question.required,
    kind: question.kind,
    options: question.options,
    status: "needs-user" as const,
    value: "",
    source:
      question.kind === "password" || /密码|password|验证码/.test(question.label)
        ? "不会填写密码或验证码。"
        : "这是登录页，不是申请表。登录由你本人完成。",
  }));
}

export async function buildPlan(rawUrl: string): Promise<ApplicationPlan> {
  const url = parseJobUrl(rawUrl).toString();
  const extracted = await extractForm(url);
  const warnings = [...extracted.warnings];

  let answers: ProposedAnswer[] = [];
  if (extracted.stoppedBecause === "wizard-diversion") {
    answers = [];
  } else if (extracted.stoppedBecause === "auth-wall") {
    answers = loginAnswers(extracted.questions);
  } else if (extracted.questions.length > 0) {
    answers = proposeAnswers(extracted.questions);
  }

  if (extracted.roleInChina === true && extracted.stoppedBecause === "form") {
    warnings.push("中国职位：用中文回答。工作描述用该段全文，技能用整段专业技能。");
  } else if (extracted.roleInChina === false && extracted.stoppedBecause === "form") {
    warnings.push("这份职位看起来不在中国。现有规则是中国职位用中文。要不要改成英文，先问一声。");
  } else if (extracted.roleInChina === null && extracted.stoppedBecause === "form") {
    warnings.push("还没从页面判断职位是不是在中国。中国职位才整表用中文。");
  }

  const missing = answers.filter((answer) => answer.status === "missing");
  const needsUser = answers.filter((answer) => answer.status === "needs-user");
  const tainted = extracted.submitted || extracted.mutated;

  return {
    url,
    applicationReached: extracted.stoppedBecause === "form" && !tainted,
    stoppedBecause: extracted.stoppedBecause,
    warnings,
    hops: extracted.hops,
    pageTitle: extracted.pageTitle,
    finalUrl: extracted.finalUrl,
    roleInChina: extracted.roleInChina,
    answers,
    missing,
    needsUser,
    seenLabels: extracted.questions.map((question) => question.label),
    submitted: extracted.submitted,
    mutated: extracted.mutated,
    rules: RULES,
  };
}
