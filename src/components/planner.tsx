"use client";

import { useEffect, useState } from "react";
import type { Profile, ProfileSource } from "@/data/profile-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { ApplicationBatch } from "@/lib/batch-types";
import { parseUrlList } from "@/lib/url-list";
import { RULES } from "@/lib/rules";
import type { AnswerStatus, ApplicationPlan, ProposedAnswer, StopReason } from "@/lib/types";
import { hintForUrl } from "@/lib/url-hint";

const STATUS_LABEL: Record<AnswerStatus, string> = {
  proposed: "Proposed",
  "leave-verified": "Leave as-is",
  missing: "Missing",
  unmapped: "Leave blank",
  "needs-user": "Needs you",
};

const STOP_LABEL: Record<StopReason, string> = {
  form: "Application form",
  "auth-wall": "Login wall",
  "wizard-diversion": "Profile wizard",
  "no-apply-control": "No apply control",
  "max-hops": "Stopped after several steps",
};

function statusVariant(status: AnswerStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "missing" || status === "needs-user") return "destructive";
  if (status === "unmapped") return "secondary";
  if (status === "leave-verified") return "outline";
  return "default";
}

function shown(value: string): string {
  return value.trim() ? value : "Not set";
}

function AnswerBlock({ item }: { item: ProposedAnswer }) {
  const showValue = item.status === "proposed" || item.status === "leave-verified";
  return (
    <div className="grid gap-2 border-b border-border/80 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(item.status)}>{STATUS_LABEL[item.status]}</Badge>
        {item.required ? <Badge variant="outline">Required</Badge> : <Badge variant="secondary">Optional</Badge>}
        <h3 className="text-sm font-medium">{item.label}</h3>
      </div>
      {showValue ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/70 px-3 py-2 font-sans text-sm leading-6">
          {item.value}
        </pre>
      ) : null}
      <p className="text-sm text-muted-foreground">{item.source}</p>
    </div>
  );
}

export function Planner({ profile, profileSource }: { profile: Profile; profileSource: ProfileSource }) {
  const [url, setUrl] = useState("");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ApplicationPlan | null>(null);
  const [batch, setBatch] = useState<ApplicationBatch | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const urls = parseUrlList(url);
  const hint = urls.length === 1 ? hintForUrl(urls[0]) : null;
  const proposed = plan?.answers.filter((answer) => answer.status === "proposed" || answer.status === "leave-verified") ?? [];
  const unmapped = plan?.answers.filter((answer) => answer.status === "unmapped") ?? [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    setBatch(null);
    const lines = parseUrlList(url);
    try {
      const response = await fetch(lines.length > 1 ? "/api/plan/batch" : "/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lines.length > 1 ? { urls: lines } : { url: lines[0] ?? "" }),
      });
      const data = (await response.json()) as (ApplicationPlan | ApplicationBatch) & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not build a plan.");
      }
      if (lines.length > 1) setBatch(data as ApplicationBatch);
      else setPlan(data as ApplicationPlan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build a plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground">Does not fill. Does not submit.</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Application plan</h1>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground sm:text-right">
            Paste one job URL per line. Answers come from a profile file on this machine.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job URL</CardTitle>
              <CardDescription>
                Paste one page per line. Each URL is opened on its own. The planner follows a visible apply control, then lists proposed answers and missing required fields. A login wall or a profile wizard stops that URL only.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="grid gap-2">
                  <label htmlFor="job-url" className="text-sm font-medium">
                    Job URLs
                  </label>
                  <Textarea
                    id="job-url"
                    data-testid="job-url"
                    autoComplete="off"
                    placeholder={"https://example.com/jobs/123\nhttps://example.com/jobs/456"}
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className="min-h-24 font-sans text-sm"
                    required
                  />
                </div>
                <Button type="submit" data-testid="build-plan" disabled={loading || urls.length === 0} className="h-11 sm:mt-7">
                  {loading ? "Opening…" : urls.length > 1 ? `Build ${urls.length} plans` : "Build plan"}
                </Button>
              </form>

              {hint ? (
                <Alert>
                  <AlertTitle>{hint.headline}</AlertTitle>
                  <AlertDescription>{hint.detail}</AlertDescription>
                </Alert>
              ) : null}

              {origin ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Local samples</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setUrl(`${origin}/fixtures/posting.html`)}>
                    Apply control
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`${origin}/fixtures/employer-posting.html`)}
                  >
                    Another apply control
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`${origin}/fixtures/wizard-posting.html`)}
                  >
                    Profile wizard (should stop)
                  </Button>
                </div>
              ) : null}

              {loading ? (
                <p className="text-sm text-muted-foreground" data-testid="loading">
                  Opening the page and reading the visible questions. It does not type into the form and it does not submit.
                </p>
              ) : null}
              {error ? (
                <Alert variant="destructive" data-testid="error">
                  <AlertTitle>No plan</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          {batch ? <BatchView batch={batch} /> : null}
          {plan ? <PlanView plan={plan} proposed={proposed} unmapped={unmapped} /> : null}
          {!plan && !batch ? <RulesAndEmpty /> : null}
        </div>

        <aside className="grid content-start gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Local profile</CardTitle>
              <CardDescription>
                {profileSource === "local"
                  ? "Loaded from profile.local.json on this machine. That file is not committed."
                  : "Showing the placeholder template. Copy it to profile.local.json and edit it locally. That file is not committed."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Fact label="Name" value={shown(profile.name.full)} />
              <Fact label="Phone" value={shown(profile.phone)} />
              <Fact label="Email" value={shown(profile.email)} />
              <Fact
                label="Location"
                value={shown(
                  [profile.location.country, profile.location.region, profile.location.city, profile.location.postalCode]
                    .filter((part) => part.trim())
                    .join(" / "),
                )}
              />
              <Fact label="Gender" value={shown(profile.gender)} />
              <Fact label="At least 18" value={shown(profile.atLeast18)} />
              <Fact label="Work authorization" value={shown(profile.workAuthorization)} />
              <Fact label="Visa sponsorship" value={shown(profile.needsVisaSponsorship)} />
              <Fact label="Answer language" value={shown(profile.answerLanguage)} />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Not in the profile</CardTitle>
              <CardDescription>Required fields like these are marked missing. They are not guessed.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-1 text-sm text-muted-foreground">
                {profile.notOnFile.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function RulesAndEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How a plan is used</CardTitle>
        <CardDescription>Read the missing fields first. If one is missing, ask. Do not guess, and do not submit.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
          {RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function PlanView({
  plan,
  proposed,
  unmapped,
}: {
  plan: ApplicationPlan;
  proposed: ProposedAnswer[];
  unmapped: ProposedAnswer[];
}) {
  return (
    <div className="grid gap-6" data-testid="plan">
      <Card>
        <CardHeader>
          <CardTitle>Path</CardTitle>
          <CardDescription>{plan.pageTitle || "Page opened"}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ol className="grid gap-3" data-testid="path">
            {plan.hops.map((hop, index) => (
              <li key={`${hop.url}-${index}`} className="grid gap-1 text-sm">
                <span className="font-medium">
                  {index + 1}. {hop.action}
                </span>
                <a className="break-all text-muted-foreground underline-offset-4 hover:underline" href={hop.url}>
                  {hop.url}
                </a>
              </li>
            ))}
          </ol>
          {plan.warnings.map((warning) => (
            <Alert key={warning} variant={plan.stoppedBecause === "wizard-diversion" ? "destructive" : "default"}>
              <AlertTitle>{plan.stoppedBecause === "wizard-diversion" ? "Stopped" : "Note"}</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
          {plan.stoppedBecause === "wizard-diversion" ? (
            <div data-testid="wizard-stop">
              <p className="text-sm">No answers were proposed for this wizard:</p>
              <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                {plan.seenLabels.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Separator />
          <p className="text-sm text-muted-foreground">
            {plan.applicationReached
              ? "The application form was read. These are proposed answers, not values typed into the page."
              : "This is not the job application yet."}
            {plan.submitted || plan.mutated
              ? " The runner changed the page. Do not use this result."
              : " The runner did not type and did not submit."}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="missing" className={plan.missing.length ? "ring-destructive/40" : undefined}>
        <CardHeader>
          <CardTitle>Missing required fields</CardTitle>
          <CardDescription>
            {plan.missing.length
              ? "These required fields are not in the local profile. Ask before you apply. Nothing was guessed."
              : "No required field was left unmatched. This version still does not submit."}
          </CardDescription>
        </CardHeader>
        {plan.missing.length ? (
          <CardContent>
            {plan.missing.map((item) => (
              <AnswerBlock key={item.id} item={item} />
            ))}
          </CardContent>
        ) : null}
      </Card>

      {plan.needsUser.length ? (
        <Card data-testid="needs-user">
          <CardHeader>
            <CardTitle>Needs you</CardTitle>
            <CardDescription>Login, codes, terms, and the resume file stay with you.</CardDescription>
          </CardHeader>
          <CardContent>
            {plan.needsUser.map((item) => (
              <AnswerBlock key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {proposed.length ? (
        <Card data-testid="answers">
          <CardHeader>
            <CardTitle>Proposed answers</CardTitle>
            <CardDescription>Copied from the local profile. Role descriptions and skills are the full text on file.</CardDescription>
          </CardHeader>
          <CardContent>
            {proposed.map((item) => (
              <AnswerBlock key={item.id} item={item} />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {unmapped.length ? (
        <details className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10">
          <summary className="cursor-pointer font-medium">Optional and not in the profile ({unmapped.length})</summary>
          <div className="mt-2">
            {unmapped.map((item) => (
              <AnswerBlock key={item.id} item={item} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function BatchView({ batch }: { batch: ApplicationBatch }) {
  return (
    <div className="grid gap-6" data-testid="batch">
      <Card>
        <CardHeader>
          <CardTitle>Batch</CardTitle>
          <CardDescription>
            {batch.reachedForm} reached a form. {batch.loginWalls} hit a login wall. {batch.profileWizards} hit a profile wizard. Nothing was submitted.
          </CardDescription>
        </CardHeader>
        {batch.gaps.length ? (
          <CardContent>
            <h3 className="text-sm font-medium">Ask once</h3>
            <ul className="mt-2 grid gap-2 text-sm">
              {batch.gaps.map((gap) => (
                <li key={`${gap.status}:${gap.label}`}>
                  <span className="font-medium">{gap.label}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {gap.status === "needs-user" ? "Needs you" : "Missing"} · {gap.count}{" "}
                    {gap.count === 1 ? "posting" : "postings"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        ) : null}
      </Card>
      {batch.items.map((item) => {
        const plan = item.plan;
        const proposed = plan?.answers.filter((answer) => answer.status === "proposed" || answer.status === "leave-verified") ?? [];
        const unmapped = plan?.answers.filter((answer) => answer.status === "unmapped") ?? [];
        return (
          <div key={`${item.index}-${item.url}`} className="grid gap-3">
            <h2 className="text-lg font-semibold">
              {item.index + 1}. {plan?.pageTitle || item.url}
            </h2>
            {item.error ? (
              <Alert variant="destructive">
                <AlertTitle>No plan</AlertTitle>
                <AlertDescription>{item.error}</AlertDescription>
              </Alert>
            ) : null}
            {plan ? (
              <>
                <p className="text-sm text-muted-foreground">Stopped at {STOP_LABEL[plan.stoppedBecause]}.</p>
                <PlanView plan={plan} proposed={proposed} unmapped={unmapped} />
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
