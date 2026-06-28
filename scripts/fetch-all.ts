/**
 * Fetch all data sources and merge into a unified dataset.
 * Run this as the main entry point for data collection.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { RepoData } from "../src/lib/types";
import { DATA_DIR } from "../src/lib/constants";

const MERGED_OUTPUT = path.join(DATA_DIR, "all-trending.json");

function mergeData(): RepoData[] {
  const sources = [
    { file: "github-trending.json", label: "GitHub" },
    { file: "npm-trending.json", label: "NPM" },
    { file: "hn-trending.json", label: "HackerNews" },
  ];

  const all: RepoData[] = [];
  for (const { file, label } of sources) {
    const fp = path.join(DATA_DIR, file);
    if (!fs.existsSync(fp)) {
      console.warn(`  [${label}] File not found: ${fp}, skipping`);
      continue;
    }
    const data: RepoData[] = JSON.parse(fs.readFileSync(fp, "utf-8"));
    all.push(...data);
    console.log(`  [${label}] Loaded ${data.length} items`);
  }

  // Deduplicate by fullName
  const seen = new Set<string>();
  const unique = all.filter((item) => {
    if (seen.has(item.fullName)) return false;
    seen.add(item.fullName);
    return true;
  });

  unique.sort((a, b) => b.starsGrowth - a.starsGrowth);
  fs.writeFileSync(MERGED_OUTPUT, JSON.stringify(unique, null, 2));
  console.log(`[Merge] Total unique items: ${unique.length}`);

  return unique;
}

// Run all fetchers sequentially, then merge
async function main() {
  console.log("=== Fetching all data sources ===\n");

  // Run fetchers
  const fetchers = [
    { script: "scripts/fetch-github.ts", label: "GitHub" },
    { script: "scripts/fetch-npm.ts", label: "NPM" },
    { script: "scripts/fetch-hn.ts", label: "HN" },
  ];

  for (const { script, label } of fetchers) {
    console.log(`\n--- Running ${label} fetcher ---`);
    try {
      execSync(`npx tsx ${script}`, { stdio: "inherit", cwd: process.cwd() });
    } catch (err) {
      console.error(`  [${label}] Fetcher failed:`, err);
    }
  }

  console.log("\n=== Merging data ===\n");
  const merged = mergeData();
  console.log(`\nDone! ${merged.length} total items in ${MERGED_OUTPUT}`);
}

main().catch(console.error);
