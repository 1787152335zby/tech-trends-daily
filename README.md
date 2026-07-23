# TechTrends Daily

English-language Next.js SEO content site built from public GitHub, NPM, and Hacker News data. The repository keeps a rolling index of up to 2,000 articles and pre-renders the site for Vercel.

## Pipeline

The scheduled GitHub Actions workflow runs every six hours:

1. Fetch public source data.
2. Generate or refresh articles.
3. Validate the article index and referenced JSON files.
4. Build the Next.js site.
5. Generate the sitemap.
6. Commit updated content and data.

Vercel deployment is separate from this workflow. A successful build does not guarantee that the production URL is public or correctly assigned.

## Local setup

```bash
npm ci
copy .env.example .env.local
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

## Commands

```bash
npm run dev              # Start the development server
npm run lint             # Run ESLint
npm run validate-content # Validate the rolling article index
npm run build            # Create the production Next.js build
npm run fetch-all        # Fetch all external data sources
npm run generate         # Generate articles from existing data
npm run pipeline         # Fetch, generate, validate, and build
```

`fetch-all` and `pipeline` access external APIs and rewrite files under `data/` and `content/`.

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
