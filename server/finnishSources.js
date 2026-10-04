import { readFileSync } from 'node:fs'

const kotusRows = readFileSync(new URL('./data/nykysuomensanalista2024.txt', import.meta.url), 'utf8')
  .trimEnd().split('\n').slice(1)
const kotusEntries = new Map()
for (const row of kotusRows) {
  const [lemma, homonym, partOfSpeech, inflection] = row.split('\t')
  const key = lemma.toLocaleLowerCase('fi')
  const entries = kotusEntries.get(key) || []
  entries.push({ homonym, partOfSpeech, inflection })
  kotusEntries.set(key, entries)
}

const attestedForms = new Set(readFileSync(new URL('./data/ftb-forms.tsv', import.meta.url), 'utf8').trimEnd().split('\n'))

export function getFinnishSourceEvidence(word, form = '') {
  const lemma = typeof word === 'string' ? word.trim().toLocaleLowerCase('fi') : ''
  const surface = typeof form === 'string' ? form.trim().toLocaleLowerCase('fi') : ''
  const entries = kotusEntries.get(lemma) || []
  return {
    lemmaListed: entries.length > 0,
    entries,
    formAttested: Boolean(surface && attestedForms.has(`${lemma}\t${surface}`)),
  }
}

export function handleFinnishSourceRequest(request, response) {
  response.setHeader('Content-Type', 'application/json')
  if (request.method !== 'GET') {
    response.statusCode = 405
    response.end(JSON.stringify({ error: 'Method not allowed.' }))
    return
  }
  const url = new URL(request.url, 'http://localhost')
  const word = url.searchParams.get('word') || ''
  const form = url.searchParams.get('form') || ''
  if (!word || word.length > 100 || form.length > 100) {
    response.statusCode = 400
    response.end(JSON.stringify({ error: 'Invalid word.' }))
    return
  }
  response.end(JSON.stringify({ evidence: getFinnishSourceEvidence(word, form) }))
}
