import { translateSentenceWithDeepSeek } from '../server/translation.js'

export const maxDuration = 30

export async function POST(request) {
  try {
    const body = await request.json()
    const translation = await translateSentenceWithDeepSeek(body, process.env.DEEPSEEK_API_KEY)
    return Response.json({ translation })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not translate this sentence.'
    const status = /not configured/.test(message) ? 503 : /request failed|returned/.test(message) ? 502 : 400
    return Response.json({ error: message }, { status })
  }
}
