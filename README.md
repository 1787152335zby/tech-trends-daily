# TechTrends Daily

Fully automated English-language SEO content site. Generates 176+ structured articles daily from trending GitHub repos, NPM packages, and Hacker News — deploys to Vercel for passive AdSense revenue.

## How It Works

1. **Fetch** — GitHub Actions runs data collection every 6 hours (GitHub API, NPM Registry, HN API)
2. **Generate** — Template engine produces SEO-optimized articles across 9 categories, 5 article types
3. **Build** — Next.js static export generates ~189 HTML pages
4. **Deploy** — Automatic push to Vercel CDN
5. **Earn** — AdSense ads throughout. Paid in RMB via Western Union to Chinese bank accounts.

## Quick Start

### 1. Register Google AdSense
Go to https://adsense.google.com/, create account, get publisher ID (format: ca-pub-XXXXXXXXXXXXXXXX).  
Set in .env.local: NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX

### 2. Deploy to Vercel
Connect GitHub repo to Vercel, or: npm i -g vercel && vercel --prod

### 3. GitHub Actions Secrets (for auto pipeline)
Settings -> Secrets and variables -> Actions: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID

### 4. Manual Commands
npm run fetch-all    # Fetch trending data from all sources
npm run generate     # Generate articles from data
npm run pipeline     # Full pipeline: fetch -> generate -> build
npm run build        # Next.js static export

## Monetization

Traffic -> AdSense Impressions -> CPM Revenue ($5-15 per 1k views) -> Western Union -> Chinese Bank -> RMB

## Timeline
- Day 1: 176 articles live
- Weeks 1-4: Google indexing
- Months 1-3: 10-100 daily visitors
- Month 1-2: Apply for AdSense review
- Months 3-6: 500-5,000 daily visitors as SEO compounds

## Free Tier Viability
Vercel: 100GB bandwidth/mo (~30k daily visitors)  
GitHub Actions: 2,000 min/mo (6 builds/day * ~10 min = 1,800 min)  
GitHub API: 60 req/hr unauthenticated (well within limits)
