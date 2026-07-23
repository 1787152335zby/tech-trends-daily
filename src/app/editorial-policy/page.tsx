import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editorial Policy",
  description:
    "How the TechTrends Daily Editorial Team uses automation, checks sources, handles corrections, and separates editorial coverage from advertising.",
  alternates: { canonical: "/editorial-policy" },
};

export default function EditorialPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-3 text-3xl font-bold tracking-tight">
        Editorial Policy
      </h1>
      <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        Published by the TechTrends Daily Editorial Team · Last reviewed July
        23, 2026
      </p>

      <div className="article-body text-gray-700 dark:text-gray-300">
        <h2>Who publishes this site</h2>
        <p>
          TechTrends Daily is published by an editorial team rather than
          attributed to invented individual writers. The team is responsible
          for the site&apos;s publishing standards, source attribution, and
          corrections.
        </p>

        <h2>Automation and editorial checks</h2>
        <p>
          Automated workflows collect public signals and prepare article
          drafts from GitHub, npm, and Hacker News data. Automation helps us
          monitor many projects, but it can misread data or miss important
          context. We use validation rules and human spot checks to improve
          accuracy; this does not mean every project has been personally
          installed, benchmarked, or security-audited.
        </p>
        <p>
          Readers should confirm installation commands, version compatibility,
          licensing, security, and current project status with the original
          source linked from each article.
        </p>

        <h2>Selection and ranking</h2>
        <p>
          Coverage is based on public activity signals, relevance to software
          practitioners, and category fit. Trend figures are a point-in-time
          snapshot and may change after publication. Inclusion is not an
          endorsement.
        </p>

        <h2>Updates and corrections</h2>
        <p>
          Articles show publication and modification dates when available. We
          may update, consolidate, redirect, or remove pages when information
          is duplicated, outdated, or materially inaccurate. To report an
          issue, follow the instructions on the{" "}
          <Link href="/contact">Contact page</Link> and include the affected
          URL and a reliable source.
        </p>

        <h2>Advertising and commercial independence</h2>
        <p>
          Advertising does not determine which projects are covered or how
          they are ranked. Sponsored or affiliate relationships, if introduced,
          will be labeled where they appear. Ordinary source links are not
          affiliate links.
        </p>
      </div>
    </article>
  );
}
