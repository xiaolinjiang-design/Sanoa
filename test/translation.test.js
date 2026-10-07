import test from 'node:test'
import assert from 'node:assert/strict'
import { translateSentenceWithDeepSeek } from '../server/translation.js'
import { analyzeWithDeepSeek } from '../server/deepseek.js'

test('translates a saved Finnish sentence into English', async () => {
  const calls = []
  const translation = await translateSentenceWithDeepSeek(
    { sentence: 'Hän pitää puhelinta kädessään.', targetLanguage: 'Finnish' },
    'test-key',
    async (_url, options) => {
      calls.push(JSON.parse(options.body))
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"translation":"They are holding a phone in their hand."}' } }] }) }
    },
  )
  assert.equal(translation, 'They are holding a phone in their hand.')
  assert.equal(calls[0].messages[1].content, 'Hän pitää puhelinta kädessään.')
  assert.equal(calls[0].messages[0].content.includes('Finnish'), true)
})

test('rejects a translation response with no English text', async () => {
  await assert.rejects(
    translateSentenceWithDeepSeek(
      { sentence: 'Ovi on auki.', targetLanguage: 'Finnish' },
      'test-key',
      async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"translation":""}' } }] }) }),
    ),
    /no English translation/,
  )
})

test('capture repairs missing sentence and expression translations before returning', async (context) => {
  const originalFetch = globalThis.fetch
  const responses = [
    { english: 'door', word: 'dörr', ipa: '/dœrː/', collection: 'Home', sentence: 'Dörren är öppen.', sentenceParts: [{ word: 'Dörren', meaning: 'the door' }], expression: { sentence: 'Öppna dörren.', wordForm: 'dörren' } },
    { translation: 'The door is open.' },
    { translation: 'Open the door.' },
  ]
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(responses.shift()) } }] }) })
  context.after(() => { globalThis.fetch = originalFetch })
  const result = await analyzeWithDeepSeek({ image: 'data:image/png;base64,AA==', captureMode: 'object', targetLanguage: 'Swedish' }, 'test-key')
  assert.equal(result.sentenceTranslation, 'The door is open.')
  assert.equal(result.expression.translation, 'Open the door.')
  assert.equal(result.expression.wordForm, 'dörren')
})
