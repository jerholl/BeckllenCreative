/**
 * Generates feed.xml (RSS 2.0) from Sanity blog posts.
 * Run: node scripts/generate-feed.js
 * Use the output feed.xml for social automation (Zapier, IFTTT, Buffer, etc.)
 */

const fs = require('fs')
const path = require('path')

const SITE_URL = 'https://beckllencreative.com'
const BLOG_URL = `${SITE_URL}/blog`
const FEED_PATH = path.join(__dirname, '..', 'feed.xml')

const SANITY_CONFIG = {
  projectId: '1bc130p1',
  dataset: 'production',
  apiVersion: '2024-02-24'
}

const FALLBACK_POSTS = [
  { slug: 'story-first-branding', title: 'Why Story-First Branding Converts Better Than Features', excerpt: 'People remember emotion first, details second.', date: '2026-02-01' },
  { slug: 'hotel-video-mistakes', title: '3 Video Mistakes Hotels Make (And How to Fix Them)', excerpt: 'Most hospitality videos look polished but feel generic.', date: '2026-01-24' },
  { slug: 'small-business-brand-film', title: 'Do Small Businesses Need a Brand Film?', excerpt: 'If you rely on trust and word of mouth, a short cinematic brand film can outperform endless promo posts.', date: '2026-01-16' },
  { slug: 'social-cuts-from-one-shoot', title: 'How to Get 30 Social Clips from One Shoot Day', excerpt: 'Plan one narrative shoot and repurpose it intelligently across reels, stories, and campaign content.', date: '2026-01-09' }
]

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toRfc2822(dateStr) {
  const d = new Date(dateStr)
  return d.toUTCString()
}

function buildItem(post) {
  const link = `${SITE_URL}/article?slug=${encodeURIComponent(post.slug)}`
  const pubDate = toRfc2822(post.date)
  const desc = escapeXml(post.excerpt || post.title)
  const title = escapeXml(post.title)
  const image = post.image ? `\n    <enclosure url="${escapeXml(post.image)}" type="image/jpeg"/>` : ''
  return `  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <description>${desc}</description>
    <pubDate>${pubDate}</pubDate>${image}
  </item>`
}

async function fetchPosts() {
  const query = encodeURIComponent(`
    *[_type == "post"] | order(coalesce(publishedAt, _createdAt) desc) {
      "slug": slug.current, title,
      "excerpt": pt::text(body)[0..200],
      "image": mainImage.asset->url,
      "date": coalesce(publishedAt, _createdAt)
    }
  `)
  const url = `https://${SANITY_CONFIG.projectId}.api.sanity.io/v${SANITY_CONFIG.apiVersion}/data/query/${SANITY_CONFIG.dataset}?query=${query}`
  try {
    const res = await fetch(url)
    const json = await res.json()
    if (json.result && json.result.length > 0) return json.result
  } catch (e) {
    console.warn('Sanity fetch failed, using fallback:', e.message)
  }
  return FALLBACK_POSTS
}

async function main() {
  const posts = await fetchPosts()
  const items = posts.map(buildItem).join('\n')
  const lastBuild = toRfc2822(new Date())

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Beckllen Creative Blog</title>
    <link>${BLOG_URL}</link>
    <description>Insights on cinematic branding, hospitality marketing, and the stories behind great brands.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  fs.writeFileSync(FEED_PATH, xml, 'utf8')
  console.log(`✓ feed.xml generated with ${posts.length} posts`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
