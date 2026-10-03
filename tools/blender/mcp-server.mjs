import readline from 'node:readline'
import { runInBlender } from './bridge.mjs'

const PROTOCOL = '2025-06-18'

const tools = [
  {
    name: 'blender_python',
    description:
      'Run Python inside the running Blender (Blender Lab MCP add-on bridge, localhost:9876). ' +
      'bpy is available. Assign a JSON-serialisable dict to `result` to return data; print() output is returned too.',
    inputSchema: {
      type: 'object',
      properties: { code: { type: 'string', description: 'Python source to execute in Blender' } },
      required: ['code'],
    },
  },
]

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n')

async function handle(msg) {
  const { id, method, params } = msg
  if (method === 'initialize') {
    return send({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: 'blender-bridge', version: '0.1.0' },
      },
    })
  }
  if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} })
  if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools } })
  if (method === 'tools/call') {
    if (params?.name !== 'blender_python') {
      return send({ jsonrpc: '2.0', id, error: { code: -32602, message: `unknown tool ${params?.name}` } })
    }
    try {
      const r = await runInBlender(String(params.arguments?.code ?? ''))
      const parts = []
      if (r.stdout) parts.push(`stdout:\n${r.stdout}`)
      if (r.stderr) parts.push(`stderr:\n${r.stderr}`)
      parts.push(r.status === 'ok' ? JSON.stringify(r.result, null, 2) : r.message)
      return send({
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: parts.join('\n\n') }], isError: r.status !== 'ok' },
      })
    } catch (e) {
      return send({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Could not reach Blender on localhost:9876 (${e}). Is Blender open with the MCP server started?` }],
          isError: true,
        },
      })
    }
  }
  if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } })
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }
  void handle(msg)
})
