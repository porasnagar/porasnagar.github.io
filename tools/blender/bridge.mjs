import net from 'node:net'
import fs from 'node:fs'

export function runInBlender(code, { host = 'localhost', port = Number(process.env.BLENDER_MCP_PORT) || 9876, strict = false, timeoutMs = 600_000 } = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host, port })
    const chunks = []
    const timer = setTimeout(() => {
      sock.destroy()
      reject(new Error(`timed out after ${timeoutMs} ms`))
    }, timeoutMs)
    sock.on('connect', () => sock.write(JSON.stringify({ type: 'execute', code, strict_json: strict }) + '\0'))
    sock.on('data', (d) => {
      chunks.push(d)
      const buf = Buffer.concat(chunks)
      const end = buf.indexOf(0)
      if (end >= 0) {
        clearTimeout(timer)
        sock.end()
        try {
          resolve(JSON.parse(buf.subarray(0, end).toString('utf8')))
        } catch (e) {
          reject(e)
        }
      }
    })
    sock.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
  })
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const arg = process.argv[2]
  if (!arg) {
    console.error('usage: node tools/blender/bridge.mjs <script.py | -e "python code">')
    process.exit(2)
  }
  const code = arg === '-e' ? process.argv[3] : fs.readFileSync(arg, 'utf8')
  runInBlender(code)
    .then((r) => {
      if (r.stdout) process.stdout.write(r.stdout)
      if (r.stderr) process.stderr.write(r.stderr)
      if (r.status !== 'ok') {
        console.error(r.message)
        process.exit(1)
      }
      console.log(JSON.stringify(r.result, null, 2))
    })
    .catch((e) => {
      console.error(String(e))
      process.exit(1)
    })
}
