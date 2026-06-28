/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://techtrends-daily.vercel.app",
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: "daily",
  priority: 0.7,
  exclude: ["/api/*"],
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
    ],
  },
  transform: async (config, path) => {
    if (path === "/") {
      return { loc: path, changefreq: "hourly", priority: 1.0, lastmod: new Date().toISOString() };
    }
    if (path.startsWith("/article/")) {
      return { loc: path, changefreq: "weekly", priority: 0.8, lastmod: new Date().toISOString() };
    }
    if (path.startsWith("/category/")) {
      return { loc: path, changefreq: "daily", priority: 0.9, lastmod: new Date().toISOString() };
    }
    return { loc: path, changefreq: "daily", priority: 0.7, lastmod: new Date().toISOString() };
  },
};
