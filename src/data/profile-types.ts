export type Role = {
  company: string;
  aliases: string[];
  title: string;
  location: string;
  start: string;
  end: string;
  description: string;
};

export type School = {
  school: string;
  aliases: string[];
  dates: string;
  degreeLine: string;
};

export type CustomAnswer = {
  labelIncludes: string[];
  value: string;
  note: string;
};

export type LanguageFact = {
  name: string;
  /** "highest-on-form" uses the strongest option that control lists. Any other value is literal. */
  level: string;
};

export type ProfileSource = "local" | "template";

export type Profile = {
  name: {
    family: string;
    given: string;
    full: string;
    alternate: string;
    preferred: string;
  };
  phone: string;
  email: string;
  location: {
    country: string;
    region: string;
    city: string;
    postalCode: string;
    countryAliases: string[];
    regionAliases: string[];
    cityAliases: string[];
  };
  gender: string;
  genderAliases: string[];
  atLeast18: string;
  workAuthorization: string;
  needsVisaSponsorship: string;
  summary: string;
  skills: string;
  educationText: string;
  education: School[];
  experience: Role[];
  languages: LanguageFact[];
  answerLanguage: string;
  /** BCP 47 tag used when opening pages, such as en-US. Empty uses en-US. */
  browserLocale: string;
  customAnswers: CustomAnswer[];
  notOnFile: string[];
};

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function role(value: unknown): Role {
  const raw = value && typeof value === "object" ? (value as Partial<Role>) : {};
  return {
    company: str(raw.company),
    aliases: strList(raw.aliases),
    title: str(raw.title),
    location: str(raw.location),
    start: str(raw.start),
    end: str(raw.end),
    description: str(raw.description),
  };
}

function school(value: unknown): School {
  const raw = value && typeof value === "object" ? (value as Partial<School>) : {};
  return {
    school: str(raw.school),
    aliases: strList(raw.aliases),
    dates: str(raw.dates),
    degreeLine: str(raw.degreeLine),
  };
}

function custom(value: unknown): CustomAnswer {
  const raw = value && typeof value === "object" ? (value as Partial<CustomAnswer>) : {};
  return {
    labelIncludes: strList(raw.labelIncludes),
    value: str(raw.value),
    note: str(raw.note),
  };
}

function language(value: unknown): LanguageFact {
  const raw = value && typeof value === "object" ? (value as Partial<LanguageFact>) : {};
  return { name: str(raw.name), level: str(raw.level) };
}

export function asProfile(input: unknown): Profile {
  const raw = input && typeof input === "object" ? (input as Partial<Profile>) : {};
  const location = (
    raw.location && typeof raw.location === "object" ? raw.location : {}
  ) as Partial<Profile["location"]>;
  const name = (raw.name && typeof raw.name === "object" ? raw.name : {}) as Partial<Profile["name"]>;
  return {
    name: {
      family: str(name.family),
      given: str(name.given),
      full: str(name.full),
      alternate: str(name.alternate),
      preferred: str(name.preferred),
    },
    phone: str(raw.phone),
    email: str(raw.email),
    location: {
      country: str(location.country),
      region: str(location.region),
      city: str(location.city),
      postalCode: str(location.postalCode),
      countryAliases: strList(location.countryAliases),
      regionAliases: strList(location.regionAliases),
      cityAliases: strList(location.cityAliases),
    },
    gender: str(raw.gender),
    genderAliases: strList(raw.genderAliases),
    atLeast18: str(raw.atLeast18),
    workAuthorization: str(raw.workAuthorization),
    needsVisaSponsorship: str(raw.needsVisaSponsorship),
    summary: str(raw.summary),
    skills: str(raw.skills),
    educationText: str(raw.educationText),
    education: Array.isArray(raw.education) ? raw.education.map(school) : [],
    experience: Array.isArray(raw.experience) ? raw.experience.map(role) : [],
    languages: Array.isArray(raw.languages) ? raw.languages.map(language) : [],
    answerLanguage: str(raw.answerLanguage),
    browserLocale: str(raw.browserLocale),
    customAnswers: Array.isArray(raw.customAnswers) ? raw.customAnswers.map(custom) : [],
    notOnFile: strList(raw.notOnFile),
  };
}
