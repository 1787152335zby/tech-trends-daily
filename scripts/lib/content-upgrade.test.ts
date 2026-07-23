import assert from "node:assert/strict";
import test from "node:test";
import type { RepoData } from "../../src/lib/types";
import { buildArticle, canonicalArticleSlug } from "../generate-articles";
import { createEditorialDraft } from "./ai-editor";
import type { EvidencePack } from "./evidence";

const npmRepo: RepoData = {
  id: "npm-example-package",
  name: "example-package",
  fullName: "npm:example-package",
  url: "https://www.npmjs.com/package/example-package",
  description: "A source-backed example package for content pipeline tests.",
  language: "JavaScript/TypeScript",
  stars: 20,
  starsGrowth: 999,
  forks: 2,
  openIssues: 1,
  topics: ["testing", "example"],
  license: "MIT",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-23T00:00:00.000Z",
  homepage: "",
  source: "npm",
  category: "tools",
};

const npmPackWithoutDownloads: EvidencePack = {
  sourceId: npmRepo.id,
  source: "npm",
  fetchedAt: "2026-07-23T00:00:00.000Z",
  summary:
    "A source-backed example package used to verify missing-metric handling.",
  officialUrls: [
    npmRepo.url,
    "https://registry.npmjs.org/example-package",
  ],
  quickStart: "npm install example-package",
  latestRelease: {
    tag: "2.0.0",
    publishedAt: "2026-07-20T00:00:00.000Z",
    url: npmRepo.url,
  },
  evidence: [
    {
      label: "Official package summary",
      value:
        "A source-backed example package used to verify missing-metric handling.",
      url: "https://registry.npmjs.org/example-package",
      observedAt: "2026-07-23T00:00:00.000Z",
      kind: "documentation",
    },
    {
      label: "Latest version",
      value: "2.0.0",
      url: "https://registry.npmjs.org/example-package",
      observedAt: "2026-07-23T00:00:00.000Z",
      kind: "release",
    },
  ],
  score: 80,
  warnings: [
    "Weekly npm download evidence was unavailable: HTTP 429 from api.npmjs.org",
  ],
};

test("uses readable canonical slugs and never substitutes a missing metric with zero", async () => {
  const result = await createEditorialDraft(
    npmRepo,
    npmPackWithoutDownloads,
    { env: {} },
  );
  const article = buildArticle(npmRepo, {
    evidencePack: npmPackWithoutDownloads,
    editorialDraft: result.draft,
    indexable: true,
  });

  assert.equal(canonicalArticleSlug(npmRepo), "example-package");
  assert.equal(article.slug, "example-package");
  assert.match(article.bodyHtml, /download data was unavailable/i);
  assert.doesNotMatch(article.bodyHtml, /📦\s*0/);
  assert.match(article.bodyHtml, /Best fit — and when to skip it/);
});

test("creates story-specific Hacker News context instead of a reusable description", async () => {
  const storyRepo: RepoData = {
    ...npmRepo,
    id: "hn-123456",
    name: "Why database benchmarks fail in production",
    fullName: "hn:why-database-benchmarks-fail-in-production",
    url: "https://example.com/database-benchmarks",
    description: "Why database benchmarks fail in production",
    language: "Various",
    stars: 140,
    starsGrowth: 140,
    topics: [],
    license: "N/A",
    source: "hackernews",
    category: "database",
  };
  const storyPack: EvidencePack = {
    sourceId: storyRepo.id,
    source: "hackernews",
    fetchedAt: "2026-07-23T00:00:00.000Z",
    summary:
      "Why database benchmarks fail in production. The article explains how synthetic workloads can hide queueing and data-shape bottlenecks.",
    officialUrls: [
      storyRepo.url,
      "https://news.ycombinator.com/item?id=123456",
    ],
    evidence: [
      {
        label: "Original source summary",
        value:
          "The article explains how synthetic workloads can hide queueing and data-shape bottlenecks.",
        url: storyRepo.url,
        observedAt: "2026-07-23T00:00:00.000Z",
        kind: "documentation",
      },
      {
        label: "Points at collection",
        value: "140",
        url: "https://news.ycombinator.com/item?id=123456",
        observedAt: "2026-07-23T00:00:00.000Z",
        kind: "attention-metric",
      },
    ],
    score: 85,
    warnings: [],
  };

  const result = await createEditorialDraft(storyRepo, storyPack, { env: {} });
  assert.match(result.draft.description, /synthetic workloads/i);
  assert.equal(result.draft.sections[0].heading, "The short version");
  assert.equal(result.draft.sections[2].heading, "What to question");
});
