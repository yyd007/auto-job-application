import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import template from "./profile.template.json";
import { asProfile, type Profile, type ProfileSource } from "./profile-types";
import { PlanError } from "../lib/errors";

export type LoadedProfile = {
  profile: Profile;
  source: ProfileSource;
};

export function loadProfile(): LoadedProfile {
  const localPath = path.join(process.cwd(), "profile.local.json");
  if (!existsSync(localPath)) {
    return { profile: asProfile(template), source: "template" };
  }
  try {
    return { profile: asProfile(JSON.parse(readFileSync(localPath, "utf8"))), source: "local" };
  } catch {
    throw new PlanError("The local profile file could not be read. Fix profile.local.json. Nothing was submitted.");
  }
}
