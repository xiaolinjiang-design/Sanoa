const MAX_REQUEST_BYTES = 4096

function normalize(value) {
  return value?.trim().replace(/[.!?]+$/u, '').toLocaleLowerCase() || ''
}

function containsForm(sentence, form) {
  if (!sentence || !form) return false
  const text = sentence.toLocaleLowerCase()
  const value = form.trim().toLocaleLowerCase()
  const index = text.indexOf(value)
  if (index < 0) return false
  const before = text[index - 1]
  const after = text[index + value.length]
  return (!before || !/[\p{L}\p{N}]/u.test(before)) && (!after || !/[\p{L}\p{N}]/u.test(after))
}

export async function generateWordStudy({ word, english, targetLanguage, sentence, expression }, apiKey, fetchImpl = fetch) {
  if (!apiKey) throw new Error('DeepSeek is not configured.')
  if (!['Finnish', 'Swedish'].includes(targetLanguage)) throw new Error('Unsupported target language.')
  if (typeof word !== 'string' || !word.trim() || word.length > 80 || typeof english !== 'string' || english.length > 120) {
    throw new Error('A short word and meaning are required.')
  }

  const prompt = `Create a compact ${targetLanguage} noun study card for the word "${word.trim()}" (${english.trim()}).
Saved example: ${String(sentence || '').slice(0, 300)}
Other example: ${String(expression || '').slice(0, 300)}
Return only JSON: {"forms":[{"form":"word form","meaning":"short English meaning or grammatical role"}],"chunks":[{"text":"short ${targetLanguage} reusable combination","meaning":"short English meaning"}],"phrases":[{"text":"complete ${targetLanguage} example sentence","meaning":"natural English translation","targetForm":"exact form of the taught noun appearing in text","formNote":"short plain-English explanation of why this form is used here"}]}.
Give 2–4 accurate, common forms appropriate for this noun, starting with the dictionary/base form. For Finnish, prefer useful singular cases or a common plural; for Swedish, prefer definite and plural forms where natural. Give two natural 2–4 word collocations that include this noun or an inflected form. Chunks must be reusable combinations, not a full example sentence or a sentence split into individual words. Give two short, natural, distinct example sentences using this noun; do not repeat either saved example or turn a chunk into a sentence by only adding punctuation. In each phrase, targetForm must exactly match the word as written there, including any inflection. Explain any stem or ending change and the form's role in the sentence; if the base form is unchanged, explain its role briefly. If unsure of a form, omit it rather than guessing.`

  const response = await fetchImpl('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-flash',
      thinking: { type: 'disabled' },
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message || `Word study request failed (${response.status}).`)
  let result
  try {
    result = JSON.parse(payload?.choices?.[0]?.message?.content?.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '') || '')
  } catch {
    throw new Error('The word study service returned an invalid result.')
  }
  const forms = Array.isArray(result.forms) ? result.forms.filter((entry) => typeof entry?.form === 'string' && entry.form.trim() && entry.form.length <= 80 && typeof entry.meaning === 'string' && entry.meaning.length <= 120).filter((entry, index, all) => all.findIndex((candidate) => normalize(candidate.form) === normalize(entry.form)) === index).slice(0, 4) : []
  const examples = new Set([normalize(sentence), normalize(expression)])
  const chunks = Array.isArray(result.chunks) ? result.chunks.filter((entry) => typeof entry?.text === 'string' && entry.text.trim() && entry.text.length <= 100 && !examples.has(normalize(entry.text)) && entry.text.trim().split(/\s+/u).length >= 2 && typeof entry.meaning === 'string' && entry.meaning.length <= 120).slice(0, 3) : []
  const phrases = Array.isArray(result.phrases) ? result.phrases.filter((entry) => typeof entry?.text === 'string' && entry.text.trim() && entry.text.length <= 180 && !examples.has(normalize(entry.text)) && typeof entry.meaning === 'string' && entry.meaning.trim() && entry.meaning.length <= 180 && typeof entry.targetForm === 'string' && containsForm(entry.text, entry.targetForm) && typeof entry.formNote === 'string' && entry.formNote.trim() && entry.formNote.length <= 240).filter((entry, index, all) => all.findIndex((candidate) => normalize(candidate.text) === normalize(entry.text)) === index).slice(0, 2) : []
  if (forms.length < 2 || !chunks.length || !phrases.length) throw new Error('The word study service returned incomplete lesson content.')
  return { forms, chunks, phrases }
}

export async function handleWordStudyRequest(request, response, apiKey) {
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
      if (body.length > MAX_REQUEST_BYTES) throw new Error('The word study request is too long.')
    }
    const study = await generateWordStudy(JSON.parse(body), apiKey)
    response.statusCode = 200
    response.end(JSON.stringify(study))
  } catch (error) {
    response.statusCode = /not configured/.test(error.message) ? 503 : /request failed|service returned/.test(error.message) ? 502 : 400
    response.end(JSON.stringify({ error: error.message || 'Could not build this word study.' }))
  }
}
