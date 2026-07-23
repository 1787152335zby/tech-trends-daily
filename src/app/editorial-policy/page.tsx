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
          Automated workflows collect public signals and source evidence from
          GitHub, npm, and Hacker News. Drafts must link factual claims to that
          evidence and pass a separate editorial validation step before they
          can enter the searchable catalog. When AI editing is enabled, a
          second pass checks the draft for unsupported claims, repetition, and
          promotional language. Human spot checks may also be performed.
          These checks do not mean every project has been personally installed,
          benchmarked, or security-audited.
        </p>
        <p>
          Readers should confirm installation commands, version compatibility,
          licensing, security, and current project status with the original
          source linked from each article.
        </p>
        <p>
          Searchable tool guides are organized around decisions: a quick
          verdict, best-fit uses, reasons to skip a tool, setup checks,
          maintenance signals, and limitations. Discussion guides summarize
          the linked source or discussion text before explaining attention and
          verification questions. Raw records remain available in a supporting
          source section. Pages that have not passed the current evidence and
          editorial thresholds are excluded from discovery pages and marked
          not to be indexed by search engines.
        </p>

        <h2>Selection and ranking</h2>
        <p>
          Coverage is based on public activity signals, relevance to software
          practitioners, category fit, source completeness, and the amount of
          verifiable evidence available. The workflow may publish fewer items
          than its configured daily limit when candidates do not meet the
          quality threshold. The homepage trend view balances GitHub, npm, and
          Hacker News rather than allowing one source to dominate. It combines
          source-appropriate activity with release, publication, repository,
          or push recency. Missing metrics are labeled unavailable rather than
          displayed as zero. Figures remain point-in-time records and may
          change after publication. Inclusion is not an endorsement.
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
