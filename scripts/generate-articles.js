#!/usr/bin/env node
/**
 * Brenn Consulting — Daily Article Generator
 * Generates 2 SEO articles per day using Claude API,
 * saves them as Eleventy HTML files, updates blog.html and sitemap.xml.
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS_FILE  = path.join(__dirname, 'topics.json');
const POSTS_DIR    = path.join(__dirname, '../src/posts');
const BLOG_FILE    = path.join(__dirname, '../src/blog.html');
const SITEMAP_FILE = path.join(__dirname, '../src/sitemap.xml');
const ARTICLES_PER_DAY = 2;

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function todayIT() {
  return new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Pick N unused topics ──────────────────────────────────────────────────────
function pickTopics(n) {
  const data = JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
  const available = data.pool.filter(t => !data.used.includes(t.slug));
  if (available.length < n) {
    // Reset if pool exhausted
    data.used = [];
    fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2));
    return data.pool.slice(0, n);
  }
  const picked = available.slice(0, n);
  data.used.push(...picked.map(t => t.slug));
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2));
  return picked;
}

// ── Generate article body via Claude ─────────────────────────────────────────
async function generateArticleBody(topic) {
  const prompt = `Sei il team editoriale di Brenn Consulting, un'agenzia milanese che realizza siti web istituzionali per professionisti italiani.

Scrivi un articolo SEO in italiano di circa 700-900 parole sul tema: "${topic.title}"

L'articolo è rivolto a ${topic.profession}i italiani che stanno valutando di creare o migliorare il proprio sito web.

Tono: diretto, concreto, senza fuffa. Come un consulente esperto che parla chiaro.

Struttura richiesta (usa tag HTML):
- 3-4 sezioni con <h2> (titoli diretti, non generici)
- Qualche <h3> dove serve
- Paragrafi <p> con testo denso e utile
- 1-2 blocchi <div class="callout"> con dati o insight concreti (formato: <div class="callout"><p><strong>Punto chiave:</strong> testo</p></div>)
- 1 lista <ul> con elementi <li> pertinenti

NON includere: introduzione generica, conclusioni banali, frasi come "in questo articolo vedremo".
NON includere tag html, head, body, style — solo il contenuto dell'articolo.
Inizia direttamente con il primo paragrafo o con un <h2>.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  return msg.content[0].text.trim();
}

// ── Build full HTML page ──────────────────────────────────────────────────────
function buildArticlePage(topic, bodyHTML, date) {
  const url = `https://www.brenn.it/blog/${topic.slug}/`;
  const dateIT = todayIT();

  return `---
layout: false
permalink: /blog/${topic.slug}/
---
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${topic.title} — Brenn Consulting</title>
<meta name="description" content="${topic.title}. Guida pratica per ${topic.profession}i italiani — Brenn Consulting.">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="article">
<meta property="og:locale" content="it_IT">
<meta property="og:site_name" content="Brenn Consulting">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${topic.title}">
<meta property="og:description" content="${topic.title}. Guida pratica per ${topic.profession}i italiani.">
<meta property="og:image" content="https://www.brenn.it/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${topic.title}">
<meta name="twitter:description" content="${topic.title}. Guida pratica per ${topic.profession}i italiani.">
<meta name="twitter:image" content="https://www.brenn.it/og-image.png">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${topic.title}",
  "description": "${topic.title}. Guida pratica per ${topic.profession}i italiani.",
  "datePublished": "${date}",
  "author": { "@type": "Person", "name": "Cesare Finocchiaro" },
  "publisher": { "@type": "Organization", "name": "Brenn Consulting", "url": "https://www.brenn.it" }
}
</script>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@300;400;600;700&family=Lora:ital,wght@1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{font-family:'Barlow',sans-serif;background:#fff;color:#0a0a0a;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
::selection{background:#0a0a0a;color:#fff;}
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(255,255,255,.97);backdrop-filter:blur(12px);border-bottom:1px solid #e0e0e0;padding:0 48px;height:56px;display:flex;align-items:center;justify-content:space-between;}
.nav-logo{display:flex;align-items:center;gap:9px;text-decoration:none;}
.nav-logo img{height:26px;width:26px;border-radius:3px;display:block;}
.nav-name{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:14px;letter-spacing:.06em;color:#0a0a0a;}
.nav-back{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#1651C8;text-decoration:none;transition:color .2s;}
.nav-back:hover{color:#0a0a0a;}
.art-hero{padding:136px 48px 60px;border-bottom:1px solid #0a0a0a;max-width:860px;}
.art-label{font-size:10px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#1651C8;margin-bottom:20px;display:flex;align-items:center;gap:10px;}
.art-label::before{content:'';width:22px;height:1.5px;background:#1651C8;}
h1{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(40px,6vw,76px);line-height:.93;letter-spacing:-.01em;margin-bottom:32px;}
.art-meta{display:flex;gap:24px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#888;}
.art-body{max-width:720px;padding:64px 48px;margin:0 auto;}
.art-body p{font-size:17px;font-weight:300;line-height:1.8;color:#333;margin-bottom:24px;}
.art-body p strong{font-weight:600;color:#0a0a0a;}
.art-body h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(28px,4vw,40px);line-height:1;letter-spacing:-.01em;margin:52px 0 20px;}
.art-body h3{font-size:18px;font-weight:700;margin:32px 0 12px;color:#0a0a0a;}
.art-body ul{margin:0 0 24px 0;padding-left:0;list-style:none;}
.art-body ul li{font-size:16px;font-weight:300;color:#333;line-height:1.7;padding:10px 0 10px 24px;border-bottom:1px solid #f0f0f0;position:relative;}
.art-body ul li::before{content:'→';position:absolute;left:0;color:#1651C8;font-weight:600;}
.callout{background:#f5f5f5;border-left:3px solid #1651C8;padding:20px 24px;margin:32px 0;}
.callout p{margin:0;font-size:15px;}
.art-cta{background:#0a0a0a;margin:64px 48px;padding:48px;}
.art-cta-label{font-size:10px;font-weight:700;letter-spacing:.25em;text-transform:uppercase;color:#1651C8;margin-bottom:16px;}
.art-cta h2{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(28px,4vw,48px);color:#fff;line-height:1;margin-bottom:16px;}
.art-cta p{font-size:15px;font-weight:300;color:#aaa;line-height:1.7;margin-bottom:32px;max-width:480px;}
.art-cta a{display:inline-block;background:#1651C8;color:#fff;padding:16px 32px;font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:14px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;transition:background .2s;}
.art-cta a:hover{background:#0F3A96;}
footer{background:#0a0a0a;padding:20px 48px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;}
footer p{font-size:11px;color:#666;letter-spacing:.08em;}
footer a{font-size:11px;color:#666;text-decoration:none;letter-spacing:.08em;transition:color .15s;}
footer a:hover{color:#aaa;}
@media(max-width:768px){nav{padding:0 16px;}.art-hero{padding:88px 20px 40px;}.art-body{padding:40px 20px;}.art-cta{margin:40px 20px;padding:32px 24px;}footer{padding:16px;flex-direction:column;text-align:center;}}
</style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo">
    <img src="/logo.png" alt="Brenn">
    <span class="nav-name">BRENN CONSULTING</span>
  </a>
  <a href="/blog/" class="nav-back">&larr; Blog</a>
</nav>

<div class="art-hero">
  <div class="art-label">${topic.label}</div>
  <h1>${topic.title}</h1>
  <div class="art-meta">
    <span>${dateIT}</span>
    <span>&middot;</span>
    <span>5 min di lettura</span>
    <span>&middot;</span>
    <span>Cesare Finocchiaro</span>
  </div>
</div>

<div class="art-body">
${bodyHTML}
</div>

<div class="art-cta">
  <div class="art-cta-label">&mdash; Prossimo passo</div>
  <h2>Verifica gratuita.<br>15 minuti.</h2>
  <p>Cerchiamo il tuo studio su Google e ti diciamo onestamente cosa trovano i tuoi potenziali clienti. Senza impegno.</p>
  <a href="https://www.brenn.it/#contatti">Richiedi la verifica gratuita &rarr;</a>
</div>

<footer>
  <p>&copy; 2026 BRENN CONSULTING &middot; MILANO</p>
  <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
    <a href="/privacy-policy/">Privacy Policy</a>
    <a href="/note-legali/">Note legali</a>
    <a href="mailto:info@brenn.it">info@brenn.it</a>
  </div>
</footer>
</body>
</html>
`;
}

// ── Update blog.html — prepend new cards ──────────────────────────────────────
function updateBlogIndex(topics, date) {
  let html = fs.readFileSync(BLOG_FILE, 'utf8');
  const dateIT = todayIT();

  const newCards = topics.map(t => `  <a href="/blog/${t.slug}/" class="card">
    <div class="card-date">${dateIT} &middot; 5 min</div>
    <div class="card-title">${t.title}</div>
    <div class="card-desc">Guida pratica per ${t.profession}i: presenza digitale, SEO locale e cosa non pu&ograve; mancare nel 2026.</div>
  </a>`).join('\n');

  html = html.replace('<div class="grid">', `<div class="grid">\n${newCards}`);
  fs.writeFileSync(BLOG_FILE, html);
}

// ── Update sitemap.xml ─────────────────────────────────────────────────────────
function updateSitemap(topics, date) {
  let xml = fs.readFileSync(SITEMAP_FILE, 'utf8');
  const newUrls = topics.map(t => `  <url>
    <loc>https://www.brenn.it/blog/${t.slug}/</loc>
    <lastmod>${date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n');

  xml = xml.replace('</urlset>', `${newUrls}\n</urlset>`);
  fs.writeFileSync(SITEMAP_FILE, xml);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const date = todayISO();
  const topics = pickTopics(ARTICLES_PER_DAY);

  console.log(`Generating ${topics.length} articles for ${date}...`);

  for (const topic of topics) {
    console.log(`  → ${topic.slug}`);
    const body = await generateArticleBody(topic);
    const html = buildArticlePage(topic, body, date);
    const outPath = path.join(POSTS_DIR, `${topic.slug}.html`);
    fs.writeFileSync(outPath, html);
    console.log(`     Saved: ${outPath}`);
  }

  updateBlogIndex(topics, date);
  console.log('  → blog.html updated');

  updateSitemap(topics, date);
  console.log('  → sitemap.xml updated');

  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
