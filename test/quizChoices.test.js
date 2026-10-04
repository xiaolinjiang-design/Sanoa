import test from 'node:test'
import assert from 'node:assert/strict'
import { pickDistinctStickerChoices, stickerVisualKey } from '../src/quizChoices.js'

test('quiz choices do not repeat the answer sticker or another option', () => {
  const answer = { word: 'avata', icon: '🚪' }
  const candidates = [
    { word: 'ovi', icon: '🚪' },
    { word: 'kahvi', icon: '☕' },
    { word: 'tee', icon: '☕' },
    { word: 'avain', icon: '🔑' },
    { word: 'kenkä', icon: '👟' },
  ]

  const choices = [answer, ...pickDistinctStickerChoices(answer, candidates)]
  assert.deepEqual(choices.map((item) => item.word), ['avata', 'kahvi', 'avain', 'kenkä'])
  assert.equal(new Set(choices.map(stickerVisualKey)).size, choices.length)
})

test('quiz choices compare the image the sticker actually renders', () => {
  const answer = { word: 'ovi', stickerImage: 'data:image/png;base64,door', icon: '🚪' }
  const candidates = [
    { word: 'avata', stickerImage: 'data:image/png;base64,door', icon: '🔓' },
    { word: 'kahvi', image: '/assets/coffee.png', icon: '🚪' },
  ]

  assert.deepEqual(pickDistinctStickerChoices(answer, candidates).map((item) => item.word), ['kahvi'])
})
