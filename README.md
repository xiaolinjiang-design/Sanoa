# Sanoa

## Run locally with real image recognition

1. Create an API key in the DeepSeek platform.
2. Copy `.env.example` to `.env`.
3. Replace the placeholder with your key:

   ```env
   DEEPSEEK_API_KEY=your_real_key
   ```

4. Restart the development server with `npm run dev -- --host 127.0.0.1`.

The browser sends captured JPEG data to the local `/api/analyze` route. The server forwards it to the `deepseek-flash` vision model. The API key is never included in browser code.

Finnish base words are checked against Kotus’s open word list, and displayed word forms can be checked against FinnTreeBank through `/api/lexicon`. Source links, licenses, exact data hashes, and important limits are documented in [FINNISH_SOURCES.md](FINNISH_SOURCES.md). These checks do **not** validate AI-written translations, IPA, or example sentences.

Object captures use local background removal after recognition to create a transparent sticker. The first object capture may download the segmentation model.

## Publish the beta

Start with [LAUNCH.md](LAUNCH.md) for distribution options, readiness gaps, and the physical-phone acceptance checklist.

See [RELEASE.md](RELEASE.md). The project includes Vercel functions for `/api/analyze`, `/api/translate`, and `/api/lexicon`; static-only hosting cannot run photo analysis, translation, or source checks.
