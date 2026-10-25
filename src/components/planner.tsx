"use client";

import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RULES } from "@/lib/rules";
import type { AnswerStatus, ApplicationPlan, ProposedAnswer } from "@/lib/types";
import { hintForUrl } from "@/lib/url-hint";

const STATUS_LABEL: Record<AnswerStatus, string> = {
  proposed: "拟填",
  "leave-verified": "保持原样",
  missing: "缺失",
  unmapped: "留空",
  "needs-user": "要你处理",
};

function statusVariant(status: AnswerStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "missing" || status === "needs-user") return "destructive";
  if (status === "unmapped") return "secondary";
  if (status === "leave-verified") return "outline";
  return "default";
}

function AnswerBlock({ item }: { item: ProposedAnswer }) {
  const showValue = item.status === "proposed" || item.status === "leave-verified";
  return (
    <div className="grid gap-2 border-b border-border/80 py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(item.status)}>{STATUS_LABEL[item.status]}</Badge>
        {item.required ? <Badge variant="outline">必填</Badge> : <Badge variant="secondary">可选</Badge>}
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

export function Planner() {
  const [url, setUrl] = useState("");
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<ApplicationPlan | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const hint = url.trim() ? hintForUrl(url) : null;
  const proposed = plan?.answers.filter((answer) => answer.status === "proposed" || answer.status === "leave-verified") ?? [];
  const unmapped = plan?.answers.filter((answer) => answer.status === "unmapped") ?? [];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as ApplicationPlan & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "生成计划失败。");
      }
      setPlan(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成计划失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-muted-foreground">不填写 · 不提交</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">投递计划</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:text-right">
            {profile.name.full}（{profile.name.english}）
            <br />
            {profile.location.city} {profile.location.postalCode}
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>职位链接</CardTitle>
              <CardDescription>
                贴上要投的那一页。工具会打开它，跟着「立即投递」或公司的申请按钮走到表单，对照简历列出拟填答案和缺失的必填项。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div className="grid gap-2">
                  <label htmlFor="job-url" className="text-sm font-medium">
                    职位链接
                  </label>
                  <Input
                    id="job-url"
                    data-testid="job-url"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    placeholder="https://jobs.apple.com/zh-cn/details/…"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className="h-11 md:text-base"
                    required
                  />
                </div>
                <Button type="submit" data-testid="build-plan" disabled={loading || !url.trim()} className="h-11 sm:mt-7">
                  {loading ? "正在打开…" : "生成计划"}
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
                  <span className="text-xs text-muted-foreground">本地示例</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`${origin}/fixtures/posting.html`)}
                  >
                    立即投递
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`${origin}/fixtures/employer-posting.html`)}
                  >
                    提交简历
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(`${origin}/fixtures/wizard-posting.html`)}
                  >
                    资料向导（应停住）
                  </Button>
                </div>
              ) : null}

              {loading ? (
                <p className="text-sm text-muted-foreground" data-testid="loading">
                  正在打开页面并读取看得见的问题。不会往表单里打字，也不会点提交。
                </p>
              ) : null}
              {error ? (
                <Alert variant="destructive" data-testid="error">
                  <AlertTitle>没有生成计划</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          {plan ? <PlanView plan={plan} proposed={proposed} unmapped={unmapped} /> : <RulesAndEmpty />}
        </div>

        <aside className="grid content-start gap-4">
          <Card size="sm">
            <CardHeader>
              <CardTitle>已确认资料</CardTitle>
              <CardDescription>申请表上用这些。简历邮箱如果在站点上已验证，就保持不动。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <Fact label="姓名" value={`${profile.name.family} / ${profile.name.given}`} />
              <Fact label="电话" value={profile.phone} />
              <Fact label="邮箱" value={profile.email} />
              <Fact label="地址" value={`${profile.location.province} / ${profile.location.city} / ${profile.location.postalCode}`} />
              <Fact label="性别" value={profile.gender} />
              <Fact label="年满 18 岁" value={profile.atLeast18} />
              <Fact label="合法工作许可" value={profile.workAuthorization} />
              <Fact label="签证担保" value={profile.needsVisaSponsorship} />
              <Fact label="曾受雇于 Apple" value={profile.everEmployedByApple} />
              <Fact label="Apple 派遣或合同工" value={profile.everAppleContractor} />
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>资料里没有</CardTitle>
              <CardDescription>必填时标成缺失，先问你。</CardDescription>
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
        <CardTitle>怎么用这份计划</CardTitle>
        <CardDescription>先看缺失项。缺了就停下来问，不要猜，也不要提交。</CardDescription>
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
          <CardTitle>申请路径</CardTitle>
          <CardDescription>{plan.pageTitle || "已打开页面"}</CardDescription>
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
              <AlertTitle>{plan.stoppedBecause === "wizard-diversion" ? "停住" : "注意"}</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
          {plan.stoppedBecause === "wizard-diversion" ? (
            <div data-testid="wizard-stop">
              <p className="text-sm">向导上的问题没有拟填：</p>
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
              ? "已经读到申请表。下面是拟填答案，不是已经填进去的内容。"
              : "还没有进入这份职位的申请表。"}
            {plan.submitted || plan.mutated ? " 运行器改动了页面，这份结果不能用。" : " 运行器没有打字，也没有提交。"}
          </p>
        </CardContent>
      </Card>

      <Card data-testid="missing" className={plan.missing.length ? "ring-destructive/40" : undefined}>
        <CardHeader>
          <CardTitle>缺失的必填项</CardTitle>
          <CardDescription>
            {plan.missing.length
              ? "简历和已确认资料里没有这些。先问，得到答案之前不要投。"
              : "没有发现对不上的必填项。这一版仍然不会提交。"}
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
            <CardTitle>需要你本人处理</CardTitle>
            <CardDescription>登录、验证码、条款和简历原件都不代办。</CardDescription>
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
            <CardTitle>拟填答案</CardTitle>
            <CardDescription>中国职位用中文。工作描述和技能都是简历原文。</CardDescription>
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
          <summary className="cursor-pointer font-medium">可选、资料里没有（{unmapped.length}）</summary>
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
