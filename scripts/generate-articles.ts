/**
 * Canonical content generation engine.
 *
 * One sourceData.id maps to one stable URL. Re-running the generator updates
 * that source's data snapshot instead of publishing another dated article.
 */

import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import {
  RepoData,
  Article,
  ArticleEditorial,
  ArticleEvidence,
  CATEGORY_LABELS,
} from "../src/lib/types";
import { DATA_DIR, CONTENT_DIR } from "../src/lib/constants";
import {
  collectEvidencePacks,
  type EvidencePack,
} from "./lib/evidence";
import {
  createEditorialDraft,
  type EditorialDraft,
} from "./lib/ai-editor";
import { loadContentPolicy } from "./lib/content-policy";

export interface BuildArticleOptions {
  publishedAt?: string;
  updatedAt?: string;
  relatedSlugs?: string[];
  evidencePack?: EvidencePack;
  editorialDraft?: EditorialDraft;
  indexable?: boolean;
}

function slugify(text: string, maxLen = 54): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, maxLen)
    .replace(/-$/g, "");
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.max(0, Math.round(value)));
}

function excerpt(text: string, maxLen: number): string {
  const normalized = text
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= maxLen) {
    return normalized.replace(/[\s.,;:!?]+$/g, "");
  }

  const clipped = normalized.slice(0, maxLen + 1);
  const lastWordBoundary = clipped.lastIndexOf(" ");
  const safeCut = lastWordBoundary >= Math.floor(maxLen * 0.65)
    ? clipped.slice(0, lastWordBoundary)
    : normalized.slice(0, maxLen);

  return `${safeCut.replace(/[\s.,;:!?]+$/g, "")}…`;
}

function sourceName(repo: RepoData): string {
  if (repo.source === "npm") return "NPM package";
  if (repo.source === "hackernews") return "Hacker News story";
  return "GitHub project";
}

function sourceMetric(repo: RepoData): string {
  if (repo.source === "npm") {
    return `${formatNumber(repo.starsGrowth)} downloads in the recorded weekly NPM window`;
  }
  if (repo.source === "hackernews") {
    return `${formatNumber(repo.starsGrowth)} Hacker News points at collection time`;
  }
  return `${formatNumber(repo.starsGrowth)} new GitHub stars in the recorded weekly window`;
}

function sourceIdentity(repo: RepoData): string {
  if (repo.source === "github") return repo.fullName || repo.name;
  if (repo.source === "npm") return repo.name;
  return `${repo.name} (${repo.id})`;
}

export function canonicalArticleSlug(repo: RepoData): string {
  const base = slugify(repo.id) || slugify(repo.fullName) || slugify(repo.name) || "source";
  const hash = createHash("sha256")
    .update(repo.id)
    .digest("hex")
    .slice(0, 8);
  return `snapshot-${base}-${hash}`;
}

export function canonicalArticleTitle(repo: RepoData): string {
  const identity = sourceIdentity(repo);
  if (repo.source === "npm") return `${identity} — NPM Package Data Snapshot`;
  if (repo.source === "hackernews") return `${identity} — Hacker News Data Snapshot`;
  return `${identity} — GitHub Project Data Snapshot`;
}

function generateDataNote(repo: RepoData, updatedAt: string): string {
  return `
<p><em>Data note:</em> This automated snapshot was updated on ${updatedAt} from public ${sourceName(repo)} metadata. Metrics can change after collection. No independent product testing or endorsement is claimed.</p>
  `.trim();
}

function generateSummary(repo: RepoData): string {
  const summary = excerpt(repo.description, 360);
  const description = summary
    ? escapeHtml(summary)
    : `No description was supplied by the public ${sourceName(repo)} source`;

  return `
<h2>Snapshot Summary</h2>
<p><strong>${escapeHtml(repo.name)}</strong> is listed in our <em>${escapeHtml(CATEGORY_LABELS[repo.category])}</em> feed. The source describes it as: ${description}.</p>
<p>The principal source-specific signal in this snapshot is <strong>${escapeHtml(sourceMetric(repo))}</strong>.</p>
  `.trim();
}

function generateMetrics(repo: RepoData): string {
  if (repo.source === "npm") {
    const linkedRepositoryMetrics = repo.stars > 0
      ? `
  <div class="stat"><span class="stat-value">⭐ ${formatNumber(repo.stars)}</span><span class="stat-label">Linked GitHub Stars (total)</span></div>
  <div class="stat"><span class="stat-value">🔀 ${formatNumber(repo.forks)}</span><span class="stat-label">Linked GitHub Forks (total)</span></div>`
      : "";
    return `
<h2>At a glance</h2>
<div class="stats-box">
  <div class="stat"><span class="stat-value">📦 ${formatNumber(repo.starsGrowth)}</span><span class="stat-label">Weekly NPM Downloads</span></div>
  <div class="stat"><span class="stat-value">NPM</span><span class="stat-label">Package Registry</span></div>${linkedRepositoryMetrics}
</div>
<p>Weekly downloads measure registry requests, including automated installs. They are not GitHub star growth and do not represent unique users.</p>
    `.trim();
  }

  if (repo.source === "hackernews") {
    return `
<h2>At a glance</h2>
<div class="stats-box">
  <div class="stat"><span class="stat-value">▲ ${formatNumber(repo.starsGrowth)}</span><span class="stat-label">Hacker News Points</span></div>
</div>
<p>Hacker News points are a time-specific attention signal, not a software adoption metric.</p>
    `.trim();
  }

  return `
<h2>At a glance</h2>
<div class="stats-box">
  <div class="stat"><span class="stat-value">⭐ ${formatNumber(repo.stars)}</span><span class="stat-label">GitHub Stars (total)</span></div>
  <div class="stat"><span class="stat-value">📈 +${formatNumber(repo.starsGrowth)}</span><span class="stat-label">New GitHub Stars (weekly window)</span></div>
  <div class="stat"><span class="stat-value">🔀 ${formatNumber(repo.forks)}</span><span class="stat-label">GitHub Forks (total)</span></div>
  <div class="stat"><span class="stat-value">⚠️ ${formatNumber(repo.openIssues)}</span><span class="stat-label">Open GitHub Issues</span></div>
</div>
<p>Stars and forks are repository interest signals. They do not by themselves establish quality, security, or suitability.</p>
  `.trim();
}

function generateMetadata(repo: RepoData): string {
  const items: string[] = [];
  if (repo.language && repo.language !== "Unknown") {
    items.push(`<li>Language or ecosystem: <strong>${escapeHtml(repo.language)}</strong></li>`);
  }
  if (repo.license && repo.license !== "N/A") {
    items.push(`<li>Reported license: <strong>${escapeHtml(repo.license)}</strong></li>`);
  }
  if (repo.topics.length > 0) {
    items.push(`<li>Source topics: ${repo.topics.slice(0, 8).map(escapeHtml).join(", ")}</li>`);
  }
  items.push(`<li>Primary source: <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(repo.url)}</a></li>`);
  if (repo.homepage) {
    items.push(`<li>Homepage supplied by source: <a href="${escapeHtml(repo.homepage)}" rel="nofollow noopener" target="_blank">${escapeHtml(repo.homepage)}</a></li>`);
  }

  return `
<h2>Source Metadata</h2>
<ul>
  ${items.join("\n  ")}
</ul>
  `.trim();
}

function validNpmPackageName(name: string): boolean {
  return /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name);
}

function githubCloneUrl(repo: RepoData): string | null {
  if (repo.source !== "github") return null;
  try {
    const parsed = new URL(repo.url);
    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "github.com") return null;
    const parts = parsed.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
    if (parts.length !== 2 || parts.some((part) => !/^[a-z0-9_.-]+$/i.test(part))) return null;
    return `https://github.com/${parts[0]}/${parts[1]}`;
  } catch {
    return null;
  }
}

function generateSourceActions(repo: RepoData): string {
  if (repo.source === "npm") {
    const command = validNpmPackageName(repo.name)
      ? `<div class="code-block"><code>npm install ${escapeHtml(repo.name)}</code></div>`
      : "";
    return `
<h2>Try it safely</h2>
${command}
<p>Use the <a href="${escapeHtml(repo.url)}" rel="nofollow noopener" target="_blank">official npm package page</a> to confirm the current version, documentation, dependencies, provenance, and compatibility requirements before installing it in an important project.</p>
    `.trim();
  }

  if (repo.source === "github") {
    const cloneUrl = githubCloneUrl(repo);
    const command = cloneUrl
      ? `<div class="code-block"><code>git clone ${escapeHtml(cloneUrl)}</code></div>`
      : "";
    return `
<h2>Start with the official repository</h2>
${command}
<p>Read the repository documentation, recent releases, issue tracker, security policy, and license before using the project. Try it in a disposable or non-production environment first.</p>
    `.trim();
  }

  return `
<h2>Read the original discussion</h2>
<p>Open the original source, look for primary evidence, and consider corrections or later developments. Community voting provides context but does not verify a story's claims.</p>
  `.trim();
}

function generateEvaluationChecklist(repo: RepoData): string {
  const metricWarning = repo.source === "npm"
    ? "Treat download volume as distribution activity, not unique users or GitHub growth."
    : repo.source === "hackernews"
      ? "Treat the recorded score as attention at collection time, not a product ranking."
      : "Treat star growth as an attention signal, not proof of technical quality.";

  return `
<h2>Evaluation Checklist</h2>
<ul>
  <li><strong>Confirm currency:</strong> Check the primary source for releases and documentation published after this snapshot.</li>
  <li><strong>Assess fit:</strong> Compare supported environments, maintenance activity, dependencies, and license terms with your requirements.</li>
  <li><strong>Interpret metrics carefully:</strong> ${metricWarning}</li>
  <li><strong>Validate important claims:</strong> Prefer primary documentation and reproducible evidence.</li>
</ul>
  `.trim();
}

function generateEditorialContent(draft: EditorialDraft): string {
  const sections = draft.sections.map((section) => {
    const paragraphs = section.paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
      .join("\n");
    const sources = Array.from(new Set(section.evidenceUrls))
      .map((url) => {
        const label = new URL(url).hostname.replace(/^www\./, "");
        return `<a href="${escapeHtml(url)}" rel="nofollow noopener" target="_blank">${escapeHtml(label)}</a>`;
      })
      .join(", ");
    return `
<h2>${escapeHtml(section.heading)}</h2>
${paragraphs}
${sources ? `<p><small>Evidence: ${sources}</small></p>` : ""}
    `.trim();
  });

  return `
<p class="article-dek"><strong>${escapeHtml(draft.dek)}</strong></p>
${sections.join("\n")}
  `.trim();
}

function generateEvidenceRecord(pack: EvidencePack): string {
  const displayValue = (value: string) => {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    const numeric = Number(value);
    if (Number.isFinite(numeric) && /^\d+(?:\.\d+)?$/.test(value)) {
      return formatNumber(numeric);
    }
    return value;
  };
  const evidenceItems = pack.evidence
    .map(
      (item) => `
  <li>
    <strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(displayValue(item.value))}
    — <a href="${escapeHtml(item.url)}" rel="nofollow noopener" target="_blank">official record</a>
  </li>`.trim(),
    )
    .join("\n  ");
  const warnings = pack.warnings
    .map((warning) =>
      warning.replace(
        /\bhands-on test\b/gi,
        "practical product evaluation",
      ),
    )
    .map((warning) => `<li>${escapeHtml(warning)}</li>`)
    .join("\n  ");

  return `
<h2>Sources and methodology</h2>
<p>This guide uses public records collected on ${escapeHtml(pack.fetchedAt.slice(0, 10))}. The ${pack.score}/100 score below measures evidence completeness, not whether the project is good or suitable for you.</p>
<details class="evidence-details">
<summary>View the supporting source data</summary>
<ul>
  ${evidenceItems}
</ul>
${warnings ? `<h3>Evidence limitations</h3>\n<ul>\n  ${warnings}\n</ul>` : ""}
</details>
  `.trim();
}

function articleEvidence(pack: EvidencePack): ArticleEvidence {
  return {
    sourceId: pack.sourceId,
    fetchedAt: pack.fetchedAt,
    score: pack.score,
    officialUrls: pack.officialUrls,
    items: pack.evidence,
    warnings: pack.warnings,
  };
}

function articleEditorial(draft: EditorialDraft): ArticleEditorial {
  return {
    mode: draft.mode,
    qualityScore: draft.qualityScore,
    claims: draft.claims,
    review: draft.review,
    generatedAt: draft.generatedAt,
  };
}

/**
 * Pure canonical article builder used by both scheduled generation and historical
 * migration. It performs no filesystem or network I/O.
 */
export function buildArticle(repo: RepoData, options: BuildArticleOptions = {}): Article {
  const updatedAt = options.updatedAt ?? todayUtc();
  const publishedAt = options.publishedAt ?? updatedAt;
  const evidencePack = options.evidencePack;
  const editorialDraft = options.editorialDraft;
  if (Boolean(evidencePack) !== Boolean(editorialDraft)) {
    throw new Error("Evidence-driven articles require both an evidence pack and editorial draft.");
  }
  const descriptionText = excerpt(repo.description, 125);
  const description = editorialDraft?.description
    ?? `${repo.name} ${sourceName(repo)} data snapshot: ${sourceMetric(repo)}.${descriptionText ? ` ${descriptionText}.` : ""}`;

  const article: Article = {
    slug: canonicalArticleSlug(repo),
    title: editorialDraft?.title ?? canonicalArticleTitle(repo),
    description,
    category: repo.category,
    type: "trend",
    publishedAt,
    updatedAt,
    sourceData: repo,
    relatedSlugs: options.relatedSlugs ?? [],
    tags: repo.topics.slice(0, 8),
    bodyHtml: [
      editorialDraft ? generateEditorialContent(editorialDraft) : generateSummary(repo),
      generateMetrics(repo),
      generateSourceActions(repo),
      evidencePack ? generateEvidenceRecord(evidencePack) : generateMetadata(repo),
      editorialDraft ? "" : generateEvaluationChecklist(repo),
      generateDataNote(repo, updatedAt),
    ].filter(Boolean).join("\n"),
  };

  if (evidencePack && editorialDraft) {
    article.evidence = articleEvidence(evidencePack);
    article.editorial = articleEditorial(editorialDraft);
    article.indexable = options.indexable ?? false;
  }
  return article;
}

function validDateOnly(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function sourceQualityScore(repo: RepoData): number {
  let score = 0;
  if (repo.id.trim() && repo.name.trim() && repo.fullName.trim()) score += 3;
  if (excerpt(repo.description, 40).length >= 40) score += 3;
  else if (repo.description.trim()) score += 1;
  if (repo.starsGrowth > 0) score += 2;
  if (repo.language && repo.language !== "Unknown") score += 1;
  if (repo.license && repo.license !== "N/A") score += 1;
  if (repo.homepage) score += 1;
  if (repo.topics.length > 0) score += 1;
  if (repo.source === "github" && githubCloneUrl(repo)) score += 2;
  if (repo.source === "npm" && validNpmPackageName(repo.name)) score += 2;
  return score;
}

function sourceIsEligible(repo: RepoData): boolean {
  if (!repo.id.trim() || !repo.name.trim() || !repo.fullName.trim()) return false;
  // A missing feed description is recoverable from the official evidence
  // collector. Numeric anomalies are not safe to publish as source metrics.
  if (!Number.isFinite(repo.starsGrowth) || repo.starsGrowth < 0) return false;
  try {
    const parsed = new URL(repo.url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
  } catch {
    return false;
  }
  if (repo.source === "github" && !githubCloneUrl(repo)) return false;
  if (repo.source === "npm" && !validNpmPackageName(repo.name)) return false;
  return true;
}

function earliestPublishedAt(articles: Article[], fallback: string): string {
  return articles
    .map((article) => article.publishedAt)
    .filter(validDateOnly)
    .sort()[0] ?? fallback;
}

/**
 * Preserve representation for every category present in the ranked candidates,
 * then fill remaining slots in the original ranking order. Callers should put
 * current sources before historical sources when constructing `rankedCandidates`.
 */
export function selectCategoryBalancedArticles(
  rankedCandidates: Article[],
  maxArticles = 300,
  perCategoryReserve = 12,
): Article[] {
  const uniqueCandidates: Article[] = [];
  const seenSourceIds = new Set<string>();
  for (const article of rankedCandidates) {
    if (seenSourceIds.has(article.sourceData.id)) continue;
    seenSourceIds.add(article.sourceData.id);
    uniqueCandidates.push(article);
  }

  const selected: Article[] = [];
  const selectedSourceIds = new Set<string>();
  const categories = Array.from(new Set(uniqueCandidates.map((article) => article.category)));

  for (const category of categories) {
    const categoryCandidates = uniqueCandidates
      .filter((article) => article.category === category)
      .slice(0, Math.max(0, perCategoryReserve));
    for (const article of categoryCandidates) {
      if (selected.length >= maxArticles) return selected;
      selected.push(article);
      selectedSourceIds.add(article.sourceData.id);
    }
  }

  for (const article of uniqueCandidates) {
    if (selected.length >= maxArticles) break;
    if (selectedSourceIds.has(article.sourceData.id)) continue;
    selected.push(article);
    selectedSourceIds.add(article.sourceData.id);
  }
  return selected;
}

function draftPassesPolicy(
  evidencePack: EvidencePack,
  draft: EditorialDraft,
  policy: ReturnType<typeof loadContentPolicy>,
): boolean {
  if (evidencePack.score < policy.minEvidenceScore) return false;
  if (draft.qualityScore < policy.minEditorialScore) return false;
  if (draft.review.status === "rejected") return false;
  return draft.mode !== "ai" || draft.review.status === "passed";
}

function rankedEvidenceScore(repo: RepoData, pack: EvidencePack): number {
  return pack.score * 100 + sourceQualityScore(repo);
}

function storedEvidencePack(article: Article): EvidencePack | null {
  if (!article.evidence) return null;
  return {
    sourceId: article.evidence.sourceId,
    source: article.sourceData.source,
    fetchedAt: article.evidence.fetchedAt,
    summary:
      article.sourceData.description.trim()
      || article.description
      || `${article.sourceData.name} official source guide.`,
    officialUrls: article.evidence.officialUrls,
    evidence: article.evidence.items,
    score: article.evidence.score,
    warnings: article.evidence.warnings,
  };
}

function articlePassesPolicy(
  article: Article,
  policy: ReturnType<typeof loadContentPolicy>,
): boolean {
  if (!article.evidence || !article.editorial) return false;
  if (article.evidence.score < policy.minEvidenceScore) return false;
  if (article.editorial.qualityScore < policy.minEditorialScore) return false;
  if (article.editorial.review.status === "rejected") return false;
  return article.editorial.mode !== "ai"
    || article.editorial.review.status === "passed";
}

export async function generateAll(): Promise<void> {
  const dataPath = path.join(DATA_DIR, "all-trending.json");
  if (!fs.existsSync(dataPath)) {
    throw new Error(`Data file not found: ${dataPath}. Run fetch-all first.`);
  }

  const inputRepos: RepoData[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  const duplicateInputIds = inputRepos
    .map((repo) => repo.id)
    .filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicateInputIds.length > 0) {
    throw new Error(`Input contains duplicate source IDs: ${Array.from(new Set(duplicateInputIds)).join(", ")}`);
  }
  const repos = inputRepos.filter(sourceIsEligible);
  if (repos.length !== inputRepos.length) {
    console.warn(`Skipped ${inputRepos.length - repos.length} sources with incomplete or invalid core metadata.`);
  }

  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const indexPath = path.join(CONTENT_DIR, "index.json");
  let existing: Article[] = [];
  if (fs.existsSync(indexPath)) {
    const parsed: unknown = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    if (!Array.isArray(parsed)) throw new Error("content/index.json must contain an array");
    existing = parsed as Article[];
  }

  const policy = loadContentPolicy();
  const existingBySourceId = new Map(
    existing.map((article) => [article.sourceData.id, article]),
  );
  console.log(`Collecting official evidence for ${repos.length} eligible sources...`);
  const evidencePacks = await collectEvidencePacks(repos, {
    onProgress: (completed, total) => {
      if (completed === total || completed % 25 === 0) {
        console.log(`Evidence progress: ${completed}/${total}`);
      }
    },
  });
  const evidenceBySourceId = new Map(
    evidencePacks.map((pack) => [pack.sourceId, pack]),
  );
  for (const article of existing) {
    const stored = storedEvidencePack(article);
    const fresh = evidenceBySourceId.get(article.sourceData.id);
    if (stored && (!fresh || stored.score > fresh.score)) {
      evidenceBySourceId.set(article.sourceData.id, stored);
    }
  }

  const today = todayUtc();
  const currentExistingRepos = repos.filter((repo) =>
    existingBySourceId.has(repo.id),
  );
  const newCandidates = repos
    .filter((repo) => !existingBySourceId.has(repo.id))
    .sort((left, right) => {
      const leftPack = evidenceBySourceId.get(left.id);
      const rightPack = evidenceBySourceId.get(right.id);
      return (
        rankedEvidenceScore(right, rightPack as EvidencePack)
        - rankedEvidenceScore(left, leftPack as EvidencePack)
      );
    });

  const deterministicEnv = {
    ...process.env,
    AI_EDITORIAL_ENABLED: "false",
  };
  const refreshedCurrent: Article[] = [];
  let existingHeldForQuality = 0;
  for (const repo of currentExistingRepos) {
    const prior = existingBySourceId.get(repo.id) as Article;
    const pack = evidenceBySourceId.get(repo.id) as EvidencePack;
    const result = await createEditorialDraft(repo, pack, {
      env: deterministicEnv,
    });
    if (!draftPassesPolicy(pack, result.draft, policy)) {
      refreshedCurrent.push(prior);
      existingHeldForQuality += 1;
      continue;
    }
    refreshedCurrent.push(
      buildArticle(repo, {
        publishedAt: earliestPublishedAt([prior], today),
        updatedAt: today,
        evidencePack: pack,
        editorialDraft: result.draft,
        indexable: true,
      }),
    );
  }

  const admittedNew: Article[] = [];
  let rejectedByEvidence = 0;
  let rejectedByEditorial = 0;
  for (const repo of newCandidates) {
    if (admittedNew.length >= policy.dailyNewArticleLimit) break;
    const pack = evidenceBySourceId.get(repo.id) as EvidencePack;
    if (pack.score < policy.minEvidenceScore) {
      rejectedByEvidence += 1;
      continue;
    }
    const result = await createEditorialDraft(repo, pack);
    if (!draftPassesPolicy(pack, result.draft, policy)) {
      rejectedByEditorial += 1;
      continue;
    }
    admittedNew.push(
      buildArticle(repo, {
        publishedAt: today,
        updatedAt: today,
        evidencePack: pack,
        editorialDraft: result.draft,
        indexable: true,
      }),
    );
  }

  const currentKeys = new Set(repos.map((repo) => repo.id));
  const untouched = existing.filter(
    (article) => !currentKeys.has(article.sourceData.id),
  );
  const currentArticles = [...refreshedCurrent, ...admittedNew];
  const mergedBySourceId = new Map<string, Article>();
  for (const article of [...untouched, ...currentArticles]) {
    mergedBySourceId.set(article.sourceData.id, article);
  }

  const rankedCurrent = [...currentArticles].sort(
    (left, right) =>
      (right.evidence?.score ?? 0) - (left.evidence?.score ?? 0)
      || sourceQualityScore(right.sourceData) - sourceQualityScore(left.sourceData),
  );
  const currentSlugs = new Set(rankedCurrent.map((article) => article.slug));
  const rankedHistorical = Array.from(mergedBySourceId.values())
    .filter((article) => !currentSlugs.has(article.slug))
    .sort((left, right) => (
      sourceQualityScore(right.sourceData) - sourceQualityScore(left.sourceData)
      || right.updatedAt.localeCompare(left.updatedAt)
    ));
  const selected = selectCategoryBalancedArticles(
    [...rankedCurrent, ...rankedHistorical],
    policy.maxIndexedArticles,
    12,
  );
  const selectedSlugs = new Set(selected.map((article) => article.slug));
  const selectedCurrent = currentArticles
    .filter((article) => selectedSlugs.has(article.slug))
    .map((article) => ({
      ...article,
      relatedSlugs: selected
        .filter(
          (candidate) =>
            candidate.category === article.category
            && candidate.slug !== article.slug
            && articlePassesPolicy(candidate, policy),
        )
        .slice(0, 4)
        .map((candidate) => candidate.slug),
    }));
  const selectedCurrentBySlug = new Map(
    selectedCurrent.map((article) => [article.slug, article]),
  );
  const selectedWithRelations = selected.map((article) => {
    const selectedArticle = selectedCurrentBySlug.get(article.slug) ?? article;
    return {
      ...selectedArticle,
      indexable: articlePassesPolicy(selectedArticle, policy),
    };
  });
  const merged = selectedWithRelations.sort((left, right) => (
    right.updatedAt.localeCompare(left.updatedAt)
    || left.title.localeCompare(right.title)
  ));

  for (const article of merged) {
    fs.writeFileSync(
      path.join(CONTENT_DIR, `${article.slug}.json`),
      JSON.stringify(article, null, 2),
    );
  }
  fs.writeFileSync(indexPath, JSON.stringify(merged, null, 2));
  const publishedNew = admittedNew.filter((article) =>
    selectedSlugs.has(article.slug),
  ).length;
  console.log(
    [
      `Generation complete: existing refreshed=${refreshedCurrent.length - existingHeldForQuality}`,
      `existing held=${existingHeldForQuality}`,
      `new published=${publishedNew}`,
      `rejected by evidence=${rejectedByEvidence}`,
      `rejected by editorial=${rejectedByEditorial}`,
      `daily limit=${policy.dailyNewArticleLimit}`,
      `indexable=${merged.filter((article) => article.indexable).length}`,
      `index size=${merged.length}`,
    ].join("; "),
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  generateAll().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
