const oldClaySamples = new Set(['/assets/clay-coffee.png', '/assets/clay-door.png', '/assets/clay-key.png'])

export function restoreCutoutSticker(item) {
  const { clayImage, clayStatus, cutoutImage, ...rest } = item
  const restored = { ...rest }
  if (oldClaySamples.has(restored.image)) delete restored.image
  if (cutoutImage && !item.stickerAdjustment?.usePhoto) {
    restored.stickerImage = cutoutImage
    restored.cutoutIsTransparent = true
  }
  if (item.stickerAdjustment) {
    const { useOriginal, ...adjustment } = item.stickerAdjustment
    restored.stickerAdjustment = adjustment
  }
  return restored
}
