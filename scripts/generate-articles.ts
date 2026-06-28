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
    .slice(0, maxLen);
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
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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
  return `
<p><strong>${escapeHtml(repo.name)}</strong> is making waves in the <em>${category}</em> ecosystem this week, gaining <strong>${formatNumber(repo.starsGrowth)} new stars</strong>. With a total of ${formatNumber(repo.stars)} stars on GitHub and ${formatNumber(repo.forks)} forks, this open-source project is rapidly becoming a go-to tool for developers worldwide.</p>
  `.trim();
}

function generateStatsBox(repo: RepoData): string {
  return `
<div class="stats-box">
  <div class="stat"><span class="stat-value">⭐ ${formatNumber(repo.stars)}</span><span class="stat-label">Stars</span></div>
  <div class="stat"><span class="stat-value">📈 +${formatNumber(repo.starsGrowth)}/wk</span><span class="stat-label">Growth</span></div>
  <div class="stat"><span class="stat-value">🔀 ${formatNumber(repo.forks)}</span><span class="stat-label">Forks</span></div>
  <div class="stat"><span class="stat-value">⚠️ ${formatNumber(repo.openIssues)}</span><span class="stat-label">Open Issues</span></div>
</div>
  `.trim();
}

function generateKeyFeatures(repo: RepoData): string {
  const features = repo.topics.slice(0, 5);
  const lang = repo.language !== "Unknown" ? `<li>Written in <strong>${escapeHtml(repo.language)}</strong> for maximum performance</li>` : "";
  const home = repo.homepage ? `<li>Official website: <a href="${escapeHtml(repo.homepage)}" rel="nofollow noopener" target="_blank">${escapeHtml(repo.homepage)}</a></li>` : "";
  const topics = features.map((t) => `<li>🏷️ ${escapeHtml(t)}</li>`).join("\n");

  return `
<h2>Key Features</h2>
<ul>
  ${lang}
  <li>Licensed under <strong>${escapeHtml(repo.license)}</strong> — free to use and modify</li>
  ${home}
  ${topics}
</ul>
  `.trim();
}

function generateQuickStart(repo: RepoData): string {
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
  return `
<h2>Why ${escapeHtml(repo.name)} Is Trending</h2>
<p>The ${category} landscape is constantly evolving, and <strong>${escapeHtml(repo.name)}</strong> has emerged as one of the fastest-growing projects this week. Several factors contribute to its momentum:</p>
<ol>
  <li><strong>Growing community:</strong> With ${formatNumber(repo.starsGrowth)} new stars this week alone, developer adoption is accelerating rapidly.</li>
  <li><strong>Active maintenance:</strong> The project sees regular updates, ensuring compatibility with the latest ecosystem changes.</li>
  <li><strong>Practical utility:</strong> ${escapeHtml(repo.description || "It solves a real problem that many developers face daily.")}</li>
</ol>
<p>If you're working in ${category}, this is definitely a project worth watching — and adopting.</p>
  `.trim();
}

function generateVSSection(repo: RepoData): string {
  return `
<h2>How It Compares to Alternatives</h2>
<p>When evaluating <strong>${escapeHtml(repo.name)}</strong>, it's natural to compare it against established alternatives. Here's what sets it apart:</p>
<ul>
  <li><strong>Performance:</strong> Built with ${escapeHtml(repo.language)}, it leverages modern language features for speed.</li>
  <li><strong>Community size:</strong> ${formatNumber(repo.stars)} stars indicate strong community trust and validation.</li>
  <li><strong>License:</strong> ${escapeHtml(repo.license)} licensing means no commercial restrictions.</li>
</ul>
  `.trim();
}

function generateHowToSection(repo: RepoData): string {
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
  return `
<h2>Final Thoughts</h2>
<p><strong>${escapeHtml(repo.name)}</strong> is a solid addition to any developer's toolkit. With its growing community, active development, and practical design, it's well worth your time to evaluate. Star it on GitHub, try it in a side project, and see if it fits your workflow.</p>
<p class="disclosure"><em>Disclosure: This site may contain affiliate links. We may earn a commission if you make a purchase through these links, at no additional cost to you.</em></p>
  `.trim();
}

// ----- Ad placeholder -----

function generateAdUnit(): string {
  return `
<div class="ad-container">
  <ins class="adsbygoogle"
    style="display:block; text-align:center;"
    data-ad-layout="in-article"
    data-ad-format="fluid"
    data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
    data-ad-slot="1234567890"></ins>
</div>
  `.trim();
}

// ----- Full article builder -----

function buildArticle(repo: RepoData, relatedSlugs: string[]): Article {
  const articleType = pickArticleType(repo);
  const today = new Date().toISOString().split("T")[0];
  const slug = `${slugify(repo.name)}-${articleType}-${today}`;

  const titleTemplates: Record<ArticleType, string> = {
    review: `${repo.name}: A Deep Dive into This Week's Hottest ${CATEGORY_LABELS[repo.category]} Repo`,
    vs: `${repo.name} vs Alternatives: Which ${CATEGORY_LABELS[repo.category]} Tool Should You Choose?`,
    howto: `Getting Started with ${repo.name} — A Practical Guide for ${CATEGORY_LABELS[repo.category]} Developers`,
    bestof: `Why ${repo.name} Is One of the Best ${CATEGORY_LABELS[repo.category]} Tools in 2026`,
    trend: `${repo.name} Is Trending: Here's What ${CATEGORY_LABELS[repo.category]} Developers Need to Know`,
  };

  const descriptionTemplates: Record<ArticleType, string> = {
    review: `Comprehensive review of ${repo.name}. ${repo.description.slice(0, 120)}. Stars: ${formatNumber(repo.stars)}, Growth: +${formatNumber(repo.starsGrowth)}/week.`,
    vs: `Compare ${repo.name} with popular ${CATEGORY_LABELS[repo.category]} alternatives. See features, performance, and community stats.`,
    howto: `Step-by-step guide to getting started with ${repo.name}. Learn setup, configuration, and best practices for ${CATEGORY_LABELS[repo.category]}.`,
    bestof: `Discover why ${repo.name} ranks among the best ${CATEGORY_LABELS[repo.category]} tools. ${repo.description.slice(0, 100)}.`,
    trend: `${repo.name} is trending on GitHub with ${formatNumber(repo.starsGrowth)} new stars this week. ${repo.description.slice(0, 100)}.`,
  };

  const title = titleTemplates[articleType];
  const description = descriptionTemplates[articleType];

  // Build body sections
  const sections: string[] = [
    generateIntro(repo),
    generateStatsBox(repo),
    generateAdUnit(),
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

  sections.push(generateAdUnit());
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
  const articles: Article[] = repos.map((repo, idx) => {
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
}

generateAll();
