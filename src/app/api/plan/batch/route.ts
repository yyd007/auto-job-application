import { NextResponse } from "next/server";
import { loadProfile } from "@/data/load-profile";
import { buildBatch } from "@/lib/batch";
import { parseUrlList } from "@/lib/url-list";
import { PlanError } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let urls: string[] = [];
  try {
    const body = (await request.json()) as { urls?: unknown };
    if (Array.isArray(body.urls)) {
      urls = body.urls.filter((item): item is string => typeof item === "string");
    } else if (typeof body.urls === "string") {
      urls = parseUrlList(body.urls);
    }
  } catch {
    return NextResponse.json({ error: "Paste one job URL per line." }, { status: 400 });
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: "Paste one job URL per line." }, { status: 400 });
  }

  try {
    const batch = await buildBatch(urls, loadProfile().profile);
    return NextResponse.json(batch);
  } catch (error) {
    if (error instanceof PlanError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not build a plan. Nothing was submitted." }, { status: 500 });
  }
}
