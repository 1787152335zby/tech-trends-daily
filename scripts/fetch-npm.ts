/**
 * NPM trending packages fetcher.
 * Uses npm download counts and search API to find trending packages.
 */

import fs from "fs";
import path from "path";
import { NpmPackage, RepoData, ArticleCategory } from "../src/lib/types";
import { DATA_DIR, FETCH_SOURCES } from "../src/lib/constants";

const OUTPUT_FILE = path.join(DATA_DIR, "npm-trending.json");

// Common packages to track (popular and fast-growing)
const PACKAGES_TO_TRACK = [
  "react", "next", "vue", "svelte", "astro", "solid-js", "preact",
  "tailwindcss", "shadcn-ui", "radix-ui",
  "express", "fastify", "hono", "nestjs", "elysia",
  "typescript", "esbuild", "vite", "turbo", "tsx", "tsup",
  "zod", "valibot", "typebox",
  "prisma", "drizzle-orm", "kysely",
  "playwright", "vitest", "storybook",
  "langchain", "openai", "ai", "chromadb",
  "bun", "pnpm",
  "tRPC", "hono", "elysia",
  "effect", "fp-ts",
  "tanstack", "zustand", "jotai", "valtio",
  "nuxt", "remix", "remix-run",
  "graphql", "apollo", "urql",
  "puppeteer", "cheerio",
  "date-fns", "dayjs", "luxon",
  "lucide-react", "lucide-svelte",
  "expo", "react-native", "tamagui",
];

function mapPackageToCategory(pkg: { name: string; keywords?: string[] }): ArticleCategory {
  const text = `${pkg.name} ${(pkg.keywords || []).join(" ")}`.toLowerCase();
  if (/\b(react|vue|svelte|angular|css|tailwind|ui|component|frontend|dom)\b/.test(text)) return "frontend";
  if (/\b(express|fastify|hono|elysia|nest|server|api|graphql|trpc|backend)\b/.test(text)) return "backend";
  if (/\b(docker|kubernetes|ci|cd|devops|deploy|terraform)\b/.test(text)) return "devops";
  if (/\b(ai|ml|llm|gpt|openai|machine.learning|neural|nlp|transformer)\b/.test(text)) return "ai-ml";
  if (/\b(react-native|expo|swift|kotlin|flutter|mobile|ios|android)\b/.test(text)) return "mobile";
  if (/\b(security|auth|oauth|jwt|encrypt|crypto|csrf)\b/.test(text)) return "security";
  if (/\b(database|sql|prisma|drizzle|orm|postgres|mysql|mongo|redis)\b/.test(text)) return "database";
  if (/\b(typescript|compiler|parser|language|runtime|wasm)\b/.test(text)) return "language";
  return "tools";
}

async function getDownloads(pkgName: string): Promise<number> {
  try {
    const url = `${FETCH_SOURCES.npm.endpoint}/${pkgName}`;
    const res = await fetch(url);
    if (!res.ok) return 0;
    const data = await res.json();
    return data.downloads || 0;
  } catch {
    return 0;
  }
}

async function getPackageInfo(pkgName: string): Promise<NpmPackage | null> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkgName}/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      name: data.name,
      description: data.description || "",
      version: data.version,
      weeklyDownloads: 0,
      dependencies: data.dependencies || {},
      repository: data.repository?.url || "",
      homepage: data.homepage || "",
      license: data.license || "MIT",
      keywords: data.keywords || [],
    };
  } catch {
    return null;
  }
}

async function fetchNpmTrending(): Promise<RepoData[]> {
  console.log("[NPM] Fetching trending packages...");
  const results: RepoData[] = [];

  for (const pkgName of PACKAGES_TO_TRACK) {
    try {
      const [downloads, info] = await Promise.all([
        getDownloads(pkgName),
        getPackageInfo(pkgName),
      ]);

      if (!info) continue;

      results.push({
        id: `npm-${pkgName}`,
        name: info.name,
        fullName: `npm:${info.name}`,
        url: `https://www.npmjs.com/package/${info.name}`,
        description: info.description,
        language: "JavaScript/TypeScript",
        stars: 0,
        starsGrowth: downloads, // use downloads as proxy for "growth"
        forks: 0,
        openIssues: 0,
        topics: info.keywords || [],
        license: info.license,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        homepage: info.homepage,
        source: "npm",
        category: mapPackageToCategory(info),
      });
    } catch (err) {
      console.error(`  [NPM] ${pkgName}: error:`, err);
    }
  }

  results.sort((a, b) => b.starsGrowth - a.starsGrowth);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`[NPM] Saved ${results.length} packages to ${OUTPUT_FILE}`);
  return results;
}

fetchNpmTrending().catch(console.error);
