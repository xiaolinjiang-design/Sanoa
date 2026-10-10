import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyVerbNotes } from '../src/dailyVerbNotes.js'
import { getDailyVerbStudy, resolveDailyVerbPhrases } from '../src/dailyVerbLesson.js'
import { getPhraseFrame } from '../src/reviewCardContent.js'

test('every curated daily verb has a usable phrase frame and English meanings', () => {
  for (const [language, notes] of Object.entries(dailyVerbNotes)) {
    for (const [verb, note] of Object.entries(notes)) {
      assert.ok(getPhraseFrame(note.phrases), `${language} ${verb} has no phrase frame`)
      assert.ok(note.phrases.every((phrase) => phrase.text && phrase.meaning), `${language} ${verb} has a phrase without English`)
    }
  }
})

test('saved contextual verb recovers its linked phrase and adds compatible examples', () => {
  const rule = {
    verb: { word: 'avata' },
    objects: { ovi: 'oven' },
    example: () => [
      { text: 'Avaan oven.', meaning: 'I open the door.' },
      { text: 'Avaan ikkunan.', meaning: 'I open the window.' },
    ],
  }
  const phrases = resolveDailyVerbPhrases({
    word: 'avata', linkedWord: 'ovi', linkedEnglish: 'door',
    lessonPhrases: [{ text: 'Avaan oven.', meaning: 'I open the door.' }],
  }, dailyVerbNotes.fi.avata, [rule])
  assert.deepEqual(phrases.map((phrase) => phrase.text), ['Avaan oven.', 'Avaan ikkunan.', 'Avaan laatikon.'])
  assert.equal(phrases[0].linkedWord, 'ovi')
  assert.equal(getPhraseFrame(phrases).choices.length, 3)
})

test('curated verbs show every present-tense person and distinct chunks', () => {
  for (const [language, notes] of Object.entries(dailyVerbNotes)) {
    for (const [verb, note] of Object.entries(notes)) {
      const study = getDailyVerbStudy(verb, language)
      assert.equal(study.persons.length, 6, `${language} ${verb} is missing a person form`)
      assert.ok(study.persons.every(({ form }) => form), `${language} ${verb} has an empty form`)
      assert.ok(study.chunks.length > 0, `${language} ${verb} has no chunks`)
      assert.ok(study.chunks.every(({ text }) => !note.phrases.some((phrase) => phrase.text.toLocaleLowerCase().includes(text))), `${language} ${verb} repeats a phrase`)
    }
  }
  assert.deepEqual(getDailyVerbStudy('olla', 'fi').persons.map(({ form }) => form), ['olen', 'olet', 'on', 'olemme', 'olette', 'ovat'])
  assert.ok(getDailyVerbStudy('äta', 'sv').persons.every(({ form }) => form === 'äter'))
})
