const DEFAULT_DAILY_NEW_ARTICLE_LIMIT = 5;
const DEFAULT_MAX_INDEXED_ARTICLES = 500;
const DEFAULT_MIN_EVIDENCE_SCORE = 50;
const DEFAULT_MIN_EDITORIAL_SCORE = 70;

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (value == null || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`Expected an integer from ${minimum} through ${maximum}, received "${value}".`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`Expected an integer from ${minimum} through ${maximum}, received "${value}".`);
  }
  return parsed;
}

export interface ContentPolicy {
  dailyNewArticleLimit: number;
  maxIndexedArticles: number;
  minEvidenceScore: number;
  minEditorialScore: number;
}

export function loadContentPolicy(
  env: NodeJS.ProcessEnv = process.env,
): ContentPolicy {
  return {
    dailyNewArticleLimit: parseBoundedInteger(
      env.DAILY_NEW_ARTICLE_LIMIT,
      DEFAULT_DAILY_NEW_ARTICLE_LIMIT,
      0,
      20,
    ),
    maxIndexedArticles: parseBoundedInteger(
      env.MAX_INDEXED_ARTICLES,
      DEFAULT_MAX_INDEXED_ARTICLES,
      100,
      2_000,
    ),
    minEvidenceScore: parseBoundedInteger(
      env.MIN_EVIDENCE_SCORE,
      DEFAULT_MIN_EVIDENCE_SCORE,
      0,
      100,
    ),
    minEditorialScore: parseBoundedInteger(
      env.MIN_EDITORIAL_SCORE,
      DEFAULT_MIN_EDITORIAL_SCORE,
      0,
      100,
    ),
  };
}

