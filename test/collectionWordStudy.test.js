import test from 'node:test'
import assert from 'node:assert/strict'
import { getCollectionWordStudy } from '../src/collectionWordStudy.js'
import { buildReviewCardContent } from '../src/reviewCardContent.js'
import { generateWordStudy } from '../server/wordStudy.js'

test('built-in noun cards have forms and combinations distinct from their example', () => {
  const finnish = getCollectionWordStudy('kahvi', 'fi')
  assert.deepEqual(finnish.forms.map(({ form }) => form), ['kahvi', 'kahvin', 'kahvia'])
  assert.deepEqual(finnish.chunks.map(({ text }) => text), ['juoda kahvia', 'mustaa kahvia'])
  const swedish = getCollectionWordStudy('en vattenflaska', 'sv')
  assert.equal(swedish.forms[1].form, 'vattenflaskan')
  assert.equal(swedish.chunks.length, 2)
})

test('a saved word keeps its example and gains a second distinct phrase', () => {
  const study = getCollectionWordStudy('avain', 'fi')
  const content = buildReviewCardContent({ word: 'avain', english: 'key', sentence: 'Avaimeni ovat pöydällä.', sentenceTranslation: 'My keys are on the table.', sentenceTargetForm: study.sentenceTargetForm, sentenceFormNote: study.sentenceFormNote }, study.forms, study.phrases)
  assert.deepEqual(content.phrases.map(({ text }) => text), ['Avaimeni ovat pöydällä.', 'Avaan oven avaimella.'])
  assert.deepEqual(content.phrases.map(({ targetForm }) => targetForm), ['Avaimeni', 'avaimella'])
  assert.match(content.phrases[0].formNote, /-ni means “my/u)
  assert.match(content.phrases[1].formNote, /-lla means “with a key/u)
})

test('newly captured nouns can receive forms and independent chunks without resending an image', async () => {
  const calls = []
  const study = await generateWordStudy({ word: 'lamppu', english: 'lamp', targetLanguage: 'Finnish', sentence: 'Lamppu on pöydällä.' }, 'test-key', async (_url, options) => {
    calls.push(JSON.parse(options.body))
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({
      forms: [{ form: 'lamppu', meaning: 'lamp' }, { form: 'lampun', meaning: 'of the lamp' }],
      chunks: [{ text: 'sytyttää lamppu', meaning: 'turn on a lamp' }, { text: 'Lamppu on pöydällä.', meaning: 'The lamp is on the table.' }],
      phrases: [{ text: 'Missä lamppu on?', meaning: 'Where is the lamp?', targetForm: 'lamppu', formNote: 'The base form is the subject here.' }, { text: 'Lamppu on pöydällä.', meaning: 'The lamp is on the table.', targetForm: 'Lamppu', formNote: 'The base form is the subject here.' }],
    }) } }] }) }
  })
  assert.equal(calls[0].messages[0].content.includes('data:image'), false)
  assert.deepEqual(study.forms.map(({ form }) => form), ['lamppu', 'lampun'])
  assert.deepEqual(study.chunks.map(({ text }) => text), ['sytyttää lamppu'])
  assert.deepEqual(study.phrases.map(({ text }) => text), ['Missä lamppu on?'])
})
