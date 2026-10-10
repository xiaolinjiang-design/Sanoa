import { getPhraseFrame } from './reviewCardContent.js'
import { dailyVerbDetails } from './dailyVerbNotes.js'

const persons = {
  fi: [
    ['I', 'minä'], ['you', 'sinä'], ['he / she / it', 'hän / se'],
    ['we', 'me'], ['you (plural)', 'te'], ['they', 'he / ne'],
  ],
  sv: [
    ['I', 'jag'], ['you', 'du'], ['he / she / it', 'han / hon / den / det'],
    ['we', 'vi'], ['you (plural)', 'ni'], ['they', 'de'],
  ],
}

export function getDailyVerbStudy(word, languageKey) {
  const detail = dailyVerbDetails[languageKey]?.[word]
  const forms = detail?.forms || (detail?.present ? Array(6).fill(detail.present) : [])
  return {
    persons: forms.map((form, index) => ({ label: persons[languageKey][index][0], pronoun: persons[languageKey][index][1], form })),
    chunks: (detail?.chunks || []).map(([text, meaning]) => ({ text, meaning })),
  }
}

export function resolveDailyVerbPhrases(item, note = {}, rules = []) {
  const linkedWord = item.linkedWord?.trim().toLocaleLowerCase()
  const rule = linkedWord && rules.find((candidate) => candidate.verb.word === item.word && candidate.objects[linkedWord])
  const contextual = rule && item.linkedEnglish
    ? rule.example({ english: item.linkedEnglish || linkedWord }, rule.objects[linkedWord])
      .map((phrase, index) => ({ ...phrase, ...(index === 0 ? { linkedWord: item.linkedWord } : {}) }))
    : []
  const saved = Array.isArray(item.lessonPhrases) ? item.lessonPhrases.filter((phrase) => phrase?.text && phrase.meaning) : []
  const curated = Array.isArray(note.phrases) ? note.phrases : []
  const firstCompletePair = [contextual, saved, curated].find((phrases) => getPhraseFrame(phrases))
  const base = firstCompletePair || [contextual, saved, curated].find((phrases) => phrases.length) || []
  const phrases = [...base]

  if (getPhraseFrame(phrases)) {
    for (const phrase of curated) {
      if (phrases.some((entry) => entry.text === phrase.text)) continue
      const frame = getPhraseFrame([phrases[0], phrase])
      if (frame?.fixed === getPhraseFrame(phrases)?.fixed) phrases.push(phrase)
    }
  }

  if (!phrases.length && item.sentence) {
    phrases.push({ text: item.sentence, meaning: item.sentenceTranslation || '', linkedWord: item.linkedWord })
  }
  return phrases
}
