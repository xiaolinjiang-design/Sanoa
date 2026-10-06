import { removeBackground } from '@imgly/background-removal'

self.onmessage = async ({ data }) => {
  const { id, source } = data
  try {
    const blob = await removeBackground(source, {
      model: 'isnet_fp16',
      device: 'cpu',
      output: { format: 'image/png', quality: 1, type: 'foreground' },
      progress: (stage, current, total) => {
        self.postMessage({ id, type: 'progress', stage, current, total })
      },
    })
    self.postMessage({ id, type: 'complete', blob })
  } catch (error) {
    self.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : 'Could not make a cutout.' })
  }
}
