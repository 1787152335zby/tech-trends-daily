import type {
  Article,
  ArticleEvidenceItem,
  ArticlePreview,
  RepoData,
} from "./types";

export interface ArticleSignal {
  value: number;
  label: string;
  observedAt: string;
  kind: "downloads" | "stars" | "points";
}

function finiteEvidenceNumber(
  article: Article,
  label: string,
): { value: number; observedAt: string } | null {
  const item = article.evidence?.items.find(
    (candidate) => candidate.label.toLowerCase() === label.toLowerCase(),
  );
  if (!item) return null;
  const value = Number(item.value);
  if (!Number.isFinite(value) || value < 0) return null;
  return { value, observedAt: item.observedAt };
}

export function getEvidenceItem(
  article: Article,
  label: string,
): ArticleEvidenceItem | undefined {
  return article.evidence?.items.find(
    (candidate) => candidate.label.toLowerCase() === label.toLowerCase(),
  );
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function getPrimarySignal(article: Article): ArticleSignal | null {
  if (article.sourceData.source === "npm") {
    const metric = finiteEvidenceNumber(article, "Weekly downloads");
    return metric
      ? {
          ...metric,
          kind: "downloads",
          label: `${formatCompactNumber(metric.value)} weekly downloads`,
        }
      : null;
  }

  if (article.sourceData.source === "hackernews") {
    const metric = finiteEvidenceNumber(article, "Points at collection");
    return metric
      ? {
          ...metric,
          kind: "points",
          label: `${formatCompactNumber(metric.value)} discussion points`,
        }
      : null;
  }

  const metric = finiteEvidenceNumber(article, "GitHub stars");
  return metric
    ? {
        ...metric,
        kind: "stars",
        label: `${formatCompactNumber(metric.value)} GitHub stars`,
      }
    : null;
}

function evidenceDate(article: Article, labels: string[]): string | null {
  for (const label of labels) {
    const value = getEvidenceItem(article, label)?.value;
    if (value && Number.isFinite(Date.parse(value))) return value;
  }
  return null;
}

function freshnessScore(
  value: string | null,
  referenceTime: number,
  windowDays: number,
): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (referenceTime - timestamp) / 86_400_000);
  return Math.max(0, 1 - ageDays / windowDays);
}

function logarithmicScore(value: number, expectedMaximum: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(
    1,
    Math.log10(value + 1) / Math.log10(expectedMaximum + 1),
  );
}

export function getTrendScore(article: Article, referenceTime: number): number {
  const signal = getPrimarySignal(article);
  if (!signal) return 0;

  if (article.sourceData.source === "npm") {
    const releaseDate = evidenceDate(article, [
      "Latest version published",
      "Registry modified",
    ]);
    return (
      logarithmicScore(signal.value, 250_000_000) * 45 +
      freshnessScore(releaseDate, referenceTime, 180) * 55
    );
  }

  if (article.sourceData.source === "hackernews") {
    const published = evidenceDate(article, ["Published"]);
    return (
      logarithmicScore(signal.value, 1_000) * 55 +
      freshnessScore(published, referenceTime, 7) * 45
    );
  }

  const lastPush = evidenceDate(article, ["Last source push"]);
  const repositoryAge = freshnessScore(
    article.sourceData.createdAt,
    referenceTime,
    120,
  );
  return (
    logarithmicScore(signal.value, 100_000) * 35 +
    freshnessScore(lastPush, referenceTime, 45) * 35 +
    repositoryAge * 30
  );
}

export function evidenceCompletenessLabel(score: number | undefined): string {
  if (typeof score !== "number") return "Limited";
  if (score >= 85) return "High";
  if (score >= 65) return "Medium";
  return "Limited";
}

export function articlePath(slug: string): string {
  return `/guides/${encodeURIComponent(slug)}`;
}

export function toArticlePreview(article: Article): ArticlePreview {
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    category: article.category,
    updatedAt: article.updatedAt,
    source: article.sourceData.source,
    language: article.sourceData.language,
    signalLabel: getPrimarySignal(article)?.label,
  };
}

export function sourceDisplayName(source: RepoData["source"]): string {
  if (source === "npm") return "npm";
  if (source === "hackernews") return "Hacker News";
  return "GitHub";
}
