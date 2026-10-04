import { getFinnishSourceEvidence } from '../server/finnishSources.js'

export async function GET(request) {
  const url = new URL(request.url)
  const word = url.searchParams.get('word') || ''
  const form = url.searchParams.get('form') || ''
  if (!word || word.length > 100 || form.length > 100) {
    return Response.json({ error: 'Invalid word.' }, { status: 400 })
  }
  return Response.json({ evidence: getFinnishSourceEvidence(word, form) })
}
