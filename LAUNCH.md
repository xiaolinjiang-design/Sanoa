# Phone MVP launch preparation

## Current readiness — 3 October 2026

The production build passes. The app has a web manifest, 192px and 512px icons, an Apple touch icon, a service worker, and a production photo-analysis function. This is preparation for release, not evidence of a deployed or phone-tested app.

The current project is React + Vite. There are no native iOS or Android projects, signing settings, or store submission assets.

## Choose distribution

**Recommended first release: an invited web beta.** Publish one HTTPS address and let testers install it on their home screens. This uses the existing project. Finish the gates below before inviting testers.

**Store release:** package the web app in native iOS and Android projects, verify camera/photo selection and audio in each native container, configure app identifiers and signing, and prepare store listings. Hosting the analysis server is still required. Store enrollment, owner identity, review requirements, and fees must be checked when this route is selected. A wrapper alone does not establish store readiness.

## Release gates

| Gate | Current evidence | Remaining work |
| --- | --- | --- |
| Production bundle | `npm run build` passes | Rebuild the final release revision |
| Phone installation | Manifest and icons exist | Install and relaunch on physical iPhone and Android |
| Hosting | `api/analyze.js` exists | Deploy frontend and function together; verify HTTPS and production API |
| Recognition | DeepSeek integration exists | Verify a real object and a real sign in Finnish and Swedish on the deployed app |
| Usage protection | No application rate limit found | Configure production request limits and provider spending controls before exposing the paid endpoint widely |
| Privacy and support | In-app privacy panel exists | Supply owner/support contact; publish an accurate privacy page covering the provider and hosting arrangements |
| Saved progress | Browser-local storage | Explain device-only storage to testers; verify persistence and storage-failure messages |
| First capture | Background-removal runtime includes a roughly 24 MB WASM asset | Test cold start on mobile data and slow connections |
| Offline behavior | Service worker caches shell and fetched assets | Test after a complete online visit; analysis still requires internet |
| Release updates | Versioned service-worker cache | Test old installation upgrading without losing saved words |

## Physical-phone acceptance run

Record phone, OS/browser version, deployed URL, date, and pass/fail for each step.

1. Open the HTTPS link, choose a language, install from the browser, and launch from the new home-screen icon.
2. Allow camera access and capture an everyday object. Check the result, pronunciation, sticker adjustment, and save flow.
3. Deny camera access on a fresh permission state. Confirm the user can choose a photo and recover.
4. Capture a short sign. Check the phrase and sentence breakdown. Repeat object and phrase checks in the other language.
5. Close and reopen the installed app. Confirm the saved sticker and progress remain.
6. Complete a quiz and matching exercise; verify progress and navigation.
7. Go offline after loading the app online. Reopen it, inspect saved words, then try a capture and check that failure is understandable.
8. Return online and retry. Test the first background-removal download on mobile data.
9. Deploy an update and reopen an existing installation. Confirm the app updates and saved words remain.
10. Test deleting a sticker, editing the profile, and the feedback sharing flow.

Do not mark these passed based only on a desktop build.

## Information needed to finish release

- Distribution choice: home-screen web beta, store downloads, or both.
- Confirm the public name Sanoa across the web app and any future store listing.
- Hosting account/project and desired public address.
- Owner/support email and initial tester audience.
- For store distribution: the owner's Apple and Google developer accounts and final app identifiers.

## Tester invitation draft

“Try the Sanoa beta: learn Finnish or Swedish from everyday objects and signs. Open [release URL] on your phone and add it to your home screen using your browser menu. Your saved words stay on this device; photos you analyze are sent to our analysis provider. Please avoid sensitive photos. Send feedback to [support contact], including your phone model and what happened.”

Replace both placeholders and finish the acceptance run before sending.

See RELEASE.md for the existing Vercel deployment steps. Live photo analysis, hosting, phone installation, and store submission have not been verified in this preparation pass.
