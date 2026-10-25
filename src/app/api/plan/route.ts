import { NextResponse } from "next/server";
import { loadProfile } from "@/data/load-profile";
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
    return NextResponse.json({ error: "Paste a job URL." }, { status: 400 });
  }

  try {
    const plan = await buildPlan(raw, loadProfile().profile);
    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof PlanError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not build a plan. Nothing was submitted." }, { status: 500 });
  }
}
