import template from "../data/profile.template.json";
import { asProfile, type Profile } from "../data/profile-types";

const base = template as {
  experience: Profile["experience"];
};

export const fixtureProfile: Profile = asProfile({
  ...template,
  atLeast18: "Yes",
  workAuthorization: "Yes",
  needsVisaSponsorship: "No",
  customAnswers: [
    {
      labelIncludes: ["worked at your employer"],
      value: "No",
      note: "Fixture profile.",
    },
  ],
  experience: [
    ...base.experience,
    {
      company: "Your other employer",
      aliases: ["your other employer"],
      title: "Your other title",
      location: "Your city",
      start: "Other start",
      end: "Other end",
      description: "Your other full job description.",
    },
  ],
});
