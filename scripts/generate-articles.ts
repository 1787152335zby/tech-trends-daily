/**
 * Content generation engine.
 * Takes merged RepoData and produces structured HTML articles using templates.
 */

import fs from "fs";
import path from "path";
import { RepoData, Article, ArticleType, CATEGORY_LABELS } from "../src/lib/types";
import { DATA_DIR, CONTENT_DIR } from "../src/lib/constants";

// ----- Template helpers -----

function slugify(text: string, maxLen = 60): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, maxLen)
    .replace(/-$/g, "");
}

function dateStr(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(n: number): string {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)}B`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function sourceLabel(repo: RepoData): string {
  if (repo.source === "npm") return "NPM package";
  if (repo.source === "hackernews") return "Hacker News story";
  return "GitHub project";
}

function metricSummary(repo: RepoData): string {
  if (repo.source === "npm") {
    return `${formatNumber(repo.starsGrowth)} weekly downloads`;
  }
  if (repo.source === "hackernews") {
    return `${formatNumber(repo.starsGrowth)} Hacker News points`;
  }
  return `${formatNumber(repo.starsGrowth)} new stars this week`;
}

function descriptionExcerpt(text: string, maxLen: number): string {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLen).replace(/[\s.,;:!?]+$/g, "");
}

// ----- Article type selector -----

function pickArticleType(repo: RepoData): ArticleType {
  const types: ArticleType[] = ["review", "vs", "howto", "bestof", "trend"];
  // Hash-based deterministic selection
  const hash = repo.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return types[hash % types.length];
}

// ----- Section generators -----

function generateIntro(repo: RepoData): string {
  const category = CATEGORY_LABELS[repo.category];
  if (repo.source === "npm") {
    const githubContext = repo.stars > 0
      ? ` Its linked GitHub project has ${formatNumber(repo.stars)} stars.`
      : "";
    const summary = descriptionExcerpt(
      repo.description || "It provides tooling for JavaScript and TypeScript developers.",
      300,
    );
    return `
<p><strong>${escapeHtml(repo.name)}</strong> is an NPM package drawing attention in the <em>${category}</em> ecosystem, with <strong>${formatNumber(repo.starsGrowth)} weekly downloads</strong>. ${escapeHtml(summary)}.${githubContext}</p>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<p><strong>${escapeHtml(repo.name)}</strong> is a technology story gaining attention in the <em>${category}</em> community. It reached <strong>${formatNumber(repo.starsGrowth)} points on Hacker News</strong>, signaling active reader interest and discussion.</p>
    `.trim();
  }

  return `
<p><strong>${escapeHtml(repo.name)}</strong> is gaining attention in the <em>${category}</em> ecosystem, adding <strong>${formatNumber(repo.starsGrowth)} new stars this week</strong>. The GitHub project currently has ${formatNumber(repo.stars)} stars and ${formatNumber(repo.forks)} forks.</p>
  `.trim();
}

function generateStatsBox(repo: RepoData): string {
  if (repo.source === "npm") {
    const githubStats = repo.stars > 0
      ? `
  <div class="stat"><span class="stat-value">⭐ ${formatNumber(repo.stars)}</span><span class="stat-label">GitHub Stars</span></div>
  <div class="stat"><span class="stat-value">🔀 ${formatNumber(repo.forks)}</span><span class="stat-label">GitHub Forks</span></div>`
      : "";
    return `
<div class="stats-box">
  <div class="stat"><span class="stat-value">📦 ${formatNumber(repo.starsGrowth)}</span><span class="stat-label">Weekly Downloads</span></div>
  <div class="stat"><span class="stat-value">NPM</span><span class="stat-label">Package Registry</span></div>${githubStats}
</div>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<div class="stats-box">
  <div class="stat"><span class="stat-value">▲ ${formatNumber(repo.starsGrowth)}</span><span class="stat-label">Hacker News Points</span></div>
  <div class="stat"><span class="stat-value">${dateStr(repo.createdAt)}</span><span class="stat-label">Posted</span></div>
</div>
    `.trim();
  }

  return `
<div class="stats-box">
  <div class="stat"><span class="stat-value">⭐ ${formatNumber(repo.stars)}</span><span class="stat-label">Stars</span></div>
  <div class="stat"><span class="stat-value">📈 +${formatNumber(repo.starsGrowth)}</span><span class="stat-label">New Stars This Week</span></div>
  <div class="stat"><span class="stat-value">🔀 ${formatNumber(repo.forks)}</span><span class="stat-label">Forks</span></div>
  <div class="stat"><span class="stat-value">⚠️ ${formatNumber(repo.openIssues)}</span><span class="stat-label">Open Issues</span></div>
</div>
  `.trim();
}

function generateKeyFeatures(repo: RepoData): string {
  if (repo.source === "hackernews") {
    return `
<h2>Story at a Glance</h2>
<ul>
  <li>Topic: <strong>${escapeHtml(CATEGORY_LABELS[repo.category])}</strong></li>
  <li>Community signal: <strong>${formatNumber(repo.starsGrowth)} Hacker News points</strong></li>
  <li>Original source: <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">Read the linked story</a></li>
</ul>
    `.trim();
  }

  const features = repo.topics.slice(0, 5);
  const lang = repo.language !== "Unknown"
    ? `<li>Primary language or ecosystem: <strong>${escapeHtml(repo.language)}</strong></li>`
    : "";
  const home = repo.homepage ? `<li>Official website: <a href="${escapeHtml(repo.homepage)}" rel="nofollow noopener" target="_blank">${escapeHtml(repo.homepage)}</a></li>` : "";
  const topics = features.map((t) => `<li>🏷️ ${escapeHtml(t)}</li>`).join("\n");
  const license = repo.license && repo.license !== "N/A"
    ? `<li>Published under the <strong>${escapeHtml(repo.license)}</strong> license</li>`
    : "";

  return `
<h2>Key Features</h2>
<ul>
  ${lang}
  ${license}
  ${home}
  ${topics}
</ul>
  `.trim();
}

function generateQuickStart(repo: RepoData): string {
  if (repo.source === "npm") {
    return `
<h2>Quick Start</h2>
<p>Install <strong>${escapeHtml(repo.name)}</strong> from the NPM registry:</p>
<div class="code-block"><code>npm install ${escapeHtml(repo.name)}</code></div>
<p>Review package versions, documentation, and dependency details on the <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">official NPM package page</a>.</p>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<h2>Explore the Story</h2>
<p>Start with the <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">original article or project page</a>, then review the Hacker News discussion context before drawing conclusions or adopting any technology it covers.</p>
    `.trim();
  }

  return `
<h2>Quick Start</h2>
<p>Get started with <strong>${escapeHtml(repo.name)}</strong> in minutes:</p>
<div class="code-block"><code>
# Clone the repository
git clone ${escapeHtml(repo.url)}

# Navigate to project
cd ${escapeHtml(repo.name)}

# Check the README for detailed setup instructions
</code></div>
<p>For full documentation and advanced usage, visit the <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">official GitHub repository</a>.</p>
  `.trim();
}

function generateTrendAnalysis(repo: RepoData): string {
  const category = CATEGORY_LABELS[repo.category];
  if (repo.source === "npm") {
    return `
<h2>Why ${escapeHtml(repo.name)} Is Notable</h2>
<p><strong>${escapeHtml(repo.name)}</strong> recorded ${formatNumber(repo.starsGrowth)} downloads in the latest weekly NPM window. Download volume is a useful signal of ecosystem reach, although it includes automated installs and does not by itself measure week-over-week growth.</p>
<ol>
  <li><strong>Package usage:</strong> Weekly registry downloads show broad distribution across development and CI environments.</li>
  <li><strong>Practical focus:</strong> ${escapeHtml(repo.description || "The package addresses a common JavaScript or TypeScript workflow.")}</li>
  <li><strong>Evaluation:</strong> Check the current release notes, maintenance status, and compatibility requirements before adopting it.</li>
</ol>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<h2>Why This Story Is Trending</h2>
<p>The story reached ${formatNumber(repo.starsGrowth)} points on Hacker News, reflecting reader interest at the time it was collected. That score is a discussion signal, not a GitHub star count or a measure of software adoption.</p>
<ol>
  <li><strong>Community attention:</strong> Readers elevated the story through Hacker News voting.</li>
  <li><strong>Topical relevance:</strong> The subject connects to current conversations in ${escapeHtml(category)}.</li>
  <li><strong>Further reading:</strong> Review the original source and discussion critically for technical details and differing viewpoints.</li>
</ol>
    `.trim();
  }

  return `
<h2>Why ${escapeHtml(repo.name)} Is Trending</h2>
<p>The ${category} landscape is constantly evolving, and <strong>${escapeHtml(repo.name)}</strong> gained ${formatNumber(repo.starsGrowth)} GitHub stars in the latest weekly collection window. Several signals make it worth evaluating:</p>
<ol>
  <li><strong>Community interest:</strong> New stars indicate increased visibility among GitHub users.</li>
  <li><strong>Repository activity:</strong> Its latest recorded update was ${dateStr(repo.updatedAt)}.</li>
  <li><strong>Practical utility:</strong> ${escapeHtml(repo.description || "It solves a real problem that many developers face daily.")}</li>
</ol>
<p>If you're working in ${category}, review its documentation, release history, and issue tracker to decide whether it fits your needs.</p>
  `.trim();
}

function generateVSSection(repo: RepoData): string {
  if (repo.source === "npm") {
    const community = repo.stars > 0
      ? `<li><strong>Community:</strong> Its linked GitHub project has ${formatNumber(repo.stars)} stars; inspect recent issues and releases for current maintenance context.</li>`
      : `<li><strong>Community:</strong> Review release cadence, maintainers, and open issues before choosing the package.</li>`;
    return `
<h2>How It Compares to Alternatives</h2>
<p>Compare <strong>${escapeHtml(repo.name)}</strong> with packages that solve the same problem using criteria relevant to your own application:</p>
<ul>
  <li><strong>Compatibility:</strong> Confirm runtime, framework, and module-format support.</li>
  <li><strong>Usage signal:</strong> ${formatNumber(repo.starsGrowth)} weekly NPM downloads show distribution volume, not necessarily unique users.</li>
  ${community}
</ul>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<h2>How to Put the Story in Context</h2>
<p>Rather than treating a Hacker News score as a product ranking, compare the story's claims with primary documentation and other technical sources.</p>
<ul>
  <li><strong>Evidence:</strong> Separate measured results from opinions and projections.</li>
  <li><strong>Discussion:</strong> Use community comments to find counterexamples, not as a substitute for verification.</li>
  <li><strong>Relevance:</strong> Decide whether the constraints described in the story match your own environment.</li>
</ul>
    `.trim();
  }

  return `
<h2>How It Compares to Alternatives</h2>
<p>When evaluating <strong>${escapeHtml(repo.name)}</strong>, it's natural to compare it against established alternatives. Here's what sets it apart:</p>
<ul>
  <li><strong>Technical fit:</strong> Review its ${escapeHtml(repo.language)} implementation and supported environments.</li>
  <li><strong>Community size:</strong> ${formatNumber(repo.stars)} GitHub stars provide a visibility signal, but should not replace technical evaluation.</li>
  <li><strong>License:</strong> Review the ${escapeHtml(repo.license)} license terms for your intended use.</li>
</ul>
  `.trim();
}

function generateHowToSection(repo: RepoData): string {
  if (repo.source === "hackernews") {
    return `
<h2>Questions to Consider</h2>
<ol>
  <li><strong>Source:</strong> Does the original story link to primary evidence or reproducible examples?</li>
  <li><strong>Scope:</strong> Which users, systems, or constraints do its conclusions apply to?</li>
  <li><strong>Follow-up:</strong> Have corrections, responses, or newer developments changed the picture?</li>
</ol>
    `.trim();
  }

  return `
<h2>Practical Use Cases</h2>
<p>Here are some common scenarios where <strong>${escapeHtml(repo.name)}</strong> shines:</p>
<ol>
  <li><strong>New projects:</strong> Start your next ${escapeHtml(repo.language)} project with this tool as a foundation</li>
  <li><strong>Migration:</strong> Consider switching if your current solution is slowing you down</li>
  <li><strong>Learning:</strong> Study the source code to understand modern ${escapeHtml(CATEGORY_LABELS[repo.category])} patterns</li>
</ol>
  `.trim();
}

function generateConclusion(repo: RepoData): string {
  if (repo.source === "npm") {
    return `
<h2>Final Thoughts</h2>
<p><strong>${escapeHtml(repo.name)}</strong> has meaningful distribution across the NPM ecosystem. Before adding it to a production project, review its current documentation, release history, dependency footprint, and compatibility with your stack.</p>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<h2>Final Thoughts</h2>
<p><strong>${escapeHtml(repo.name)}</strong> attracted notable Hacker News attention. Read the original source, verify important claims, and use the community discussion as additional context rather than as a final verdict.</p>
    `.trim();
  }

  return `
<h2>Final Thoughts</h2>
<p><strong>${escapeHtml(repo.name)}</strong> is a GitHub project worth evaluating. Review its documentation, recent releases, issue tracker, and license, then try it in a low-risk environment to see whether it fits your workflow.</p>
  `.trim();
}

// ----- Full article builder -----

function buildArticle(repo: RepoData, relatedSlugs: string[]): Article {
  const articleType = pickArticleType(repo);
  const today = new Date().toISOString().split("T")[0];
  const slug = `${slugify(repo.name)}-${articleType}-${today}`;

  const subject = sourceLabel(repo);
  const titleTemplates: Record<ArticleType, string> = {
    review: `${repo.name}: A Closer Look at This Trending ${subject}`,
    vs: repo.source === "hackernews"
      ? `${repo.name}: Context, Claims, and What to Verify`
      : `${repo.name} vs Alternatives: What ${CATEGORY_LABELS[repo.category]} Developers Should Compare`,
    howto: repo.source === "hackernews"
      ? `Understanding ${repo.name}: A Practical Reading Guide`
      : `Getting Started with ${repo.name} — A Practical Guide for ${CATEGORY_LABELS[repo.category]} Developers`,
    bestof: repo.source === "hackernews"
      ? `Why ${repo.name} Is Getting Attention`
      : `Why ${repo.name} Stands Out Among ${CATEGORY_LABELS[repo.category]} Tools in 2026`,
    trend: repo.source === "hackernews"
      ? `${repo.name} Is Trending on Hacker News: What to Know`
      : `${repo.name} Is Trending: What ${CATEGORY_LABELS[repo.category]} Developers Need to Know`,
  };

  const excerpt = descriptionExcerpt(repo.description, 120) || `A ${subject} in the ${CATEGORY_LABELS[repo.category]} ecosystem`;
  const descriptionTemplates: Record<ArticleType, string> = {
    review: `A closer look at ${repo.name}, a trending ${subject}. ${excerpt}. Current signal: ${metricSummary(repo)}.`,
    vs: `Put ${repo.name} in context and compare its fit, evidence, maintenance, and ecosystem signals with relevant alternatives.`,
    howto: repo.source === "hackernews"
      ? `A practical guide to reading the claims, evidence, and community context around ${repo.name}.`
      : `A practical guide to getting started with ${repo.name}, including setup and evaluation considerations for ${CATEGORY_LABELS[repo.category]}.`,
    bestof: `Discover why ${repo.name} is attracting attention in ${CATEGORY_LABELS[repo.category]}. ${excerpt}.`,
    trend: `${repo.name} is trending with ${metricSummary(repo)}. ${excerpt}.`,
  };

  const title = titleTemplates[articleType];
  const description = descriptionTemplates[articleType];

  // Build body sections
  const sections: string[] = [
    generateIntro(repo),
    generateStatsBox(repo),
    generateKeyFeatures(repo),
    generateTrendAnalysis(repo),
  ];

  // Add type-specific section
  switch (articleType) {
    case "vs":
      sections.push(generateVSSection(repo));
      break;
    case "howto":
      sections.push(generateHowToSection(repo));
      sections.push(generateQuickStart(repo));
      break;
    case "review":
      sections.push(generateVSSection(repo));
      sections.push(generateQuickStart(repo));
      break;
    case "bestof":
      sections.push(generateHowToSection(repo));
      break;
    case "trend":
      sections.push(generateQuickStart(repo));
      break;
  }

  sections.push(generateConclusion(repo));

  const bodyHtml = sections.join("\n");

  return {
    slug,
    title,
    description,
    category: repo.category,
    type: articleType,
    publishedAt: today,
    updatedAt: today,
    sourceData: repo,
    relatedSlugs,
    tags: repo.topics.slice(0, 8),
    bodyHtml,
  };
}

// ----- Main -----

function generateAll(): void {
  const dataPath = path.join(DATA_DIR, "all-trending.json");
  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found: ${dataPath}. Run fetch-all first.`);
    process.exit(1);
  }

  const repos: RepoData[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  console.log(`Loaded ${repos.length} repos for article generation`);

  // Ensure content directory exists
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  // Generate articles
  const articles: Article[] = repos.map((repo) => {
    const related = repos
      .filter((r) => r.category === repo.category && r.id !== repo.id)
      .slice(0, 4)
      .map((r) => slugify(r.name));
    return buildArticle(repo, related);
  });

  // Write each article file
  for (const article of articles) {
    const fp = path.join(CONTENT_DIR, `${article.slug}.json`);
    fs.writeFileSync(fp, JSON.stringify(article, null, 2));
  }

  // Merge with existing index so historical articles (and their URLs) persist.
  const indexPath = path.join(CONTENT_DIR, "index.json");
  let existing: Article[] = [];
  if (fs.existsSync(indexPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    } catch {
      existing = [];
    }
  }

  const bySlug = new Map<string, Article>();
  for (const a of existing) bySlug.set(a.slug, a);
  for (const a of articles) bySlug.set(a.slug, a);

  const MAX_ARTICLES = 2000;
  const merged = Array.from(bySlug.values())
    .sort((x, y) => (y.publishedAt > x.publishedAt ? 1 : y.publishedAt < x.publishedAt ? -1 : 0))
    .slice(0, MAX_ARTICLES);

  fs.writeFileSync(indexPath, JSON.stringify(merged, null, 2));

  console.log(`Generated ${articles.length} new articles; index now has ${merged.length} total`);

  // Backfill star/fork/issue data from newest entries to older entries for the same package.
  const byPackageId = new Map<string, { stars: number; forks: number; openIssues: number }>();
  for (const a of merged) {
    if (a.sourceData.stars > 0) {
      byPackageId.set(a.sourceData.id, { stars: a.sourceData.stars, forks: a.sourceData.forks, openIssues: a.sourceData.openIssues });
    }
  }
  let enriched = 0;
  for (const a of merged) {
    if (a.sourceData.stars === 0) {
      const latest = byPackageId.get(a.sourceData.id);
      if (latest) {
        a.sourceData.stars = latest.stars;
        a.sourceData.forks = latest.forks;
        a.sourceData.openIssues = latest.openIssues;
        fs.writeFileSync(path.join(CONTENT_DIR, `${a.slug}.json`), JSON.stringify(a, null, 2));
        enriched++;
      }
    }
  }
  if (enriched > 0) {
    fs.writeFileSync(indexPath, JSON.stringify(merged, null, 2));
    console.log(`Backfilled ${enriched} older articles with up-to-date star data`);
  }
}

generateAll();
