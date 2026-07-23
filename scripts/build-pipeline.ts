/**
 * Master build pipeline script.
 * 1. Fetch all data sources
 * 2. Collect official source evidence
 * 3. Generate articles from data
 * 4. Validate generated content
 * 5. Run static quality checks
 * 6. Build the Next.js site
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
  run("npm run collect-evidence", "Step 2: Collect Official Evidence");
  run("npm run generate", "Step 3: Generate and Review Articles");
  run("npm run validate-content", "Step 4: Validate Content");
  run("npm run lint", "Step 5a: Lint");
  run("npx tsc --noEmit", "Step 5b: Type Check");
  run("npm run build", "Step 6: Build Next.js Site");

  console.log("\n========== Build Complete ==========");
}

main().catch((err) => {
  console.error("Build pipeline failed:", err);
  process.exit(1);
});
