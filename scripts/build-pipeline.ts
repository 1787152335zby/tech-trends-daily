/**
 * Master build pipeline script.
 * 1. Fetch all data sources
 * 2. Generate articles from data
 * 3. Build the Next.js site
 */

import { execSync } from "child_process";

const cwd = process.cwd();

function run(script: string, label: string) {
  console.log(`\n===== ${label} =====\n`);
  execSync(`npx tsx ${script}`, { stdio: "inherit", cwd });
}

async function main() {
  console.log("========== TechTrends Daily Build Pipeline ==========\n");

  run("scripts/fetch-all.ts", "Step 1: Fetch Data");
  run("scripts/generate-articles.ts", "Step 2: Generate Articles");
  run("npx next build", "Step 3: Build Next.js Site");

  console.log("\n========== Build Complete ==========");
}

main().catch((err) => {
  console.error("Build pipeline failed:", err);
  process.exit(1);
});
