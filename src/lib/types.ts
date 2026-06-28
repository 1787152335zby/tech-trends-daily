export interface RepoData {
  id: string;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  starsGrowth: number;
  forks: number;
  openIssues: number;
  topics: string[];
  license: string;
  createdAt: string;
  updatedAt: string;
  homepage: string;
  source: "github" | "npm" | "hackernews";
  category: ArticleCategory;
}

export interface NpmPackage {
  name: string;
  description: string;
  version: string;
  weeklyDownloads: number;
  dependencies: Record<string, string>;
  repository: string;
  homepage: string;
  license: string;
  keywords: string[];
}

export interface HackerNewsItem {
  id: number;
  title: string;
  url: string;
  score: number;
  descendants: number;
  by: string;
  time: number;
  type: string;
}

export type ArticleCategory =
  | "frontend"
  | "backend"
  | "devops"
  | "ai-ml"
  | "mobile"
  | "tools"
  | "security"
  | "database"
  | "language";

export type ArticleType = "review" | "vs" | "howto" | "bestof" | "trend";

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  type: ArticleType;
  publishedAt: string;
  updatedAt: string;
  sourceData: RepoData;
  relatedSlugs: string[];
  tags: string[];
  bodyHtml: string;
}

export const CATEGORY_SLUGS: Record<ArticleCategory, string> = {
  frontend: "frontend",
  backend: "backend",
  devops: "devops",
  "ai-ml": "ai-ml",
  mobile: "mobile",
  tools: "tools",
  security: "security",
  database: "database",
  language: "language",
};

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  devops: "DevOps",
  "ai-ml": "AI & ML",
  mobile: "Mobile",
  tools: "Tools",
  security: "Security",
  database: "Database",
  language: "Programming Languages",
};

export const LANGUAGE_CATEGORY_MAP: Record<string, ArticleCategory> = {
  JavaScript: "frontend",
  TypeScript: "frontend",
  CSS: "frontend",
  HTML: "frontend",
  Vue: "frontend",
  Svelte: "frontend",
  Python: "backend",
  Go: "backend",
  Rust: "backend",
  Java: "backend",
  "C#": "backend",
  Ruby: "backend",
  PHP: "backend",
  Kotlin: "mobile",
  Swift: "mobile",
  Dart: "mobile",
  Dockerfile: "devops",
  Shell: "devops",
  HCL: "devops",
  Jupyter: "ai-ml",
  Notebook: "ai-ml",
  Scala: "ai-ml",
  C: "language",
  "C++": "language",
  Zig: "language",
  Elixir: "backend",
  Haskell: "language",
  Lua: "tools",
  R: "ai-ml",
  MDX: "frontend",
};
