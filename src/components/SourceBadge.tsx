import type { RepoData } from "@/lib/types";

const sourcePresentation: Record<
  RepoData["source"],
  { label: string; className: string }
> = {
  github: {
    label: "GitHub Project",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  npm: {
    label: "npm Package",
    className:
      "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  },
  hackernews: {
    label: "HN Discussion",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  },
};

export function getSourceLabel(source: RepoData["source"]): string {
  return sourcePresentation[source].label;
}

export default function SourceBadge({
  source,
}: {
  source: RepoData["source"];
}) {
  const presentation = sourcePresentation[source];

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}
