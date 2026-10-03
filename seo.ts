// Vite plugin: bakes crawlable text, meta tags and JSON-LD into index.html from public/content/*.json.
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const SITE = 'https://porasnagar.github.io/'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function read(root: string, file: string) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'public', 'content', file), 'utf8'))
  } catch {
    return null
  }
}

const text = (side: any, alt: any) => (side && typeof side === 'object' ? side.text : side ?? alt ?? '')

export function seo(): Plugin {
  let root = process.cwd()
  return {
    name: 'portfolio-seo',
    configResolved(c) {
      root = c.root
    },
    transformIndexHtml(html) {
      const p = read(root, 'profile.json') ?? {}
      const records: any[] = read(root, 'records.json') ?? []
      const name = p.name ?? 'Poras Nagar'
      const title = `${name} — ${p.role ?? 'AI Engineer & Full-Stack Developer'}`
      const desc = `${p.role ?? ''} in ${p.location ?? ''}. ${String(p.summary ?? '').split('. ')[0]}. Projects: ${records
        .slice(0, 6)
        .map((r) => r.title)
        .join(', ')}.`.slice(0, 300)

      const sameAs = Object.values(p.links ?? {})
      const ld = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Person',
            '@id': `${SITE}#me`,
            name,
            url: SITE,
            jobTitle: p.role,
            worksFor: p.current ? { '@type': 'Organization', name: String(p.current).replace(/^.* at /, '') } : undefined,
            homeLocation: p.location ? { '@type': 'Place', name: p.location } : undefined,
            alumniOf: p.education ? { '@type': 'CollegeOrUniversity', name: String(p.education).split('—').pop()?.replace(/\(.*\)/, '').trim() } : undefined,
            knowsAbout: p.skills,
            sameAs,
          },
          {
            '@type': 'ItemList',
            name: `Projects by ${name}`,
            itemListElement: records.map((r, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'CreativeWork',
                name: r.title,
                description: `${r.subtitle}. ${text(r.sideB, r.built)}`,
                dateCreated: r.year,
                author: { '@id': `${SITE}#me` },
                keywords: (r.credits ?? r.stack ?? []).join(', '),
                url: r.links?.[0]?.href,
              },
            })),
          },
        ],
      }

      const head = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${SITE}" />
    <meta name="author" content="${esc(name)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="${esc(name)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${SITE}" />
    <meta property="og:image" content="${SITE}og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="A cozy 3D listening room with a turntable and record sleeves for each project" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(desc)}" />
    <meta name="twitter:image" content="${SITE}og.png" />
    <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`

      const body = `
    <main id="seo" class="sr-only">
      <h1>${esc(name)}</h1>
      <p>${esc(p.role)} · ${esc(p.current)} · ${esc(p.location)}</p>
      <p>${esc(p.summary)}</p>
      <p>${esc(p.education)}</p>
      <h2>Projects</h2>
      ${records
        .map(
          (r) => `<article>
        <h3>${esc(r.title)}: ${esc(r.subtitle)} (${esc(r.year)})</h3>
        <p>${esc(text(r.sideA, r.problem))}</p>
        <p>${esc(text(r.sideB, r.built))}</p>
        <p>Built with ${esc((r.credits ?? r.stack ?? []).join(', '))}</p>
        ${(r.links ?? []).map((l: any) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(' ')}
      </article>`,
        )
        .join('\n      ')}
      <h2>Contact</h2>
      <p>${Object.entries(p.links ?? {})
        .map(([k, v]) => `<a href="${esc(v)}" rel="me">${esc(k)}</a>`)
        .join(' ')}</p>
    </main>`

      return html
        .replace(/<title>[\s\S]*?<\/title>\s*/, '')
        .replace(/\s*<meta name="description"[^>]*>/, '')
        .replace(/\s*<meta property="og:[^>]*>/g, '')
        .replace('</head>', `${head}\n  </head>`)
        .replace('<div id="root"></div>', `${body}\n    <div id="root"></div>`)
    },
  }
}
