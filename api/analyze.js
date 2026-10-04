import { analyzeWithDeepSeek } from '../server/deepseek.js'

export const maxDuration = 60

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await analyzeWithDeepSeek(body, process.env.DEEPSEEK_API_KEY)
    return Response.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not analyze this photo.'
    const status = /not configured/.test(message) ? 503 : /DeepSeek request failed|DeepSeek returned/.test(message) ? 502 : 400
    return Response.json({ error: message }, { status })
  }
}
