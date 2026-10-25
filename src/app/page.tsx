import type { Metadata } from "next";
import { Planner } from "@/components/planner";
import { loadProfile } from "@/data/load-profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Application plan",
  description: "Read a job URL, propose answers from a local profile, and do not submit.",
};

export default function Home() {
  const loaded = loadProfile();
  return <Planner profile={loaded.profile} profileSource={loaded.source} />;
}
