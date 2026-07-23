import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy information for visitors to TechTrends Daily.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy</h1>
      <p className="mb-6 text-sm text-gray-500">Last updated: July 20, 2026</p>
      <div className="article-body text-gray-700 dark:text-gray-300">
        <h2>Information handled by the site</h2>
        <p>
          TechTrends Daily does not currently offer user accounts, comments, newsletters, or a contact form. The site does not ask visitors to submit personal information directly.
        </p>
        <p>
          Hosting and infrastructure providers may process ordinary request information such as IP address, browser details, requested pages, timestamps, and diagnostic logs to deliver and protect the site.
        </p>
        <h2>Advertising and cookies</h2>
        <p>
          If Google AdSense is approved, configured, and enabled, Google and its partners may use cookies or similar technologies to serve, measure, and personalize ads, subject to applicable consent requirements. When advertising is not configured, this site does not load its AdSense script.
        </p>
        <p>
          You can learn how Google handles data in advertising products on the Google site at{" "}
          <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
            How Google uses information from sites or apps that use its services
          </a>.
        </p>
        <h2>External sources</h2>
        <p>
          Articles link to third-party sites such as GitHub, npm, Hacker News, and project homepages. Those services have their own privacy practices, and this policy does not govern them.
        </p>
        <h2>Questions</h2>
        <p>
          Use the <Link href="/contact">Contact page</Link> for privacy questions or correction requests. This notice will be updated if the site adds accounts, analytics, forms, or other data-processing features.
        </p>
      </div>
    </article>
  );
}
