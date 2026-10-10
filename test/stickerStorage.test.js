import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreCutoutSticker } from '../src/stickerStorage.js'

test('restores a saved clay sticker to its original cutout', () => {
  const saved = {
    word: 'käsi',
    stickerImage: 'data:image/webp;base64,clay',
    cutoutImage: 'data:image/png;base64,cutout',
    clayImage: 'data:image/webp;base64,clay',
    clayStatus: 'ready',
    stickerAdjustment: { scale: 1.1, rotation: 2, useOriginal: false, usePhoto: false },
  }
  const restored = restoreCutoutSticker(saved)
  assert.equal(restored.stickerImage, saved.cutoutImage)
  assert.equal(restored.cutoutIsTransparent, true)
  assert.deepEqual(restored.stickerAdjustment, { scale: 1.1, rotation: 2, usePhoto: false })
  assert.equal(restored.clayImage, undefined)
  assert.equal(saved.stickerImage, 'data:image/webp;base64,clay')
})

test('keeps a deliberately selected photo crop and a regular sticker', () => {
  const photo = { stickerImage: 'data:image/jpeg;base64,photo', cutoutImage: 'data:image/png;base64,cutout', clayImage: 'data:image/webp;base64,clay', stickerAdjustment: { usePhoto: true } }
  assert.equal(restoreCutoutSticker(photo).stickerImage, photo.stickerImage)
  assert.deepEqual(restoreCutoutSticker({ stickerImage: 'data:image/png;base64,normal' }), { stickerImage: 'data:image/png;base64,normal' })
})

test('restores bundled sample stickers to their original icons', () => {
  assert.deepEqual(restoreCutoutSticker({ word: 'kahvi', image: '/assets/clay-coffee.png', icon: '☕' }), { word: 'kahvi', icon: '☕' })
})
