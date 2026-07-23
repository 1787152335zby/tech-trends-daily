import assert from "node:assert/strict";
import test from "node:test";
import type { RepoData } from "../../src/lib/types";
import type { EvidencePack } from "./evidence";
import { createEditorialDraft } from "./ai-editor";

const sourceUrl = "https://api.github.com/repos/example/project";

const repo: RepoData = {
  id: "gh-123",
  name: "project",
  fullName: "example/project",
  url: "https://github.com/example/project",
  description: "A small example project for deterministic editor tests.",
  language: "TypeScript",
  stars: 120,
  starsGrowth: 10,
  forks: 8,
  openIssues: 3,
  topics: ["example"],
  license: "MIT",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
  homepage: "",
  source: "github",
  category: "tools",
};

const pack: EvidencePack = {
  sourceId: repo.id,
  source: repo.source,
  fetchedAt: "2026-07-23T00:00:00.000Z",
  summary:
    "The official repository describes a small TypeScript example project.",
  officialUrls: [repo.url, sourceUrl],
  maintenance: {
    openIssues: 3,
    forks: 8,
    updatedAt: repo.updatedAt,
  },
  evidence: [
    {
      label: "GitHub stars",
      value: "120",
      url: sourceUrl,
      observedAt: "2026-07-23T00:00:00.000Z",
      kind: "repository-metric",
    },
  ],
  score: 75,
  warnings: [],
};

function responseWithJson(value: unknown): Response {
  return new Response(
    JSON.stringify({
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}

const validModelDraft = {
  title: "Project repository evidence and evaluation notes",
  description:
    "A source-grounded summary of the project repository, its recorded metadata, and the checks readers should perform.",
  dek: "This draft separates recorded repository signals from conclusions about quality, maintenance, security, or suitability.",
  sections: [
    {
      heading: "Repository description",
      paragraphs: [
        "The supplied repository metadata describes project as a small TypeScript example project.",
      ],
      evidenceUrls: [sourceUrl],
    },
    {
      heading: "Recorded repository signal",
      paragraphs: [
        "The repository API recorded 120 GitHub stars when the evidence pack was collected.",
      ],
      evidenceUrls: [sourceUrl],
    },
  ],
  claims: [
    {
      text: "The evidence pack recorded 120 GitHub stars at collection time.",
      evidenceUrls: [sourceUrl],
    },
  ],
  qualityScore: 78,
};

test("skips the network and returns deterministic cited copy without configuration", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    throw new Error("fetch should not be called");
  };

  const result = await createEditorialDraft(repo, pack, {
    env: {},
    fetchImpl,
  });

  assert.equal(result.status, "skipped");
  assert.equal(result.aiAttempted, false);
  assert.equal(result.draft.mode, "deterministic");
  assert.equal(result.draft.review.status, "not-configured");
  assert.equal(result.draft.generatedAt, pack.fetchedAt);
  assert.equal(calls, 0);
  assert.ok(result.draft.claims.length > 0);
  assert.ok(
    result.draft.claims.every((claim) =>
      claim.evidenceUrls.every((url) =>
        [repo.url, sourceUrl].includes(url),
      ),
    ),
  );
});

test("publishes an AI draft only after a separate passing review", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async (_input, init) => {
    calls += 1;
    const request = JSON.parse(String(init?.body)) as {
      text?: { format?: { name?: string } };
    };
    if (request.text?.format?.name === "editorial_draft") {
      return responseWithJson(validModelDraft);
    }
    return responseWithJson({
      status: "approved",
      issues: [],
      factContradictions: [],
      unsupportedClaims: [],
      repeatedIdeas: [],
      vagueOrPromotionalPhrases: [],
      revisedQualityScore: 82,
    });
  };

  const result = await createEditorialDraft(repo, pack, {
    env: {
      OPENAI_API_KEY: "test-key",
      AI_EDITORIAL_MODEL: "test-model",
    },
    fetchImpl,
  });

  assert.equal(calls, 2);
  assert.equal(result.status, "approved");
  assert.equal(result.draft.mode, "ai");
  assert.equal(result.draft.review.status, "passed");
  assert.equal(result.draft.qualityScore, 82);
});

test("discards a draft rejected by the second-pass reviewer", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    if (calls === 1) return responseWithJson(validModelDraft);
    return responseWithJson({
      status: "rejected",
      issues: ["The draft repeats a repository signal."],
      factContradictions: [],
      unsupportedClaims: [],
      repeatedIdeas: ["The star count appears twice."],
      vagueOrPromotionalPhrases: [],
      revisedQualityScore: 45,
    });
  };

  const result = await createEditorialDraft(repo, pack, {
    env: {
      OPENAI_API_KEY: "test-key",
      AI_EDITORIAL_MODEL: "test-model",
    },
    fetchImpl,
  });

  assert.equal(calls, 2);
  assert.equal(result.status, "rejected");
  assert.equal(result.draft.mode, "deterministic");
  assert.equal(result.draft.review.status, "rejected");
  assert.notEqual(result.draft.title, validModelDraft.title);
});

test("rejects an AI claim that cites a URL outside the evidence pack", async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return responseWithJson({
      ...validModelDraft,
      claims: [
        {
          text: "An unsupported outside source makes this factual claim.",
          evidenceUrls: ["https://untrusted.example/claim"],
        },
      ],
    });
  };

  const result = await createEditorialDraft(repo, pack, {
    env: {
      OPENAI_API_KEY: "test-key",
      AI_EDITORIAL_MODEL: "test-model",
    },
    fetchImpl,
  });

  assert.equal(calls, 1);
  assert.equal(result.status, "fallback");
  assert.equal(result.reason, "draft_validation_failed");
  assert.equal(result.draft.mode, "deterministic");
  assert.equal(result.draft.review.status, "fallback");
});
