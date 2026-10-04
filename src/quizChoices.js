export function stickerVisualKey(item) {
  return item.stickerImage || item.captureImage || item.image || item.icon || 'empty sticker'
}

export function pickDistinctStickerChoices(answer, candidates, limit = 3) {
  const used = new Set([stickerVisualKey(answer)])
  const distractors = []

  for (const item of candidates) {
    const visual = stickerVisualKey(item)
    if (item.word === answer.word || used.has(visual)) continue
    distractors.push(item)
    used.add(visual)
    if (distractors.length === limit) break
  }

  return distractors
}
