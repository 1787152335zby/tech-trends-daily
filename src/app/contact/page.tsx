import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to report corrections or contact the TechTrends Daily project.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Contact</h1>
      <div className="article-body text-gray-700 dark:text-gray-300">
        <p>
          TechTrends Daily does not currently publish a business email address or operate a contact form.
        </p>
        <p>
          To report an inaccurate claim, broken link, attribution problem, privacy concern, or other site issue, open an issue in the public{" "}
          <a
            href="https://github.com/1787152335zby/tech-trends-daily/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            project issue tracker
          </a>. Include the affected page URL and enough detail to reproduce or verify the problem. Do not post private or sensitive information in a public issue.
        </p>
        <p>
          Source-project support questions should be directed to the original project maintainers through the source link shown in the relevant article.
        </p>
      </div>
    </article>
  );
}
