export const SITE_NAME = "TechTrends Daily";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://tech-trends-daily.vercel.app";
export const SITE_DESCRIPTION =
  "Practical guides to trending developer tools: what they do, who they help, how to start, and what official project signals reveal.";

export const DATA_DIR = "data";
export const CONTENT_DIR = "content/articles";

export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";

export const FETCH_SOURCES = {
  github: {
    endpoint: "https://api.github.com/search/repositories",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  },
  npm: {
    endpoint: "https://api.npmjs.org/downloads/point/last-week",
  },
  hackernews: {
    topStories: "https://hacker-news.firebaseio.com/v0/topstories.json",
    item: "https://hacker-news.firebaseio.com/v0/item",
  },
} as const;
