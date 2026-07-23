import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "How TechTrends Daily collects public technology signals and creates its coverage.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">About TechTrends Daily</h1>
      <div className="article-body text-gray-700 dark:text-gray-300">
        <p>
          TechTrends Daily tracks public signals from GitHub, npm, and Hacker News to help readers discover software projects, packages, and developer topics.
        </p>
        <h2>How the site is produced</h2>
        <p>
          Article drafts and data updates are created by automated workflows from publicly available source data. Automation can make mistakes or miss context, so readers should verify important claims, installation steps, licensing, security information, and project status with the original source linked in each article.
        </p>
        <p>
          Inclusion on this site is not an endorsement, and rankings or trend signals can change after an article is published.
        </p>
        <p>
          Coverage is published under the{" "}
          <Link href="/editorial-policy">TechTrends Daily Editorial Policy</Link>,
          which explains our use of automation, source checks, corrections, and
          commercial independence.
        </p>
        <h2>Advertising</h2>
        <p>
          The site may display advertising after an advertising account has been approved and enabled. Advertising does not determine which projects are covered. Any future sponsored or affiliate relationship should be disclosed where it appears; the general presence of an outbound link does not mean it is an affiliate link.
        </p>
        <p>
          See the <Link href="/privacy">Privacy page</Link> for information about data handling and third-party services, or the <Link href="/contact">Contact page</Link> to report a correction.
        </p>
      </div>
    </article>
  );
}
