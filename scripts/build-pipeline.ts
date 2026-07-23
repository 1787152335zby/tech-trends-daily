/**
 * Master build pipeline script.
 * 1. Fetch all data sources
 * 2. Generate articles from data
 * 3. Validate generated content
 * 4. Run static quality checks
 * 5. Build the Next.js site
 */

import { execSync } from "child_process";

const cwd = process.cwd();

function run(command: string, label: string) {
  console.log(`\n===== ${label} =====\n`);
  execSync(command, { stdio: "inherit", cwd });
}

async function main() {
  console.log("========== TechTrends Daily Build Pipeline ==========\n");

  run("npm run fetch-all", "Step 1: Fetch Data");
  run("npm run generate", "Step 2: Update Canonical Snapshots");
  run("npm run validate-content", "Step 3: Validate Content");
  run("npm run lint", "Step 4a: Lint");
  run("npx tsc --noEmit", "Step 4b: Type Check");
  run("npm run build", "Step 5: Build Next.js Site");

  console.log("\n========== Build Complete ==========");
}

main().catch((err) => {
  console.error("Build pipeline failed:", err);
  process.exit(1);
});
