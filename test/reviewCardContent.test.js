import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReviewCardContent, getPhraseFrame } from '../src/reviewCardContent.js'

test('seed word uses its sentence and the form actually shown there', () => {
  const content = buildReviewCardContent({
    word: 'kahvi', english: 'coffee', sentence: 'Juon kahvia aamulla.',
    sentenceParts: [{ word: 'Juon', meaning: 'I drink' }, { word: 'kahvia', meaning: 'coffee' }],
  }, [{ form: 'kahvi', meaning: 'coffee' }, { form: 'kahvia', meaning: 'some coffee' }])
  assert.deepEqual(content.forms.map((entry) => entry.form), ['kahvi', 'kahvia'])
  assert.equal(content.phrases[0].text, 'Juon kahvia aamulla.')
  assert.equal(content.chunks.length, 2)
})

test('captured word keeps one saved form and two distinct phrases', () => {
  const content = buildReviewCardContent({
    word: 'puhelin', english: 'phone', form: 'puhelinta', formMeaning: 'phone as an object',
    sentence: 'Pidän puhelinta kädessä.',
    expression: { sentence: 'Missä puhelin on?', translation: 'Where is the phone?' },
    sentenceParts: [{ word: 'Pidän', meaning: 'I hold' }, { word: 'puhelinta', meaning: 'phone' }],
  })
  assert.deepEqual(content.forms.map((entry) => entry.form), ['puhelin', 'puhelinta'])
  assert.equal(content.phrases.length, 2)
})

test('short phrase retains its phrase and parts without inventing inflections', () => {
  const content = buildReviewCardContent({
    kind: 'phrase', word: 'Seuraava asema', english: 'Next station',
    sentence: 'Seuraava asema on Kamppi.',
    sentenceParts: [{ word: 'Seuraava', meaning: 'next' }, { word: 'asema', meaning: 'station' }, { word: '.', meaning: 'period' }],
  })
  assert.equal(content.phrases.length, 2)
  assert.deepEqual(content.forms, [])
  assert.deepEqual(content.chunks.map((part) => part.word), ['Seuraava', 'asema'])
})

test('older sparse cards still have meaningful tab content', () => {
  const content = buildReviewCardContent({ word: 'ovi', english: 'door' })
  assert.equal(content.phrases.length, 0)
  assert.deepEqual(content.forms, [{ form: 'ovi', meaning: 'door' }])
  assert.deepEqual(content.chunks, [{ word: 'ovi', meaning: 'door' }])
})

test('curated forms appear on collection cards even when another form is used in the example', () => {
  const content = buildReviewCardContent({
    word: 'vesipullo', english: 'water bottle', form: 'vesipullossa', formMeaning: 'in the water bottle',
    sentence: 'Minulla on vesipullo laukussa.',
  }, [{ form: 'vesipullon', meaning: 'of the bottle' }, { form: 'vesipulloa', meaning: 'some bottle' }])
  assert.equal(content.variant, null)
  assert.deepEqual(content.forms.map((entry) => entry.form), ['vesipullo', 'vesipullon', 'vesipulloa'])
  assert.ok(!content.forms.some((entry) => entry.form === 'vesipullossa'))
})

test('chunks do not repeat full phrases and duplicate parts are removed', () => {
  const content = buildReviewCardContent({
    word: 'ovi', english: 'door', sentence: 'Ovi on auki.',
    sentenceParts: [{ word: 'Ovi on auki.', meaning: 'The door is open.' }, { word: 'ovi', meaning: 'door' }, { word: 'Ovi', meaning: 'door' }],
  })
  assert.deepEqual(content.chunks.map((part) => part.word), ['ovi'])
})

test('chunks use a frame only when the examples change one final word', () => {
  const parallel = getPhraseFrame([
    { text: 'Juon vettä.', translation: 'I drink water.' },
    { text: 'Juon kahvia.', translation: 'I drink coffee.' },
  ])
  assert.equal(parallel.fixed, 'Juon')
  assert.deepEqual(parallel.choices.map((choice) => choice.variable), ['vettä', 'kahvia'])
  assert.equal(getPhraseFrame([{ text: 'Juon vettä.' }, { text: 'Voitko juoda vettä?' }]), null)
  assert.equal(getPhraseFrame([{ text: 'Juon vettä.' }, { text: 'Juon kahvia aamulla.' }]), null)
})

test('a noun phrase can be one replaceable chunk and include three examples', () => {
  const frame = getPhraseFrame([
    { text: 'Jag äter en kanelbulle.', meaning: 'I eat a cinnamon bun.' },
    { text: 'Jag äter ett äpple.', meaning: 'I eat an apple.' },
    { text: 'Jag äter en banan.', meaning: 'I eat a banana.' },
  ])
  assert.equal(frame.fixed, 'Jag äter')
  assert.deepEqual(frame.choices.map((choice) => choice.variable), ['en kanelbulle', 'ett äpple', 'en banan'])
})

test('saved verb cards include recommended phrases in their tabs', () => {
  const content = buildReviewCardContent({ word: 'avata', english: 'to open', sentence: 'Avaan oven.' },
    [{ form: 'avaan', meaning: 'I open' }],
    [{ text: 'Avaan oven.', meaning: 'I open the door.' }, { text: 'Avaan ikkunan.', meaning: 'I open the window.' }])
  assert.deepEqual(content.phrases.map((phrase) => phrase.text), ['Avaan oven.', 'Avaan ikkunan.'])
  assert.equal(content.variant.form, 'avaan')
  assert.deepEqual(content.frame.choices.map((choice) => choice.variable), ['oven', 'ikkunan'])
})
