# Application plan

Paste a job URL. The app opens the page, follows a visible apply control, reads the questions it can see, and proposes answers from a profile file on this machine. Required questions that are not in that file are marked missing.

It does not type into the form, and it does not submit.

## Local profile

Copy the template and edit it on your machine:

```bash
cp src/data/profile.template.json profile.local.json
```

`profile.local.json` is gitignored. Do not commit it. If the file is missing, the app uses the placeholder template (`Your name`, and the other `Your …` values). Replace those placeholders before you rely on a plan.

Location, language, work authorization, and every other fact belong in that file. The app does not guess a required answer that is missing from it, and it does not ship a filled-in profile.

For a language entry, set `level` to `highest-on-form` to use the strongest proficiency that control actually lists, or set a literal value. `browserLocale` is an optional BCP 47 tag such as `en-US`. Leave it blank to open pages in `en-US`.

`customAnswers` fills a question only when its label contains every phrase in `labelIncludes`.

`answerLanguage`, when set, is only a reminder on the plan. It does not change the answers by itself.

## Run

```bash
npm install
npx playwright install chromium
npm run dev
```

Open [http://127.0.0.1:4721](http://127.0.0.1:4721).

The sample links on the page use static fixtures in this repo. They do not contact an employer.

## Command line

```bash
npm run extract -- https://example.com/jobs/123
```

Prints a JSON plan. Exit 0 means the application form was read and every required field has a proposed answer. Exit 2 means it stopped: something is missing, needs you, hit a login wall, or landed on a profile wizard. Exit 1 means it did not finish. The command does not submit.

Several URLs, one per line, are planned as a batch. A login wall or a profile wizard stops that URL only. Repeated gaps are listed once.

```bash
npm run extract -- https://example.com/jobs/1 https://example.com/jobs/2
```

## Tests

```bash
npm test
```

## What this version does

- Starts from the URL you provide.
- Follows a visible apply control, and stops at a login wall.
- Stops if the flow becomes a profile wizard instead of the job application.
- Proposes answers only from the local profile. When a role or the skills section matches, it uses the full text stored there.
- Leaves an email that is already verified or filled in on the page unchanged.
- Marks any other required field missing.

## What it does not do

- Does not fill the form, and does not click Submit.
- Does not guess.
- Does not store passwords or one-time codes.
- Does not submit after you confirm. That step stays manual, in the same signed-in session, because sites time out.
