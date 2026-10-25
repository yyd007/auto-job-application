import { NextResponse } from "next/server";
import { PlanError } from "@/lib/errors";
import { buildPlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  let raw = "";
  try {
    const body = (await request.json()) as { url?: unknown };
    raw = typeof body.url === "string" ? body.url : "";
  } catch {
    return NextResponse.json({ error: "请贴上职位链接。" }, { status: 400 });
  }

  try {
    const plan = await buildPlan(raw);
    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof PlanError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "生成计划失败。页面没有提交。" }, { status: 500 });
  }
}
