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

function normalizedText(value) {
  return value?.trim().replace(/[.!?]+$/u, '').toLocaleLowerCase() || ''
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
  const base = item.word?.trim() || ''
  const phrases = []
  const addPhrase = (text, translation, preferredForm, preferredNote, useSavedNote = false) => {
    if (text?.trim() && !phrases.some((phrase) => phrase.text === text.trim())) {
      const targetForm = item.kind === 'phrase' ? '' : [preferredForm, item.form, item.expression?.wordForm, ...familyForms.map((entry) => entry.form), base]
        .find((form) => appearsInSentence(text, form)) || ''
      const savedFormNote = useSavedNote && targetForm && sameForm(targetForm, item.form) && (item.formChange || item.formReason)
        ? `${base} → ${targetForm}: ${[item.formChange, item.formReason].filter(Boolean).join(' ')}` : ''
      phrases.push({ text: text.trim(), translation: translation?.trim() || '', targetForm, formNote: preferredNote || savedFormNote })
    }
  }

  if (item.kind === 'phrase') addPhrase(item.word, item.english)
  addPhrase(item.sentence, item.sentenceTranslation, item.sentenceTargetForm, item.sentenceFormNote, true)
  addPhrase(item.expression?.sentence, item.expression?.translation, item.expression?.wordForm)
  for (const phrase of recommendedPhrases) addPhrase(phrase.text, phrase.meaning || phrase.translation, phrase.targetForm, phrase.formNote)

  const formInSentence = familyForms.find((candidate) =>
    !sameForm(candidate.form, base) && appearsInSentence(item.sentence, candidate.form))
  const savedForm = item.form && !sameForm(item.form, base) && appearsInSentence(item.sentence, item.form)
    ? { form: item.form.trim(), meaning: item.formMeaning || familyForms.find((candidate) => sameForm(candidate.form, item.form))?.meaning || '' }
    : null
  const variant = item.kind === 'phrase' ? null : savedForm || formInSentence || null
  const forms = []
  if (item.kind !== 'phrase') {
    for (const entry of [{ form: base, meaning: item.english || '' }, ...familyForms, ...(variant ? [variant] : [])]) {
      if (entry?.form?.trim() && !forms.some((known) => sameForm(known.form, entry.form))) {
        forms.push({ form: entry.form.trim(), meaning: entry.meaning || '' })
      }
    }
  }

  const phraseTexts = new Set(phrases.map(({ text }) => normalizedText(text)))
  const chunks = (item.sentenceParts || [])
    .filter((part) => /[\p{L}\p{N}]/u.test(part.word || ''))
    .filter((part) => !phraseTexts.has(normalizedText(part.word)))
    .map(({ word, ipa, meaning }) => ({ word, ipa, meaning }))
    .filter((part, index, all) => all.findIndex((candidate) => normalizedText(candidate.word) === normalizedText(part.word)) === index)
  if (!chunks.length && base && item.kind !== 'phrase') chunks.push({ word: base, meaning: item.english || '' })

  return { phrases, forms, chunks, variant, frame: getPhraseFrame(phrases) }
}
