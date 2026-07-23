# TechTrends Daily

English-language Next.js SEO content site built from public GitHub, NPM, and Hacker News data. The repository keeps a curated rolling index of canonical source pages (500 by default, configurable) and pre-renders the site for Vercel.

## Pipeline

The low-maintenance GitHub Actions workflow runs once per day:

1. Fetch public source data.
2. Collect traceable evidence from official source URLs.
3. Generate new evidence-driven drafts and refresh eligible canonical pages.
4. Audit the exact numbers of new, updated, and removed article files.
5. Run ESLint and TypeScript checks.
6. Validate evidence packs, cited claims, editorial scores, review status, and content files.
7. Build the site and regenerate the sitemap.
8. Commit only after every quality gate passes.

`DAILY_NEW_ARTICLE_LIMIT` is a GitHub Actions repository variable and defaults to `5`. It is a ceiling, not a publication target: a default run may publish anywhere from zero to five new articles depending on the number of candidates that pass evidence and editorial checks. Set it to `0` for update-only runs, or raise it deliberately to values such as `8` or `10` after reviewing quality and build capacity. CI accepts integers from `0` through `20`.

Each run prints an auditable `new / updated / removed / limit` summary in both the job log and the GitHub Actions step summary. A failed evidence, review, validation, lint, type, or build check stops the run before the automated commit.

Vercel deployment is separate from this workflow. A successful build does not guarantee that the production URL is public or correctly assigned.

## Local setup

```bash
npm ci
copy .env.example .env.local
npx tsx scripts/collect-evidence.ts
npm run validate-content
npm run build
npm run dev
```

Environment variables:

```dotenv
NEXT_PUBLIC_SITE_URL=https://your-public-domain.example
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-0000000000000000
NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP=0000000000
NEXT_PUBLIC_ADSENSE_SLOT_HOME_MID=0000000000
NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM=0000000000
NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE_BOTTOM=0000000000
```

Use real AdSense values only after the site has been added to AdSense. Invalid or placeholder publisher and slot IDs are ignored, so no advertising script is loaded during development.

## Evidence and AI review

New evidence-driven articles retain the official URLs and observed values used to support their claims. Every editorial claim must cite a URL contained in that article's evidence pack. Reader-facing copy starts with the project's purpose, intended audience, attention signal, evaluation path, and bottom line; raw supporting records are kept in a collapsible source section. Indexable articles must pass the configured evidence and editorial quality thresholds. Older or rejected pages remain reachable but are excluded from discovery surfaces and marked `noindex` until they pass the current standard.

AI editing is optional. When `OPENAI_API_KEY` is unavailable or the AI service cannot provide an acceptable result, the workflow safely falls back to deterministic, source-backed copy and records the review as `not-configured` or `fallback`. It does not invent a successful AI review, and it may publish zero new articles if candidates do not pass the normal quality gates.

GitHub Actions configuration:

- No manually created secret is required for the deterministic workflow.
- `DAILY_NEW_ARTICLE_LIMIT` — optional repository variable, integer `0` through `20`; defaults to `5`. Values such as `8` or `10` are supported when a larger reviewed batch is appropriate.
- `MAX_INDEXED_ARTICLES` — optional repository variable, integer `100` through `2000`; defaults to `500`.
- `MIN_EVIDENCE_SCORE` — optional repository variable, score `0` through `100`; defaults to `50`.
- `MIN_EDITORIAL_SCORE` — optional repository variable, score `0` through `100`; defaults to `70`.
- `AI_EDITORIAL_MODEL` — optional repository variable selecting the configured editorial model.
- `AI_EDITORIAL_REVIEW_MODEL` — optional repository variable selecting a separate review model; it defaults to the editorial model.
- `OPENAI_API_KEY` — optional repository secret enabling AI editorial review. Leave it unset to use the deterministic fallback.
- `GITHUB_TOKEN` — supplied automatically by GitHub Actions; the workflow uses it for public-source access and committing approved updates.

The AdSense and public-site variables shown above belong in the production hosting environment. They are separate from the optional editorial secret.

## Commands

```bash
npm run dev              # Start the development server
npm run lint             # Run ESLint
npm run validate-content # Validate the rolling article index
npm run build            # Create the production Next.js build
npm run fetch-all        # Fetch all external data sources
npx tsx scripts/collect-evidence.ts # Collect official-source evidence
npm run generate         # Generate articles from existing data
npm run pipeline         # Fetch, generate, validate, and build
```

`fetch-all`, `collect-evidence`, `generate`, and `pipeline` may access external APIs or rewrite files under `data/` and `content/`. Use them only when you intend to refresh content. The validation, lint, type-check, and build commands do not fetch new editorial data.

## Monetization readiness

AdSense revenue is not automatic. Before requesting or resuming review, verify all of the following:

- The canonical site URL is publicly reachable without Vercel authentication.
- The domain serves the homepage, `robots.txt`, `sitemap.xml`, and content pages successfully.
- About, Privacy, and Contact pages are available.
- The site contains useful, accurate, source-backed content rather than placeholder copy.
- The AdSense publisher ID and all four numeric ad slot IDs are configured in the production environment.
- `/ads.txt` returns the configured publisher record.
- The site shows as `Ready` in the AdSense Sites page.

Do not repeatedly remove and resubmit a site while it is under review. Diagnose accessibility and connection problems first.
