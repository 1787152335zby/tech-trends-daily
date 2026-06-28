/**
 * Hacker News trending items fetcher.
 * Fetches top stories and Show HN / Ask HN posts from the last 24 hours.
 */

import fs from "fs";
import path from "path";
import { HackerNewsItem, RepoData, ArticleCategory } from "../src/lib/types";
import { DATA_DIR, FETCH_SOURCES } from "../src/lib/constants";

const OUTPUT_FILE = path.join(DATA_DIR, "hn-trending.json");

function mapHNToCategory(item: HackerNewsItem): ArticleCategory {
  const text = `${item.title}`.toLowerCase();
  if (/\b(ai|ml|llm|gpt|openai|machine.learning|neural|deep.learning|transformer)\b/.test(text)) return "ai-ml";
  if (/\b(frontend|react|vue|svelte|css|tailwind|javascript|typescript|browser|dom)\b/.test(text)) return "frontend";
  if (/\b(api|server|backend|database|sql|postgres|mysql|graphql|rest)\b/.test(text)) return "backend";
  if (/\b(docker|kubernetes|devops|ci|cd|deploy|aws|cloud|terraform)\b/.test(text)) return "devops";
  if (/\b(security|hack|vuln|exploit|cve|encrypt)\b/.test(text)) return "security";
  if (/\b(ios|android|swift|kotlin|flutter|mobile)\b/.test(text)) return "mobile";
  if (/\b(rust|go|python|compiler|language|runtime|wasm)\b/.test(text)) return "language";
  if (/\b(tool|cli|terminal|shell|linux|macos|windows)\b/.test(text)) return "tools";
  return "tools";
}

function mapHNToRepoData(item: HackerNewsItem): RepoData {
  const name = item.title.slice(0, 80);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return {
    id: `hn-${item.id}`,
    name: name,
    fullName: `hn:${slug}`,
    url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
    description: item.title,
    language: "Various",
    stars: item.score,
    starsGrowth: item.score, // HN score as proxy
    forks: 0,
    openIssues: 0,
    topics: [],
    license: "N/A",
    createdAt: new Date(item.time * 1000).toISOString(),
    updatedAt: new Date(item.time * 1000).toISOString(),
    homepage: item.url || "",
    source: "hackernews",
    category: mapHNToCategory(item),
  };
}

async function fetchHackerNews(): Promise<RepoData[]> {
  console.log("[HN] Fetching top stories...");

  try {
    const topRes = await fetch(FETCH_SOURCES.hackernews.topStories);
    const topIds: number[] = await topRes.json();

    // Take top 30 for Show/Ask filtering
    const recentIds = topIds.slice(0, 30);
    const items: HackerNewsItem[] = [];

    for (const id of recentIds) {
      try {
        const res = await fetch(`${FETCH_SOURCES.hackernews.item}/${id}.json`);
        const item: HackerNewsItem = await res.json();
        if (item && item.type !== "job") {
          items.push(item);
        }
      } catch {
        // skip individual failures
      }
    }

    const results: RepoData[] = items.map(mapHNToRepoData);
    results.sort((a, b) => b.stars - a.stars);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`[HN] Saved ${results.length} items to ${OUTPUT_FILE}`);
    return results;
  } catch (err) {
    console.error("[HN] Fetch error:", err);
    return [];
  }
}

fetchHackerNews().catch(console.error);
