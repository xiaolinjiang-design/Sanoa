import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getFinnishSourceEvidence } from '../server/finnishSources.js'
import { GET } from '../api/lexicon.js'

test('Kotus entries retain part of speech and inflection type', () => {
  const evidence = getFinnishSourceEvidence('PULLA', 'pullaa')
  assert.equal(evidence.lemmaListed, true)
  assert.equal(evidence.entries[0].partOfSpeech, 'substantiivi')
  assert.equal(evidence.entries[0].inflection, '10')
  assert.equal(evidence.formAttested, true)
})

test('FinnTreeBank only attests the matching lemma and surface form', () => {
  assert.equal(getFinnishSourceEvidence('juoda', 'juon').formAttested, true)
  assert.equal(getFinnishSourceEvidence('pulla', 'juon').formAttested, false)
  assert.equal(getFinnishSourceEvidence('not-a-finnish-word').lemmaListed, false)
})

test('bundled Kotus file matches recorded source hash', () => {
  const data = readFileSync(new URL('../server/data/nykysuomensanalista2024.txt', import.meta.url))
  const provenance = JSON.parse(readFileSync(new URL('../server/data/provenance.json', import.meta.url), 'utf8'))
  assert.equal(createHash('sha256').update(data).digest('hex'), provenance.kotus.sha256)
})

test('lexicon endpoint validates input and returns evidence', async () => {
  const valid = await GET(new Request('http://localhost/api/lexicon?word=juoda&form=juon'))
  assert.equal(valid.status, 200)
  const { evidence } = await valid.json()
  assert.equal(evidence.lemmaListed, true)
  assert.equal(evidence.formAttested, true)
  const invalid = await GET(new Request('http://localhost/api/lexicon'))
  assert.equal(invalid.status, 400)
})
