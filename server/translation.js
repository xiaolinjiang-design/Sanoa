const MAX_SENTENCE_LENGTH = 500

export async function translateSentenceWithDeepSeek({ sentence, targetLanguage }, apiKey, fetchImpl = fetch) {
  if (!apiKey) throw new Error('DeepSeek is not configured. Add DEEPSEEK_API_KEY to your .env file and restart the app.')
  if (!['Finnish', 'Swedish'].includes(targetLanguage)) throw new Error('Unsupported target language.')
  if (typeof sentence !== 'string' || !sentence.trim() || sentence.length > MAX_SENTENCE_LENGTH) {
    throw new Error('Please provide a short sentence to translate.')
  }

  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-flash',
      thinking: { type: 'disabled' },
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `Translate the ${targetLanguage} sentence into natural English. Preserve its meaning. Return only JSON with one string field named translation.` },
        { role: 'user', content: sentence.trim() },
      ],
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message || `Translation request failed (${response.status}).`)
  const content = payload?.choices?.[0]?.message?.content
  if (!content) throw new Error('The translation service returned no result.')
  let result
  try {
    result = JSON.parse(content.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
  } catch {
    throw new Error('The translation service returned an invalid result.')
  }
  if (typeof result.translation !== 'string' || !result.translation.trim()) {
    throw new Error('The translation service returned no English translation.')
  }
  return result.translation.trim()
}

export async function handleTranslationRequest(request, response, apiKey) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'Method not allowed.' }))
    return
  }

  try {
    let body = ''
    for await (const chunk of request) {
      body += chunk
      if (body.length > 2048) throw new Error('The sentence is too long.')
    }
    const translation = await translateSentenceWithDeepSeek(JSON.parse(body), apiKey)
    response.statusCode = 200
    response.end(JSON.stringify({ translation }))
  } catch (error) {
    response.statusCode = /not configured/.test(error.message) ? 503 : /request failed|returned/.test(error.message) ? 502 : 400
    response.end(JSON.stringify({ error: error.message || 'Could not translate this sentence.' }))
  }
}
