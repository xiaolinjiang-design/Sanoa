import { preload, removeBackground } from '@imgly/background-removal'

const cutoutConfig = {
  model: 'isnet_quint8',
  device: 'cpu',
  output: { format: 'image/png', quality: 1, type: 'foreground' },
}

self.onmessage = async ({ data }) => {
  const { id, source, type } = data
  try {
    if (type === 'preload') {
      await preload(cutoutConfig)
      self.postMessage({ id, type: 'ready' })
      return
    }

    const blob = await removeBackground(source, cutoutConfig)
    self.postMessage({ id, type: 'complete', blob })
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : 'Could not make a cutout.' })
  }
}
