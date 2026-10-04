# Sanoa beta release

The app can be tested as an installable, guest-first web app. People do not need an account: their profile, saved words, settings, and progress are stored in their browser on their own device.

## GitHub → Vercel setup

1. Run `npm test` and `npm run build`. Confirm `git check-ignore .env` reports `.env`; never commit a real API key. `node_modules`, `dist`, and `.vercel` are also ignored.
2. Push `main` to the [Sanoa GitHub repository](https://github.com/xiaolinjiang-design/Sanoa). Keep `.env` out of the commit.
3. In Vercel, choose **Add New → Project**, import that GitHub repository, and set the project root to the repository root. The checked-in `vercel.json` selects Vite, runs `npm run build`, publishes `dist`, and includes the Finnish source data in the functions that need it.
4. Before deploying, add `DEEPSEEK_API_KEY` in the Vercel project's **Environment Variables** for the environments you will use. Keep it server-side: do not prefix it with `VITE_` or put its value in `vercel.json`. A new deployment is needed after changing an environment variable.
5. Deploy a preview and verify `/api/lexicon?word=juoda&form=juon` returns JSON. Test one real photo and one sentence translation on the deployed URL, then repeat the full phone checklist below. Only promote or share a production URL after the gates pass.

## Before inviting testers

1. Deploy the project to Vercel. The included functions serve `/api/analyze`, `/api/translate`, and `/api/lexicon` in production; the DeepSeek key stays on the server.
2. Set a provider spending cap and deployment access/abuse controls before sharing the URL beyond a small trusted group. A public function can be called outside the app UI.
3. A static-only host will not run photo analysis, translation, or source checks.
4. Open the deployed site on an iPhone or Android phone. Use the browser menu to choose **Add to Home Screen** / **Install app**. Confirm the Sanoa icon appears and the app launches standalone.
5. Test camera permission, photo-library selection, object analysis, phrase analysis, saving a word, editing a profile, and the feedback share sheet on a real phone.

## What is in this beta

- A web-app manifest, phone-sized app icons, and an offline cache after the first successful visit.
- Device-local profile editing, saved words, daily progress, settings, and review scheduling.
- A native feedback share sheet. Testers choose Mail, Messages, or another sharing app; agree on the beta feedback channel before sending invites.
- A plain-language privacy panel describing local data and photo analysis.

## Deliberately not included yet

- Sign-up, cloud sync, password reset, or account deletion. Introducing accounts without a backend and a real privacy policy would make the beta less trustworthy.
- Push reminders. The setting was removed because it did not request permission or deliver notifications.
- An automatic support inbox. Set up a dedicated beta feedback address or group before launch, then tell testers which option to choose in the sharing sheet.

## Release guardrails

- Do not let users photograph faces, identity documents, medical information, payment cards, or private screens; the camera screen communicates this.
- Add a public privacy-policy URL and a support contact before moving beyond a small invited beta.
- The background-removal model is a large on-demand download on a first object capture. Test this on mobile data before broad launch.
- This is an invited beta, not a public paid release. Device-local browser storage can fill up or be cleared; the app now reports a failed sticker save, but it does not yet provide account backup or recovery.
- Before publishing the analysis endpoint widely, add per-user abuse controls, request limits, and a spending cap. A public endpoint backed by one paid API key is vulnerable to unexpected usage and cost.
- Before charging users, add a clear paid value proposition, billing and entitlement handling, account/data recovery, a public privacy policy, support, and an end-to-end mobile test on both platforms. Do not claim formal Finnish A2/YKI preparation until the curriculum and language content have been reviewed against that standard.
