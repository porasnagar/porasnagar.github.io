// Builds the site and pushes it to the GitHub Pages repo's main branch.
// content/ already in that repo is never overwritten: it is edited on GitHub and read by the site at runtime.
// Usage: node tools/deploy-pages.mjs [--dry]
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const REPO = 'https://github.com/porasnagar/porasnagar.github.io.git'
const KEEP = new Set(['.git', 'content', 'CNAME'])
const dry = process.argv.includes('--dry')
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..')
const run = (cmd, args, cwd = root) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'inherit'], shell: process.platform === 'win32' }).toString().trim()

run('npm', ['run', 'build'])
const dist = path.join(root, 'dist')
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
fs.writeFileSync(path.join(dist, '.nojekyll'), '')

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'))
run('git', ['clone', '--depth', '1', REPO, work])
const hadContent = fs.existsSync(path.join(work, 'content'))

for (const name of fs.readdirSync(work)) if (!KEEP.has(name)) fs.rmSync(path.join(work, name), { recursive: true, force: true })
for (const name of fs.readdirSync(dist)) {
  if (name === 'content' && hadContent) continue
  fs.cpSync(path.join(dist, name), path.join(work, name), { recursive: true })
}

run('git', ['add', '-A'], work)
const changed = run('git', ['status', '--porcelain'], work)
if (!changed) {
  console.log('Nothing to deploy.')
  process.exit(0)
}
const source = run('git', ['rev-parse', '--short', 'HEAD'])
run('git', ['commit', '-m', `Deploy listening room (source ${source})\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`], work)
console.log(run('git', ['show', '--stat', '--oneline', 'HEAD'], work).split('\n').slice(0, 12).join('\n'))
if (dry) console.log(`Dry run: not pushed. Inspect ${work}`)
else console.log(run('git', ['push', 'origin', 'HEAD:main'], work) || 'Pushed to main.')
