import { getFinnishSourceEvidence } from './finnishSources.js'
import { translateSentenceWithDeepSeek } from './translation.js'

const MAX_BODY_BYTES = 12 * 1024 * 1024

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > MAX_BODY_BYTES) reject(new Error('The photo is too large. Please choose a smaller image.'))
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Invalid request body.'))
      }
    })
    request.on('error', reject)
  })
}

function cleanJson(text) {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(trimmed)
}

function validateResult(result) {
  if (!result || typeof result !== 'object') throw new Error('The model returned an empty result.')
  for (const field of ['english', 'word', 'ipa', 'collection', 'sentence', 'sentenceTranslation']) {
    if (typeof result[field] !== 'string' || !result[field].trim()) throw new Error(`The model response is missing ${field}.`)
  }
  if (!Array.isArray(result.sentenceParts) || !result.sentenceParts.length) throw new Error('The model response is missing the sentence breakdown.')
  return result
}

export async function analyzeWithDeepSeek({ image, captureMode, targetLanguage }, apiKey) {
  if (!apiKey) throw new Error('DeepSeek is not configured. Add DEEPSEEK_API_KEY to your .env file and restart the app.')
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(image || '')) throw new Error('Please provide a JPEG, PNG, or WebP photo.')
  if (!['object', 'phrase'].includes(captureMode)) throw new Error('Unsupported capture mode.')
  if (!['Finnish', 'Swedish'].includes(targetLanguage)) throw new Error('Unsupported target language.')

  const task = captureMode === 'object'
    ? `Identify the single most prominent everyday object. Give its common English name and teach its common ${targetLanguage} name.`
    : `Read the most prominent short phrase or sign. If it is already ${targetLanguage}, preserve its wording; otherwise translate it naturally into ${targetLanguage}. Give its English meaning.`

  const prompt = `${task}
Return only one valid JSON object with this exact shape:
{
  "english": "short English meaning",
  "word": "${targetLanguage} word or phrase",
  "ipa": "/IPA pronunciation/",
  "form": "a useful inflected form, or empty string for a phrase",
  "formIpa": "/IPA for that form/, or empty string",
  "formMeaning": "English meaning of the form, or empty string",
  "formChange": "plain-English description of which letters or ending changed from word to form, or empty string",
  "formReason": "plain-English reason this form is used in the example sentence, or empty string",
  "collection": "a concise English everyday category name",
  "sentence": "a short natural ${targetLanguage} example sentence",
  "sentenceTranslation": "natural English translation of the example sentence",
  "sentenceParts": [{"word":"part from the sentence","ipa":"/IPA/","meaning":"plain English meaning"}],
  "icon": "one representative emoji",
  "expression": {"sentence":"a common useful ${targetLanguage} expression containing the word","translation":"English translation"},
  "boundingBox": {"x": 0, "y": 0, "width": 100, "height": 100}
}
Use accurate IPA. Break down every meaningful word or phrase of the example sentence in reading order. Never include punctuation as a sentenceParts entry. Do not invent text that is not visible when reading a phrase.
The collection name must always be concise English, even when the target language is Finnish or Swedish. For an object, "word" must always be the common dictionary/base singular noun shown on the sticker—never a changed form from the example sentence. Set "form" to the exact changed form of that noun that appears in the example sentence. Explain both the spelling/ending change and the sentence role in plain English. For example, Finnish "lasi" → "lasin": add -n; it marks the glass as the object being lifted. Keep form fields empty only when the base form itself appears in the sentence or the item is a phrase.
For an object, boundingBox must tightly surround only the identified object—not a hand holding it or nearby furniture. Values are percentages of the full image from 0 to 100. For a phrase, bound the visible sign or text region.`

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-flash',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: image, detail: captureMode === 'phrase' ? 'original' : 'low' } },
        ],
      }],
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error?.message || `DeepSeek request failed (${response.status}).`)
  const content = payload?.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek returned no analysis.')
  const result = cleanJson(content)
  if ((typeof result?.sentenceTranslation !== 'string' || !result.sentenceTranslation.trim()) && typeof result?.sentence === 'string' && result.sentence.trim()) {
    result.sentenceTranslation = await translateSentenceWithDeepSeek({ sentence: result.sentence, targetLanguage }, apiKey)
  }
  if (typeof result?.expression?.sentence === 'string' && result.expression.sentence.trim() && (typeof result.expression.translation !== 'string' || !result.expression.translation.trim())) {
    result.expression.translation = await translateSentenceWithDeepSeek({ sentence: result.expression.sentence, targetLanguage }, apiKey)
  }
  validateResult(result)
  if (targetLanguage === 'Finnish' && captureMode === 'object') {
    result.sourceEvidence = getFinnishSourceEvidence(result.word, result.form)
  }
  return result
}

export async function handleAnalyzeRequest(request, response, apiKey) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'POST') {
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'Method not allowed.' }))
    return
  }

  try {
    const body = await readJsonBody(request)
    const result = await analyzeWithDeepSeek(body, apiKey)
    response.statusCode = 200
    response.end(JSON.stringify({ result }))
  } catch (error) {
    response.statusCode = /not configured/.test(error.message) ? 503 : 400
    response.end(JSON.stringify({ error: error.message || 'Could not analyze this photo.' }))
  }
}
