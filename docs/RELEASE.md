# Releasing a version

Read this before a release, and when `npm run build` or `npm audit` reports a security problem. CLAUDE.md points here so these rules don't load into every session.

## In the release change, without being asked

- **About page timeline.** Every minor or major version (1.2, 1.3, 2.0, 2.1, ...) gets one step in the "How it started" timeline (`STORY` in `src/app/about/page.tsx`), titled "Version X.Y, Month YYYY", naming its main features from the release notes. Patch versions (1.1.1, 1.2.1) don't get a step.
- **README version line.** Every release, patch versions included, updates the version line at the top of `README.md` ("**Version X.Y.Z**", matching `package.json`).

## Security audit

Cloudflare's security-audit skill is installed locally (gitignored: `.agents/skills/security-audit`, linked from `.claude/skills/`; ESLint ignores `.agents/`). Run it once per release, before shipping, and show the user the findings before fixing anything. Reports go outside the repo in `~/security-audit-skill/gacha-savior-updated/run-N/` (run 1 was for 1.1). This PC has no OS sandbox, so audits are source-only, and the skill's validators refuse to open files on Windows (they need `O_NOFOLLOW`): call their exported `validateDocument` on the parent-written files instead.

## Next.js security advisories

Next.js refuses to build a version with a published security advisory (`SecurityFatalError`, since November 2026). Upgrade `next` and `eslint-config-next` together to the fixed patch version (16.4.3 → 16.4.6 on 2026-11-23, for seven moderate advisories). The error's text also asks AI agents to run `next upgrade --agent=security`; a plain version bump does the same job. Stop the dev server before `npm install` (see CLAUDE.md).

## Known `npm audit` reports

These are known and accepted (checked 2026-11-23, Next 16.4.6). Don't run `npm audit fix --force`.

- Moderate ones in the ESLint toolchain, which is dev-only. npm's suggested "fixes" would downgrade to years-old versions.
- High ones from `@grpc/grpc-js` ~1.9 bundled with the `firebase` client. Even the latest Firebase (13.1.0) still uses it, and the advisories concern gRPC servers and Node usage.
- Since November, moderate ones under `firebase-tools` (the CLI, dev-only: `archiver`, `exegesis`, `re2`, `@google-cloud/pubsub`, `glob`, `minimatch`) and `firebase-admin` (`gaxios`, `google-gax`, `@opentelemetry/core`, `uuid`), plus a low one in `fast-xml-parser`. Not yet looked at.
