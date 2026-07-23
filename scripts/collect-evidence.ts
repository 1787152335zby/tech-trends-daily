/**
 * Warm the official evidence cache for RepoData records.
 *
 * Usage:
 *   npx tsx scripts/collect-evidence.ts
 *   npx tsx scripts/collect-evidence.ts --input data/all-trending.json --limit 20
 *   npx tsx scripts/collect-evidence.ts --refresh --output data/evidence-packs.json
 */

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import type { RepoData } from "../src/lib/types";
import {
  collectEvidencePacks,
  type EvidenceCollectionOptions,
} from "./lib/evidence";

interface CliOptions {
  input: string;
  output?: string;
  cacheDir?: string;
  concurrency?: number;
  timeoutMs?: number;
  limit?: number;
  forceRefresh: boolean;
}

function positiveInteger(value: string | undefined, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return parsed;
}

function requiredFlagValue(
  args: string[],
  index: number,
  flag: string,
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseEvidenceCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    input: path.join("data", "all-trending.json"),
    forceRefresh: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--refresh") {
      options.forceRefresh = true;
    } else if (arg === "--input") {
      options.input = requiredFlagValue(args, index, arg);
      index += 1;
    } else if (arg === "--output") {
      options.output = requiredFlagValue(args, index, arg);
      index += 1;
    } else if (arg === "--cache-dir") {
      options.cacheDir = requiredFlagValue(args, index, arg);
      index += 1;
    } else if (arg === "--concurrency") {
      options.concurrency = positiveInteger(
        requiredFlagValue(args, index, arg),
        arg,
      );
      index += 1;
    } else if (arg === "--timeout-ms") {
      options.timeoutMs = positiveInteger(
        requiredFlagValue(args, index, arg),
        arg,
      );
      index += 1;
    } else if (arg === "--limit") {
      options.limit = positiveInteger(
        requiredFlagValue(args, index, arg),
        arg,
      );
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.input) throw new Error("--input requires a file path");
  return options;
}

function isRepoData(value: unknown): value is RepoData {
  if (!value || typeof value !== "object") return false;
  const repo = value as Partial<RepoData>;
  return (
    typeof repo.id === "string" &&
    typeof repo.name === "string" &&
    typeof repo.fullName === "string" &&
    typeof repo.url === "string" &&
    ["github", "npm", "hackernews"].includes(String(repo.source))
  );
}

async function loadRepos(filename: string): Promise<RepoData[]> {
  const parsed: unknown = JSON.parse(await fs.readFile(filename, "utf-8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Evidence input must be a JSON array: ${filename}`);
  }

  const repos = parsed.filter(isRepoData);
  if (repos.length !== parsed.length) {
    console.warn(
      `[Evidence] Skipped ${parsed.length - repos.length} invalid RepoData records.`,
    );
  }
  return repos;
}

export async function runEvidenceCollection(
  cli: CliOptions,
): Promise<void> {
  const input = path.resolve(cli.input);
  const allRepos = await loadRepos(input);
  const repos =
    cli.limit === undefined ? allRepos : allRepos.slice(0, cli.limit);
  const options: EvidenceCollectionOptions = {
    cacheDir: cli.cacheDir,
    concurrency: cli.concurrency,
    timeoutMs: cli.timeoutMs,
    forceRefresh: cli.forceRefresh,
    onProgress: (completed, total, pack) => {
      console.log(
        `[Evidence] ${completed}/${total} ${pack.source}:${pack.sourceId} score=${pack.score} warnings=${pack.warnings.length}`,
      );
    },
  };

  console.log(
    `[Evidence] Collecting ${repos.length} source packs from ${input} (cache is enabled).`,
  );
  const packs = await collectEvidencePacks(repos, options);

  if (cli.output) {
    const output = path.resolve(cli.output);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, `${JSON.stringify(packs, null, 2)}\n`, "utf-8");
    console.log(`[Evidence] Wrote ${packs.length} packs to ${output}.`);
  }

  const fallbackCount = packs.filter((pack) =>
    pack.warnings.some((warning) =>
      warning.startsWith("Live official evidence could not be refreshed"),
    ),
  ).length;
  const averageScore =
    packs.length === 0
      ? 0
      : Math.round(
          packs.reduce((total, pack) => total + pack.score, 0) / packs.length,
        );
  console.log(
    `[Evidence] Complete: ${packs.length} packs, average evidence score ${averageScore}, ${fallbackCount} live-fetch fallbacks.`,
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  runEvidenceCollection(parseEvidenceCliArgs(process.argv.slice(2))).catch(
    (error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
