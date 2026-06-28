/**
 * GitHub Trending data fetcher.
 * Uses GitHub Search API to find repos with most stars created in the last 7 days.
 */

import fs from "fs";
import path from "path";
import { RepoData, LANGUAGE_CATEGORY_MAP, ArticleCategory } from "../src/lib/types";
import { DATA_DIR, FETCH_SOURCES } from "../src/lib/constants";

const OUTPUT_FILE = path.join(DATA_DIR, "github-trending.json");
const CACHE_FILE = path.join(DATA_DIR, "github-cache.json");

interface CacheEntry {
  fullName: string;
  stars: number;
  fetchedAt: string;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function computeStarsGrowth(repo: { full_name: string; stargazers_count: number }, cache: Record<string, CacheEntry>): number {
  const entry = cache[repo.full_name];
  if (entry) {
    return repo.stargazers_count - entry.stars;
  }
  return repo.stargazers_count;
}

function mapCategory(language: string | null): ArticleCategory {
  if (language && LANGUAGE_CATEGORY_MAP[language]) {
    return LANGUAGE_CATEGORY_MAP[language];
  }
  return "tools";
}

async function fetchGitHubTrending(): Promise<RepoData[]> {
  console.log("[GitHub] Fetching trending repositories...");

  const languages = ["javascript", "typescript", "python", "go", "rust", "java", "ruby", "swift", "kotlin"];
  const results: RepoData[] = [];
  const seen = new Set<string>();

  const cache = loadCache();
  const newCache: Record<string, CacheEntry> = { ...cache };

  for (const lang of languages) {
    try {
      const url = `${FETCH_SOURCES.github.endpoint}?q=language:${lang}+created:>${sevenDaysAgo()}&sort=stars&order=desc&per_page=10`;
      const res = await fetch(url, { headers: FETCH_SOURCES.github.headers });
      if (!res.ok) {
        console.error(`  [GitHub] ${lang}: HTTP ${res.status} ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        if (seen.has(item.full_name)) continue;
        seen.add(item.full_name);

        const starsGrowth = computeStarsGrowth(item, cache);
        newCache[item.full_name] = {
          fullName: item.full_name,
          stars: item.stargazers_count,
          fetchedAt: new Date().toISOString(),
        };

        results.push({
          id: `gh-${item.id}`,
          name: item.name,
          fullName: item.full_name,
          url: item.html_url,
          description: item.description || "",
          language: item.language || "Unknown",
          stars: item.stargazers_count,
          starsGrowth,
          forks: item.forks_count,
          openIssues: item.open_issues_count,
          topics: item.topics || [],
          license: item.license?.spdx_id || "No license",
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          homepage: item.homepage || "",
          source: "github",
          category: mapCategory(item.language),
        });
      }
    } catch (err) {
      console.error(`  [GitHub] ${lang}: fetch error:`, err);
    }
  }

  // Sort by starsGrowth descending
  results.sort((a, b) => b.starsGrowth - a.starsGrowth);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  saveCache(newCache);

  console.log(`[GitHub] Saved ${results.length} repos to ${OUTPUT_FILE}`);
  return results;
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

fetchGitHubTrending().catch(console.error);
