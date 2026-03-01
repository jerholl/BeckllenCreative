/**
 * Netlify serverless function: serves RSS feed dynamically from Sanity.
 * URL: https://yoursite.com/.netlify/functions/rss
 * Or add a redirect in netlify.toml: /feed.xml -> /.netlify/functions/rss
 */

const SITE_URL = 'https://beckllencreative.com'
const BLOG_URL = `${SITE_URL}/blog`
const SANITY_PROJECT = '1bc130p1'
const SANITY_DATASET = 'production'
const SANITY_VERSION = '2024-02-24'

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

function toRfc2822(d) {
  return new Date(d).toUTCString()
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

exports.handler = async function () {
  const query = encodeURIComponent(`
    *[_type == "post"] | order(coalesce(publishedAt, _createdAt) desc) {
      "slug": slug.current, title,
      "excerpt": pt::text(body)[0..200],
      "image": mainImage.asset->url,
      "date": coalesce(publishedAt, _createdAt)
    }
  `)
  let posts = FALLBACK_POSTS
  try {
    const res = await fetch(
      `https://${SANITY_PROJECT}.api.sanity.io/v${SANITY_VERSION}/data/query/${SANITY_DATASET}?query=${query}`
    )
    const json = await res.json()
    if (json.result && json.result.length > 0) posts = json.result
  } catch (e) {
    console.warn('Sanity fetch failed:', e.message)
  }

  const items = posts.map(buildItem).join('\n')
  const lastBuild = toRfc2822(new Date())
  const feedUrl = `${SITE_URL}/feed.xml`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Beckllen Creative Blog</title>
    <link>${BLOG_URL}</link>
    <description>Insights on cinematic branding, hospitality marketing, and the stories behind great brands.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    },
    body: xml
  }
}
