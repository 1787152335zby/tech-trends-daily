const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "content", "articles");
const URL = process.env.NEXT_PUBLIC_SITE_URL || "https://techtrends-daily.vercel.app";
const NOW = new Date().toISOString();
const p = path.join(DIR, "index.json");
if (!fs.existsSync(p)) { console.error("index.json not found"); process.exit(0); }
const articles = JSON.parse(fs.readFileSync(p, "utf-8"));
const cats = [...new Set(articles.map(a => a.category))];
let xml = '<?xml version="1.0" encoding="UTF-8"?>' + "\n"
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "\n"
  + '  <url><loc>' + URL + '/</loc><lastmod>' + NOW + '</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>';
cats.forEach(c => { xml += "\n  <url><loc>" + URL + "/category/" + c + "/</loc><lastmod>" + NOW + "</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>"; });
articles.forEach(a => { xml += "\n  <url><loc>" + URL + "/article/" + a.slug + "/</loc><lastmod>" + a.updatedAt + "</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>"; });
xml += "\n</urlset>";
fs.mkdirSync(path.join(__dirname, "..", "public"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), xml, "utf-8");
console.log("sitemap generated: " + articles.length + " articles + " + cats.length + " categories + 1 home = " + (articles.length + cats.length + 1) + " total URLs");