import type { Profile } from "../data/profile-types";
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
      question.kind === "password" || /密码|password|验证码|code/i.test(question.label)
        ? "Passwords and one-time codes are never entered."
        : "This is a login page, not the application. Sign in yourself.",
  }));
}

export async function buildPlan(rawUrl: string, profile: Profile): Promise<ApplicationPlan> {
  const url = parseJobUrl(rawUrl).toString();
  const extracted = await extractForm(url, profile.browserLocale);
  const warnings = [...extracted.warnings];

  let answers: ProposedAnswer[] = [];
  if (extracted.stoppedBecause === "wizard-diversion") {
    answers = [];
  } else if (extracted.stoppedBecause === "auth-wall") {
    answers = extracted.questions.length
      ? loginAnswers(extracted.questions)
      : [
          {
            id: "sign-in",
            label: "Sign in",
            section: "",
            required: true,
            kind: "login",
            options: [],
            status: "needs-user",
            value: "",
            source: "Applying opened a login wall. Passwords and codes are not entered.",
          },
        ];
  } else if (extracted.questions.length > 0) {
    answers = proposeAnswers(extracted.questions, profile);
  }

  if (profile.answerLanguage.trim() && extracted.stoppedBecause === "form") {
    warnings.push(
      `The local profile says to answer in ${profile.answerLanguage}. Use the full role text and the full skills section from the profile.`,
    );
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
    answers,
    missing,
    needsUser,
    seenLabels: extracted.questions.map((question) => question.label),
    submitted: extracted.submitted,
    mutated: extracted.mutated,
    rules: RULES,
  };
}
