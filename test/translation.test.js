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
  assert.deepEqual(calls[0].thinking, { type: 'disabled' })
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


test('missing translations start together instead of serializing capture completion', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  const pending = []
  const analysis = { english: 'door', word: 'dörr', ipa: '/dœrː/', collection: 'Home', sentence: 'Dörren är öppen.', sentenceParts: [{ word: 'Dörren', meaning: 'the door' }], expression: { sentence: 'Öppna dörren.', wordForm: 'dörren' } }
  const response = (value) => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(value) } }] }) })
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body).thinking, { type: 'disabled' })
    if (calls++ === 0) return response(analysis)
    return new Promise((resolve) => pending.push(resolve))
  }
  const capture = analyzeWithDeepSeek({ image: 'data:image/png;base64,AA==', captureMode: 'object', targetLanguage: 'Swedish' }, 'test-key')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(pending.length, 2, 'both translation requests must start before either completes')
  pending[1](response({ translation: 'Open the door.' }))
  pending[0](response({ translation: 'The door is open.' }))
  const result = await capture
  assert.equal(result.sentenceTranslation, 'The door is open.')
  assert.equal(result.expression.translation, 'Open the door.')
})

test('face detection stops before lesson validation or translation requests', async (context) => {
  const originalFetch = globalThis.fetch
  context.after(() => { globalThis.fetch = originalFetch })
  let calls = 0
  globalThis.fetch = async (_url, options) => {
    calls += 1
    const request = JSON.parse(options.body)
    assert.match(request.messages[0].content[0].text, /human face/)
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"blocked":true,"reason":"human_face"}' } }] }) }
  }
  for (const captureMode of ['object', 'phrase']) {
    const result = await analyzeWithDeepSeek({ image: 'data:image/png;base64,AA==', captureMode, targetLanguage: 'Finnish' }, 'test-key')
    assert.deepEqual(result, { blocked: true, reason: 'human_face' })
  }
  assert.equal(calls, 2)
})
