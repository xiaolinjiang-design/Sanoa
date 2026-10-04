function sameForm(left, right) {
  return left?.trim().toLocaleLowerCase() === right?.trim().toLocaleLowerCase()
}

function appearsInSentence(sentence, form) {
  if (!sentence || !form) return false
  const text = sentence.toLocaleLowerCase()
  const value = form.trim().toLocaleLowerCase()
  const index = text.indexOf(value)
  if (index < 0) return false
  const before = text[index - 1]
  const after = text[index + value.length]
  return (!before || !/[\p{L}\p{N}]/u.test(before)) && (!after || !/[\p{L}\p{N}]/u.test(after))
}

export function getPhraseFrame(phrases) {
  if (phrases.length < 2) return null
  const parts = phrases.slice(0, 2).map(({ text }) => text.replace(/[.!?]$/u, '').split(/\s+/u))
  let sharedLength = 0
  while (sharedLength < Math.min(parts[0].length, parts[1].length) && parts[0][sharedLength] === parts[1][sharedLength]) sharedLength += 1
  const variableLength = parts[0].length - sharedLength
  if (!sharedLength || variableLength < 1 || variableLength > 2 || parts[1].length - sharedLength !== variableLength) return null
  const fixedParts = parts[0].slice(0, sharedLength)
  const choices = phrases.flatMap((phrase) => {
    const words = phrase.text.replace(/[.!?]$/u, '').split(/\s+/u)
    return words.length === sharedLength + variableLength && fixedParts.every((word, index) => words[index] === word)
      ? [{ ...phrase, variable: words.slice(sharedLength).join(' ').toLocaleLowerCase() }]
      : []
  })
  return { fixed: fixedParts.join(' '), choices }
}

export function buildReviewCardContent(item, familyForms = [], recommendedPhrases = []) {
  const phrases = []
  const addPhrase = (text, translation) => {
    if (text?.trim() && !phrases.some((phrase) => phrase.text === text.trim())) {
      phrases.push({ text: text.trim(), translation: translation?.trim() || '' })
    }
  }

  if (item.kind === 'phrase') addPhrase(item.word, item.english)
  for (const phrase of recommendedPhrases) addPhrase(phrase.text, phrase.meaning || phrase.translation)
  addPhrase(item.sentence, item.sentenceTranslation)
  addPhrase(item.expression?.sentence, item.expression?.translation)

  const base = item.word?.trim() || ''
  const formInSentence = familyForms.find((candidate) =>
    !sameForm(candidate.form, base) && appearsInSentence(item.sentence, candidate.form))
  const savedForm = item.form && !sameForm(item.form, base) && appearsInSentence(item.sentence, item.form)
    ? { form: item.form.trim(), meaning: item.formMeaning || familyForms.find((candidate) => sameForm(candidate.form, item.form))?.meaning || '' }
    : null
  const variant = item.kind === 'phrase' ? null : savedForm || formInSentence || null
  const forms = item.kind === 'phrase' ? [] : [{ form: base, meaning: item.english || '' }, ...(variant ? [variant] : [])]

  const chunks = (item.sentenceParts || [])
    .filter((part) => /[\p{L}\p{N}]/u.test(part.word || ''))
    .map(({ word, ipa, meaning }) => ({ word, ipa, meaning }))
  if (!chunks.length && base) chunks.push({ word: base, meaning: item.english || '' })

  return { phrases, forms, chunks, variant, frame: getPhraseFrame(phrases) }
}
