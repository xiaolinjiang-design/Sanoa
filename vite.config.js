import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleAnalyzeRequest } from './server/deepseek.js'
import { handleFinnishSourceRequest } from './server/finnishSources.js'
import { handleTranslationRequest } from './server/translation.js'
import { handleWordStudyRequest } from './server/wordStudy.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    worker: { format: 'es' },
    server: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
    preview: { headers: { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' } },
    plugins: [
      react(),
      {
        name: 'deepseek-capture-api',
        configureServer(server) {
          server.middlewares.use('/api/analyze', (request, response) => handleAnalyzeRequest(request, response, env.DEEPSEEK_API_KEY))
          server.middlewares.use('/api/translate', (request, response) => handleTranslationRequest(request, response, env.DEEPSEEK_API_KEY))
          server.middlewares.use('/api/word-study', (request, response) => handleWordStudyRequest(request, response, env.DEEPSEEK_API_KEY))
          server.middlewares.use('/api/lexicon', handleFinnishSourceRequest)
        },
      },
    ],
  }
})
