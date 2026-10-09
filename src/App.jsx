import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { playAnswerSound } from './answerSounds'
import { BookOpen, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Coffee, DoorOpen, Droplet, Eye, Flame, Footprints, HelpCircle, Home, KeyRound, Languages, Mail, MessageSquareText, Pencil, RotateCcw, ShieldCheck, Sparkles, Trash2, UserRound, Volume2, X } from 'lucide-react'
import { dailyVerbNotes } from './dailyVerbNotes'
import { resolveDailyVerbPhrases } from './dailyVerbLesson'
import { pickDistinctStickerChoices } from './quizChoices'
import { buildReviewCardContent, getPhraseFrame } from './reviewCardContent'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'
import { Chip } from './components/ui/chip'
import { cn } from './lib/utils'

const STICKER_TRACE_MS = 900
const STICKER_LIFT_MS = 240
const STICKER_SETTLE_MS = 220

const languages = {
  fi: { name: 'Finnish', localName: 'suomi', flag: '🇫🇮', locale: 'fi-FI', greeting: 'Moi!', accent: 'bg-brand-soft' },
  sv: { name: 'Swedish', localName: 'svenska', flag: '🇸🇪', locale: 'sv-SE', greeting: 'Hej!', accent: 'bg-[#fff0cf]' },
}

const learningGoals = [
  { id: 'everyday', label: 'Prepare for citizenship', detail: 'Build your language skills for living here.' },
  { id: 'people', label: 'Connect with people', detail: 'Make more moments into conversations.' },
  { id: 'work', label: 'Work or study', detail: 'Feel more confident in class or at work.' },
  { id: 'travel', label: 'Travel and explore', detail: 'Understand more of the places I visit.' },
  { id: 'curiosity', label: 'Just curious', detail: 'Learn for the joy of it.' },
]

const saunaGifts = {
  fi: { word: 'pulla', ipa: '/ˈpulːɑ/', english: 'cinnamon bun', image: '/assets/cinnamon-bun-chip-v1.png', tone: 'bg-[#f2c98b]', icon: '🍥', tilt: 'rotate-2', collection: 'Sauna gifts', sentence: 'Syön pullaa saunan jälkeen.', sentenceTranslation: 'I eat a cinnamon bun after the sauna.', sentenceParts: [{ word: 'Syön', ipa: '/syøn/', meaning: 'I eat' }, { word: 'pullaa', ipa: '/ˈpulːɑː/', meaning: 'a cinnamon bun' }, { word: 'saunan jälkeen', ipa: '/ˈsɑu̯nɑn ˈjælkeen/', meaning: 'after the sauna' }] },
  sv: { word: 'kanelbulle', ipa: '/kaˈneːlˌbɵlːɛ/', english: 'cinnamon bun', image: '/assets/cinnamon-bun-chip-v1.png', tone: 'bg-[#f2c98b]', icon: '🍥', tilt: 'rotate-2', collection: 'Sauna gifts', sentence: 'Jag äter en kanelbulle efter bastun.', sentenceTranslation: 'I eat a cinnamon bun after the sauna.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'äter', ipa: '/ˈɛːtɛr/', meaning: 'eat' }, { word: 'en kanelbulle', ipa: '/ɛn kaˈneːlˌbɵlːɛ/', meaning: 'a cinnamon bun' }, { word: 'efter bastun', ipa: '/ˈɛftɛr ˈbasːtɵn/', meaning: 'after the sauna' }] },
}

const saunaGiftPool = {
  fi: [saunaGifts.fi,
    { word: 'ämpäri', ipa: '/ˈæmpæri/', english: 'bucket', image: '/assets/sauna-bucket-clay.png', tone: 'bg-[#e8d4b8]', collection: 'Sauna gifts', sentence: 'Vesi on ämpärissä.', sentenceTranslation: 'The water is in the bucket.', sentenceParts: [{ word: 'Vesi', meaning: 'water' }, { word: 'on', meaning: 'is' }, { word: 'ämpärissä', meaning: 'in the bucket' }] },
    { word: 'polttopuu', ipa: '/ˈpoltːoˌpuː/', english: 'firewood', image: '/assets/sauna-firewood-clay.png', tone: 'bg-[#e8d4b8]', collection: 'Sauna gifts', sentence: 'Lisään polttopuuta kiukaaseen.', sentenceTranslation: 'I add firewood to the sauna stove.', sentenceParts: [{ word: 'Lisään', meaning: 'I add' }, { word: 'polttopuuta', meaning: 'firewood' }, { word: 'kiukaaseen', meaning: 'to the sauna stove' }] },
  ],
  sv: [saunaGifts.sv,
    { word: 'hink', ipa: '/hɪŋk/', english: 'bucket', image: '/assets/sauna-bucket-clay.png', tone: 'bg-[#e8d4b8]', collection: 'Sauna gifts', sentence: 'Vattnet är i hinken.', sentenceTranslation: 'The water is in the bucket.', sentenceParts: [{ word: 'Vattnet', meaning: 'the water' }, { word: 'är', meaning: 'is' }, { word: 'i hinken', meaning: 'in the bucket' }] },
    { word: 'ved', ipa: '/veːd/', english: 'firewood', image: '/assets/sauna-firewood-clay.png', tone: 'bg-[#e8d4b8]', collection: 'Sauna gifts', sentence: 'Jag lägger ved på elden.', sentenceTranslation: 'I put firewood on the fire.', sentenceParts: [{ word: 'Jag', meaning: 'I' }, { word: 'lägger', meaning: 'put' }, { word: 'ved', meaning: 'firewood' }, { word: 'på elden', meaning: 'on the fire' }] },
  ],
}

const SAUNA_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000
const DAILY_VERB_LESSON_VERSION = 2

function freshDailySauna() {
  return { date: new Date().toDateString(), captureCount: 0, capturedWords: [], woodCount: 0, tasks: [], learnedDailyWords: [], dailyVerbs: [], lessonVersion: DAILY_VERB_LESSON_VERSION }
}

function nextSaunaGift(languageKey, items) {
  return saunaGiftPool[languageKey]?.find((gift) => !items.some((item) => item.word === gift.word)) || null
}

const defaultProfile = { name: 'Alina', avatar: 'hiker' }
const ShowIpaContext = createContext(true)

function Ipa({ value, className }) {
  const showIpa = useContext(ShowIpaContext)
  return showIpa && value ? <span className={className}>{value}</span> : null
}

const KOTUS_SOURCE_URL = 'https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista/'
const FTB_SOURCE_URL = 'https://universaldependencies.org/treebanks/fi_ftb/'

function useFinnishEvidence(item, language, formOverride) {
  const [lookup, setLookup] = useState(null)
  const word = item?.word || ''
  const form = formOverride || item?.form || ''
  const eligible = language.locale?.startsWith('fi') && item?.kind !== 'phrase' && word && !word.includes(' ')
  const savedEvidence = !formOverride || formOverride === item?.form ? item?.sourceEvidence : null

  useEffect(() => {
    if (!eligible || savedEvidence) return undefined
    const controller = new AbortController()
    const query = new URLSearchParams({ word, form })
    fetch(`/api/lexicon?${query}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (payload?.evidence) setLookup({ word, form, evidence: payload.evidence }) })
      .catch((error) => { if (error.name !== 'AbortError') console.error('Finnish source lookup failed.', error) })
    return () => controller.abort()
  }, [eligible, savedEvidence, word, form])

  if (!eligible) return null
  return savedEvidence || (lookup?.word === word && lookup?.form === form ? lookup.evidence : null)
}

function FinnishSourceNote({ evidence, form }) {
  if (!evidence) return null
  const partOfSpeech = [...new Set(evidence.entries.map((entry) => entry.partOfSpeech).filter(Boolean))].join(', ')
  return <details className="mt-4 rounded-2xl border border-black/[.07] bg-white/70 px-4 py-3 text-sm text-stone-600">
    <summary className="cursor-pointer font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">{evidence.lemmaListed ? 'Listed in Kotus · sources' : 'Word source not confirmed'}</summary>
    <div className="mt-3 grid gap-2 leading-5">
      <p>{evidence.lemmaListed ? <>Base word listed in <a href={KOTUS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-cinnamon underline underline-offset-2">Kotus’s open word list</a>{partOfSpeech ? ` (${partOfSpeech})` : ''}.</> : <>Base word not found in <a href={KOTUS_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-cinnamon underline underline-offset-2">Kotus’s open word list</a>; the list is not exhaustive.</>}</p>
      {evidence.formAttested && <p>The form “{form}” is attested for this word in <a href={FTB_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-cinnamon underline underline-offset-2">FinnTreeBank</a>.</p>}
      <p>Meaning, IPA, and lesson examples are app content; these sources do not verify them.</p>
      <p className="text-xs">Kotus and FinnTreeBank data: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY 4.0</a>. FTB forms are indexed from its annotated corpus.</p>
    </div>
  </details>
}

const profileAvatars = {
  hiker: { src: '/assets/reindeer-forest-hiking.png', crop: '-translate-x-3 scale-[1.55] object-[53%_27%]' },
  swimmer: { src: '/assets/reindeer-ice-swimming.png', crop: '-translate-x-2 scale-[1.35] object-[51%_42%]' },
  coffee: { src: '/assets/reindeer-coffee-cutout-v1.png', crop: 'scale-[1.3] object-[51%_44%]' },
}

function readStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function persistValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The app remains usable for this session when device storage is unavailable.
  }
}

function savedReviewItem(item) {
  const { captureImage, photoCropImage, cutoutImage, ...serializableItem } = item
  return serializableItem
}

function restoreBuiltInStickerAssets(itemsByLanguage) {
  return Object.fromEntries(Object.entries(itemsByLanguage).map(([languageKey, items]) => {
    const gifts = saunaGiftPool[languageKey]
    if (!gifts || !Array.isArray(items)) return [languageKey, items]
    const builtInItems = [
      ...gifts,
      ...reviewSeeds[languageKey],
      ...earlierReviewSeeds[languageKey],
      ...Object.values(wordBank).map((entry) => entry.targets[languageKey]),
      ...Object.values(phraseBank).map((entry) => entry.targets[languageKey]),
    ]
    return [languageKey, items.map((item) => {
      const gift = gifts.find((entry) => entry.word === item.word)
      const builtIn = builtInItems.find((entry) => entry.word === item.word && entry.sentence === item.sentence)
      return {
        ...item,
        ...(gift ? { image: gift.image, collection: gift.collection } : {}),
        ...(!item.sentenceTranslation && builtIn?.sentenceTranslation ? { sentenceTranslation: builtIn.sentenceTranslation } : {}),
      }
    })]
  }))
}

const dailyVerbSets = {
  fi: [
    [
      { word: 'juoda', ipa: '/ˈjuodɑ/', english: 'to drink', icon: '🥤', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2', collection: 'Daily actions', sentence: 'Juon vettä.', sentenceParts: [{ word: 'Juon', ipa: '/juon/', meaning: 'I drink' }, { word: 'vettä', ipa: '/ˈʋetːæ/', meaning: 'water' }] },
      { word: 'mennä', ipa: '/ˈmenːæ/', english: 'to go', icon: '🚶', tone: 'bg-[#fff0cf]', tilt: 'rotate-2', collection: 'Daily actions', sentence: 'Menen kauppaan.', sentenceParts: [{ word: 'Menen', ipa: '/ˈmenen/', meaning: 'I go' }, { word: 'kauppaan', ipa: '/ˈkɑupːɑːn/', meaning: 'to the shop' }] },
      { word: 'ottaa', ipa: '/ˈotːɑː/', english: 'to take', icon: '🤲', tone: 'bg-[#ead7f5]', tilt: '-rotate-1', collection: 'Daily actions', sentence: 'Otan avaimet mukaan.', sentenceParts: [{ word: 'Otan', ipa: '/ˈotɑn/', meaning: 'I take' }, { word: 'avaimet', ipa: '/ˈɑʋɑimet/', meaning: 'the keys' }, { word: 'mukaan', ipa: '/ˈmukɑːn/', meaning: 'with me' }] },
    ],
  ],
  sv: [
    [
      { word: 'dricka', ipa: '/ˈdrikːa/', english: 'to drink', icon: '🥤', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2', collection: 'Daily actions', sentence: 'Jag dricker vatten.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'dricker', ipa: '/ˈdrikːɛr/', meaning: 'drink' }, { word: 'vatten', ipa: '/ˈvatːɛn/', meaning: 'water' }] },
      { word: 'gå', ipa: '/ɡoː/', english: 'to go', icon: '🚶', tone: 'bg-[#fff0cf]', tilt: 'rotate-2', collection: 'Daily actions', sentence: 'Jag går till affären.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'går', ipa: '/ɡoːr/', meaning: 'go' }, { word: 'till affären', ipa: '/tɪl aˈfɛːrɛn/', meaning: 'to the shop' }] },
      { word: 'ta', ipa: '/tɑː/', english: 'to take', icon: '🤲', tone: 'bg-[#ead7f5]', tilt: '-rotate-1', collection: 'Daily actions', sentence: 'Jag tar med nycklarna.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'tar med', ipa: '/tɑːr meːd/', meaning: 'take with me' }, { word: 'nycklarna', ipa: '/ˈnʏkːlarna/', meaning: 'the keys' }] },
    ],
  ],
}

function foodPhrase(english) {
  const noun = english?.toLowerCase() || 'this'
  if (noun === 'apple') return 'an apple'
  if (['cinnamon bun', 'lollipop', 'banana'].includes(noun)) return `a ${noun}`
  return noun
}

const contextualVerbRules = {
  fi: [
    { verb: { word: 'syödä', ipa: '/ˈsyødæ/', english: 'to eat', icon: '🍽️', tone: 'bg-[#f7dfd0]', tilt: 'rotate-1' }, objects: { pulla: 'pullaa', tikkari: 'tikkaria', omena: 'omenaa', banaani: 'banaania', leipä: 'leipää', kakku: 'kakkua', jäätelö: 'jäätelöä' }, example: (item, object) => [{ text: `Syön ${object}.`, meaning: `I eat ${foodPhrase(item.english)}.` }, { text: object === 'omenaa' ? 'Syön pullaa.' : 'Syön omenaa.', meaning: object === 'omenaa' ? 'I eat a cinnamon bun.' : 'I eat an apple.' }] },
    { verb: { word: 'juoda', ipa: '/ˈjuodɑ/', english: 'to drink', icon: '🥤', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2' }, objects: { kahvi: 'kahvia', vesi: 'vettä', tee: 'teetä', mehu: 'mehua' }, example: (item, object) => [{ text: `Juon ${object}.`, meaning: `I drink ${item.english}.` }, { text: object === 'vettä' ? 'Juon kahvia.' : 'Juon vettä.', meaning: object === 'vettä' ? 'I drink coffee.' : 'I drink water.' }] },
    { verb: { word: 'täyttää', ipa: '/ˈtæytːæː/', english: 'to fill', icon: '💧', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2' }, objects: { vesipullo: 'vesipullon', pullo: 'pullon', kuppi: 'kupin' }, example: (item, object) => [{ text: `Täytän ${object}.`, meaning: `I fill the ${item.english}.` }, { text: object === 'kupin' ? 'Täytän vesipullon.' : 'Täytän kupin.', meaning: object === 'kupin' ? 'I fill the water bottle.' : 'I fill the cup.' }] },
    { verb: { word: 'avata', ipa: '/ˈɑʋɑtɑ/', english: 'to open', icon: '🚪', tone: 'bg-[#e4eee0]', tilt: 'rotate-1' }, objects: { ovi: 'oven', ikkuna: 'ikkunan' }, example: (item, object) => [{ text: `Avaan ${object}.`, meaning: `I open the ${item.english}.` }, { text: object === 'oven' ? 'Avaan ikkunan.' : 'Avaan oven.', meaning: object === 'oven' ? 'I open the window.' : 'I open the door.' }] },
    { verb: { word: 'avata', ipa: '/ˈɑʋɑtɑ/', english: 'to open', icon: '🚪', tone: 'bg-[#e4eee0]', tilt: 'rotate-1' }, objects: { avain: 'avaimella' }, example: () => [{ text: 'Avaan oven avaimella.', meaning: 'I open the door with a key.' }, { text: 'Avaan oven koodilla.', meaning: 'I open the door with a code.' }] },
    { verb: { word: 'lukea', ipa: '/ˈlukeɑ/', english: 'to read', icon: '📖', tone: 'bg-[#fff0cf]', tilt: '-rotate-1' }, objects: { kirja: 'kirjaa', lehti: 'lehteä' }, example: (item, object) => [{ text: `Luen ${object}.`, meaning: `I read ${item.english}.` }, { text: object === 'kirjaa' ? 'Luen lehteä.' : 'Luen kirjaa.', meaning: object === 'kirjaa' ? 'I read a magazine.' : 'I read a book.' }] },
  ],
  sv: [
    { verb: { word: 'äta', ipa: '/ˈɛːta/', english: 'to eat', icon: '🍽️', tone: 'bg-[#f7dfd0]', tilt: 'rotate-1' }, objects: { kanelbulle: 'en kanelbulle', äpple: 'ett äpple', banan: 'en banan', bröd: 'bröd' }, example: (item, object) => [{ text: `Jag äter ${object}.`, meaning: `I eat ${foodPhrase(item.english)}.` }, { text: object === 'ett äpple' ? 'Jag äter en kanelbulle.' : 'Jag äter ett äpple.', meaning: object === 'ett äpple' ? 'I eat a cinnamon bun.' : 'I eat an apple.' }] },
    { verb: { word: 'dricka', ipa: '/ˈdrikːa/', english: 'to drink', icon: '🥤', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2' }, objects: { kaffe: 'kaffe', vatten: 'vatten', te: 'te', juice: 'juice' }, example: (item, object) => [{ text: `Jag dricker ${object}.`, meaning: `I drink ${item.english}.` }, { text: object === 'vatten' ? 'Jag dricker kaffe.' : 'Jag dricker vatten.', meaning: object === 'vatten' ? 'I drink coffee.' : 'I drink water.' }] },
    { verb: { word: 'fylla', ipa: '/ˈfʏlːa/', english: 'to fill', icon: '💧', tone: 'bg-[#d9f0eb]', tilt: '-rotate-2' }, objects: { 'en vattenflaska': 'vattenflaskan', vattenflaska: 'vattenflaskan', flaska: 'flaskan', kopp: 'koppen' }, example: (item, object) => [{ text: `Jag fyller ${object}.`, meaning: `I fill the ${item.english}.` }, { text: object === 'koppen' ? 'Jag fyller vattenflaskan.' : 'Jag fyller koppen.', meaning: object === 'koppen' ? 'I fill the water bottle.' : 'I fill the cup.' }] },
    { verb: { word: 'öppna', ipa: '/ˈœpːna/', english: 'to open', icon: '🚪', tone: 'bg-[#e4eee0]', tilt: 'rotate-1' }, objects: { dörr: 'dörren', 'en dörr': 'dörren', fönster: 'fönstret' }, example: (item, object) => [{ text: `Jag öppnar ${object}.`, meaning: `I open the ${item.english}.` }, { text: object === 'dörren' ? 'Jag öppnar fönstret.' : 'Jag öppnar dörren.', meaning: object === 'dörren' ? 'I open the window.' : 'I open the door.' }] },
    { verb: { word: 'öppna', ipa: '/ˈœpːna/', english: 'to open', icon: '🚪', tone: 'bg-[#e4eee0]', tilt: 'rotate-1' }, objects: { nyckel: 'nyckeln', 'en nyckel': 'nyckeln' }, example: () => [{ text: 'Jag öppnar dörren med nyckeln.', meaning: 'I open the door with the key.' }, { text: 'Jag öppnar dörren med koden.', meaning: 'I open the door with the code.' }] },
    { verb: { word: 'läsa', ipa: '/ˈlɛːsa/', english: 'to read', icon: '📖', tone: 'bg-[#fff0cf]', tilt: '-rotate-1' }, objects: { bok: 'en bok', 'en bok': 'en bok', tidning: 'en tidning' }, example: (item, object) => [{ text: `Jag läser ${object}.`, meaning: `I read ${item.english}.` }, { text: object === 'en bok' ? 'Jag läser en tidning.' : 'Jag läser en bok.', meaning: object === 'en bok' ? 'I read a newspaper.' : 'I read a book.' }] },
  ],
}

const wordBank = {
  bottle: {
    english: 'water bottle',
    tone: 'bg-[#d9f0eb]',
    icon: '💧',
    tilt: '-rotate-2',
    targets: {
      fi: {
        word: 'vesipullo',
        ipa: '/ˈʋesiˌpulːo/',
        form: 'vesipullossa',
        formIpa: '/ˈʋesiˌpulːosːɑ/',
        formMeaning: 'in the water bottle',
        collection: 'On the go',
        sentence: 'Minulla on vesipullo laukussa.',
        sentenceTranslation: 'I have a water bottle in my bag.',
        sentenceParts: [
          { word: 'Minulla', ipa: '/ˈminulːɑ/', meaning: 'I have / on me' },
          { word: 'on', ipa: '/on/', meaning: 'is / has' },
          { word: 'vesipullo', ipa: '/ˈʋesiˌpulːo/', meaning: 'water bottle' },
          { word: 'laukussa', ipa: '/ˈlɑu̯kusːɑ/', meaning: 'in the bag' },
        ],
        relatedWords: [
          { word: 'vesi', ipa: '/ˈʋesi/', english: 'water', icon: '💦', tone: 'bg-[#d7eaf7]', tilt: 'rotate-2', sentence: 'Juon vettä.', sentenceParts: [{ word: 'Juon', ipa: '/juon/', meaning: 'I drink' }, { word: 'vettä', ipa: '/ˈʋetːæ/', meaning: 'water' }] },
          { word: 'reppu', ipa: '/ˈrepːu/', english: 'backpack', icon: '🎒', tone: 'bg-[#e8dcc7]', tilt: '-rotate-2', sentence: 'Vesipullo on repussa.', sentenceParts: [{ word: 'Vesipullo', ipa: '/ˈʋesiˌpulːo/', meaning: 'water bottle' }, { word: 'on', ipa: '/on/', meaning: 'is' }, { word: 'repussa', ipa: '/ˈrepːusːɑ/', meaning: 'in the backpack' }] },
        ],
        expression: { sentence: 'Missä on vesipulloni?', translation: 'Where is my water bottle?' },
      },
      sv: {
        word: 'en vattenflaska',
        ipa: '/ɛn ˈvatːɛnˌflasːka/',
        form: 'vattenflaskan',
        formIpa: '/ˈvatːɛnˌflasːkan/',
        formMeaning: 'the water bottle',
        collection: 'On the go',
        sentence: 'Jag har en vattenflaska i väskan.',
        sentenceTranslation: 'I have a water bottle in my bag.',
        sentenceParts: [
          { word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' },
          { word: 'har', ipa: '/hɑːr/', meaning: 'have' },
          { word: 'en', ipa: '/ɛn/', meaning: 'a / an' },
          { word: 'vattenflaska', ipa: '/ˈvatːɛnˌflasːka/', meaning: 'water bottle' },
          { word: 'i', ipa: '/iː/', meaning: 'in' },
          { word: 'väskan', ipa: '/ˈvɛsːkan/', meaning: 'the bag' },
        ],
        relatedWords: [
          { word: 'vatten', ipa: '/ˈvatːɛn/', english: 'water', icon: '💦', tone: 'bg-[#d7eaf7]', tilt: 'rotate-2', sentence: 'Jag dricker vatten.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'dricker', ipa: '/ˈdrikːɛr/', meaning: 'drink' }, { word: 'vatten', ipa: '/ˈvatːɛn/', meaning: 'water' }] },
          { word: 'väska', ipa: '/ˈvɛsːka/', english: 'bag', icon: '👜', tone: 'bg-[#e8dcc7]', tilt: '-rotate-2', sentence: 'Vattenflaskan är i väskan.', sentenceParts: [{ word: 'Vattenflaskan', ipa: '/ˈvatːɛnˌflasːkan/', meaning: 'the water bottle' }, { word: 'är', ipa: '/æːr/', meaning: 'is' }, { word: 'i väskan', ipa: '/iː ˈvɛsːkan/', meaning: 'in the bag' }] },
        ],
        expression: { sentence: 'Var är min vattenflaska?', translation: 'Where is my water bottle?' },
      },
    },
  },
}

const phraseBank = {
  subway: {
    english: 'Next station',
    tone: 'bg-[#fff0cf]',
    icon: '🚇',
    tilt: 'rotate-1',
    kind: 'phrase',
    targets: {
      fi: {
        word: 'Seuraava asema',
        ipa: '/ˈseurɑːʋɑ ˈɑsemɑ/',
        collection: 'Phrases',
        sentence: 'Seuraava asema on Kamppi.',
        sentenceTranslation: 'The next station is Kamppi.',
        sentenceParts: [
          { word: 'Seuraava', ipa: '/ˈseurɑːʋɑ/', meaning: 'next' },
          { word: 'asema', ipa: '/ˈɑsemɑ/', meaning: 'station' },
          { word: 'on', ipa: '/on/', meaning: 'is' },
          { word: 'Kamppi', ipa: '/ˈkɑmpːi/', meaning: 'Kamppi' },
        ],
      },
      sv: {
        word: 'Nästa station',
        ipa: '/ˈnɛ̂sːta staˈɧuːn/',
        collection: 'Phrases',
        sentence: 'Nästa station är T-Centralen.',
        sentenceTranslation: 'The next station is T-Centralen.',
        sentenceParts: [
          { word: 'Nästa', ipa: '/ˈnɛ̂sːta/', meaning: 'next' },
          { word: 'station', ipa: '/staˈɧuːn/', meaning: 'station' },
          { word: 'är', ipa: '/æːr/', meaning: 'is' },
          { word: 'T-Centralen', ipa: '/teː sɛnˈtrɑːlɛn/', meaning: 'T-Centralen' },
        ],
      },
    },
  },
}

const reviewSeeds = {
  fi: [
    { word: 'kahvi', ipa: '/ˈkɑhʋi/', english: 'coffee', tone: 'bg-[#f2c98b]', icon: '☕', tilt: '-rotate-6', sentence: 'Juon kahvia aamulla.', sentenceTranslation: 'I drink coffee in the morning.', sentenceParts: [{ word: 'Juon', ipa: '/juon/', meaning: 'I drink' }, { word: 'kahvia', ipa: '/ˈkɑhʋiɑ/', meaning: 'coffee' }, { word: 'aamulla', ipa: '/ˈɑːmulːɑ/', meaning: 'in the morning' }] },
    { word: 'ovi', ipa: '/ˈoʋi/', english: 'door', tone: 'bg-[#b9d6c1]', icon: '🚪', tilt: 'rotate-3', sentence: 'Ovi on auki.', sentenceTranslation: 'The door is open.', sentenceParts: [{ word: 'Ovi', ipa: '/ˈoʋi/', meaning: 'the door' }, { word: 'on', ipa: '/on/', meaning: 'is' }, { word: 'auki', ipa: '/ˈɑu̯ki/', meaning: 'open' }] },
    { word: 'avain', ipa: '/ˈɑʋɑi̯n/', english: 'key', tone: 'bg-[#efb9a4]', icon: '🔑', tilt: '-rotate-2', sentence: 'Avaimeni ovat pöydällä.', sentenceTranslation: 'My keys are on the table.', sentenceParts: [{ word: 'Avaimeni', ipa: '/ˈɑʋɑi̯meni/', meaning: 'my keys' }, { word: 'ovat', ipa: '/ˈoʋɑt/', meaning: 'are' }, { word: 'pöydällä', ipa: '/ˈpøy̯dælːæ/', meaning: 'on the table' }] },
  ],
  sv: [
    { word: 'kaffe', ipa: '/ˈkafːɛ/', english: 'coffee', tone: 'bg-[#f2c98b]', icon: '☕', tilt: '-rotate-6', sentence: 'Jag dricker kaffe på morgonen.', sentenceTranslation: 'I drink coffee in the morning.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'dricker', ipa: '/ˈdrikːɛr/', meaning: 'drink' }, { word: 'kaffe', ipa: '/ˈkafːɛ/', meaning: 'coffee' }, { word: 'på morgonen', ipa: '/poː ˈmɔrːɡɔnɛn/', meaning: 'in the morning' }] },
    { word: 'dörr', ipa: '/dœrː/', english: 'door', tone: 'bg-[#b9d6c1]', icon: '🚪', tilt: 'rotate-3', sentence: 'Dörren är öppen.', sentenceTranslation: 'The door is open.', sentenceParts: [{ word: 'Dörren', ipa: '/ˈdœrːɛn/', meaning: 'the door' }, { word: 'är', ipa: '/æːr/', meaning: 'is' }, { word: 'öppen', ipa: '/ˈœpːɛn/', meaning: 'open' }] },
    { word: 'nyckel', ipa: '/ˈnʏkːɛl/', english: 'key', tone: 'bg-[#efb9a4]', icon: '🔑', tilt: '-rotate-2', sentence: 'Mina nycklar ligger på bordet.', sentenceTranslation: 'My keys are on the table.', sentenceParts: [{ word: 'Mina', ipa: '/ˈmiːna/', meaning: 'my' }, { word: 'nycklar', ipa: '/ˈnʏkːlar/', meaning: 'keys' }, { word: 'ligger', ipa: '/ˈlɪɡːɛr/', meaning: 'are / lie' }, { word: 'på bordet', ipa: '/poː ˈbuːɖɛt/', meaning: 'on the table' }] },
  ],
}

const earlierReviewSeeds = {
  fi: [
    { word: 'kirja', ipa: '/ˈkirjɑ/', english: 'book', tone: 'bg-[#d7e2f5]', icon: '📘', tilt: 'rotate-1', sentence: 'Luen kirjaa illalla.', sentenceTranslation: 'I read a book in the evening.', sentenceParts: [{ word: 'Luen', ipa: '/luen/', meaning: 'I read' }, { word: 'kirjaa', ipa: '/ˈkirjɑː/', meaning: 'a book' }, { word: 'illalla', ipa: '/ˈilːɑlːɑ/', meaning: 'in the evening' }] },
    { word: 'kenkä', ipa: '/ˈkeŋkæ/', english: 'shoe', tone: 'bg-[#ead7f5]', icon: '👟', tilt: '-rotate-2', sentence: 'Kengät ovat oven vieressä.', sentenceTranslation: 'The shoes are beside the door.', sentenceParts: [{ word: 'Kengät', ipa: '/ˈkeŋkæt/', meaning: 'the shoes' }, { word: 'ovat', ipa: '/ˈoʋɑt/', meaning: 'are' }, { word: 'oven vieressä', ipa: '/ˈoʋen ˈʋieressæ/', meaning: 'beside the door' }] },
  ],
  sv: [
    { word: 'bok', ipa: '/buːk/', english: 'book', tone: 'bg-[#d7e2f5]', icon: '📘', tilt: 'rotate-1', sentence: 'Jag läser en bok på kvällen.', sentenceTranslation: 'I read a book in the evening.', sentenceParts: [{ word: 'Jag', ipa: '/jɑːɡ/', meaning: 'I' }, { word: 'läser', ipa: '/ˈlɛːsɛr/', meaning: 'read' }, { word: 'en bok', ipa: '/ɛn buːk/', meaning: 'a book' }, { word: 'på kvällen', ipa: '/poː ˈkvɛlːɛn/', meaning: 'in the evening' }] },
    { word: 'sko', ipa: '/skuː/', english: 'shoe', tone: 'bg-[#ead7f5]', icon: '👟', tilt: '-rotate-2', sentence: 'Skorna står vid dörren.', sentenceTranslation: 'The shoes are by the door.', sentenceParts: [{ word: 'Skorna', ipa: '/ˈskuːrna/', meaning: 'the shoes' }, { word: 'står', ipa: '/stoːr/', meaning: 'stand / are' }, { word: 'vid dörren', ipa: '/viːd ˈdœrːɛn/', meaning: 'by the door' }] },
  ],
}

function findBestVoice(lang) {
  const voices = window.speechSynthesis.getVoices()
  const requested = lang.toLowerCase()
  const language = requested.split('-')[0]
  const preferredVoiceNames = {
    en: ['samantha', 'ava', 'zoe', 'daniel', 'serena', 'google us english', 'google uk english', 'aria', 'jenny', 'guy'],
    fi: ['satu', 'suvi', 'noora', 'selma', 'harri', 'google suomi'],
    sv: ['alva', 'klara', 'elin', 'sofie', 'mattias', 'google svenska'],
  }
  const preferredNames = preferredVoiceNames[language] || []

  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith(language))
    .sort((a, b) => {
      const score = (voice) => {
        const name = voice.name.toLowerCase()
        let value = voice.lang.toLowerCase() === requested ? 30 : 0
        value += voice.localService ? 8 : 0
        value += preferredNames.some((preferred) => name.includes(preferred)) ? 20 : 0
        value += /premium|enhanced|natural|neural/.test(name) ? 12 : 0
        value -= /compact|espeak/.test(name) ? 30 : 0
        return value
      }
      return score(b) - score(a)
    })[0]
}

function speak(text, lang) {
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()
  window.speechSynthesis.resume()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.voice = findBestVoice(lang) || null
  utterance.rate = lang.toLowerCase().startsWith('en') ? 0.98 : lang.toLowerCase().startsWith('fi') ? 0.92 : 0.9
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
  return true
}

function primeSpeech(lang) {
  if (!('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance('\u200B')
  utterance.lang = lang
  utterance.volume = 0
  window.speechSynthesis.speak(utterance)
}

function WaterBottle() {
  return (
    <div role="img" aria-label="A blue water bottle cut out as a sticker" className="relative grid h-48 w-40 place-items-center">
      <div className="sticker-cutout absolute h-36 w-[66px] rounded-[22px_22px_26px_26px] border-[5px] border-white bg-[#4d9cbb] shadow-[inset_-9px_-8px_0_rgba(21,73,95,.13)]">
        <div className="absolute -top-7 left-1/2 h-9 w-9 -translate-x-1/2 rounded-t-xl border-[5px] border-b-0 border-white bg-[#4d9cbb]" />
        <div className="absolute left-3 top-7 h-20 w-4 rounded-full bg-white/30" />
        <div className="absolute -right-3 top-[54px] h-8 w-5 rounded-r-xl border-[4px] border-l-0 border-white bg-[#4d9cbb]" />
      </div>
    </div>
  )
}

function Sticker({ item, large = false, hero = false }) {
  const image = item.stickerImage || item.captureImage || item.image
  const isCutout = Boolean(item.cutoutIsTransparent || item.image)
  const adjustment = item.stickerAdjustment
  return (
    <div className={cn('grid shrink-0 place-items-center', hero ? 'h-44 w-44' : large ? 'h-32 w-28' : 'h-20 w-20')}>
      {image ? (
        <img src={image} alt="" style={adjustment ? { transform: `scale(${adjustment.scale}) rotate(${adjustment.rotation}deg)` } : undefined} className={cn('sticker-cutout rotate-[-2deg]', item.cutoutIsTransparent && 'captured-sticker-cutout', isCutout ? 'object-contain' : 'rounded-[22%] border-2 border-white object-cover', hero ? 'h-36 w-36' : large ? 'h-24 w-24' : 'h-16 w-16')} />
      ) : (
        <span className={cn('sticker-cutout select-none', hero ? 'text-[7rem]' : large ? 'text-6xl' : 'text-4xl')} aria-hidden="true">{item.icon}</span>
      )}
    </div>
  )
}

function WordFormNote({ item }) {
  const base = item.word?.trim()
  const form = item.form?.trim()
  if (!base || !form || base.toLocaleLowerCase() === form.toLocaleLowerCase()) return null

  const appearsInSentence = item.sentenceParts?.some((part) => part.word?.toLocaleLowerCase().includes(form.toLocaleLowerCase()))
  return (
    <section className="mt-4 border-t border-stone-200 pt-4" aria-label={`About the form ${form}`}>
      <p className="text-[11px] font-bold uppercase tracking-[.12em] text-cinnamon">{appearsInSentence ? 'Word in this sentence' : 'A useful word form'}</p>
      <div className="mt-2 flex items-baseline gap-2 text-ink"><span className="text-lg font-bold">{base}</span><span className="text-stone-400">→</span><span className="text-lg font-bold">{form}</span><Ipa value={item.formIpa} className="text-xs font-medium text-stone-500" /></div>
      <p className="mt-1.5 text-sm leading-5 text-[#594817]"><span className="font-semibold">{base}</span> is the sticker’s base form. <span className="font-semibold">{form}</span> means {item.formMeaning || 'the same word used in this sentence'}.</p>
      {(item.formChange || item.formReason) && <p className="mt-1.5 text-xs leading-5 text-stone-600">{item.formChange}{item.formChange && item.formReason ? ' ' : ''}{item.formReason}</p>}
    </section>
  )
}

function AudioButton({ onClick, label, active = false, tone = 'text-moss', children }) {
  return (
    <button onClick={onClick} aria-label={label} className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-full bg-transparent transition-[transform,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-95', active ? 'text-coral' : tone)}>
      {children}
    </button>
  )
}

function useDialogFocus(onEscape) {
  const dialogRef = useRef(null)
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const controls = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    controls()[0]?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && escapeRef.current) {
        event.preventDefault()
        escapeRef.current()
      }
      if (event.key !== 'Tab') return
      const focusable = controls()
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  return dialogRef
}

function FoxBuddy({ className }) {
  return (
    <div className={cn('fox-buddy relative h-36 w-[7.35rem] shrink-0 select-none', className)} aria-hidden="true">
      <div className="fox-buddy-stage relative h-full w-full overflow-hidden">
        <img src="/assets/fox-ip.png" alt="" className="fox-buddy-image absolute inset-y-0 left-0 h-full w-[300%] max-w-none object-fill" draggable="false" />
        <span className="fox-eye-blink fox-eye-blink-left" />
        <span className="fox-eye-blink fox-eye-blink-right" />
      </div>
    </div>
  )
}

function RewardCelebration({ eyebrow, title, rewardText, copy, buttonLabel, onClose, alwaysCelebrate = false }) {
  const dialogRef = useDialogFocus(onClose)
  const rewardAmount = rewardText.match(/\d+/)?.[0] || '0'
  const isRepeat = rewardText === 'Already earned'
  const isLowResult = !isRepeat && Number(rewardAmount) === 0
  const showConfetti = alwaysCelebrate || (!isLowResult && !isRepeat)
  const confetti = [
    ['18%', '-68px', '-118px', '#d99a69', '0ms'],
    ['32%', '-28px', '-152px', '#f0c681', '80ms'],
    ['54%', '12px', '-165px', '#d29d73', '110ms'],
    ['72%', '70px', '-135px', '#e9bd86', '40ms'],
    ['85%', '100px', '-88px', '#9caa7b', '90ms'],
  ]

  return (
    <div ref={dialogRef} className="absolute inset-0 z-50 overflow-y-auto bg-[#211c24] text-center text-[#fff9ef]" role="dialog" aria-modal="true" aria-labelledby="daily-complete-title">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-[-25%] top-[10%] h-[60%] bg-[radial-gradient(ellipse_at_center,rgba(133,75,61,.28)_0%,rgba(94,57,61,.12)_44%,transparent_72%)]" />
        {showConfetti && confetti.map(([left, x, y, color, delay], index) => (
          <span key={index} className="confetti-piece" style={{ left, '--confetti-x': x, '--confetti-y': y, '--confetti-color': color, animationDelay: delay }} />
        ))}
        {showConfetti && <><span className="confetti-spark confetti-spark-left" /><span className="confetti-spark confetti-spark-right" /></>}
      </div>
      <div className="celebration-card relative mx-auto flex min-h-full max-w-[24rem] flex-col items-center px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[calc(clamp(2rem,6dvh,4rem)+env(safe-area-inset-top))]">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-[#f4c58c]">{eyebrow}</p>
        <div className="pointer-events-none relative mt-7 h-[clamp(245px,37dvh,320px)] w-full max-w-[330px] select-none" aria-hidden="true">
          <div className={cn('absolute inset-[5%] rounded-full border border-[#f4c58c]/15', isLowResult ? 'bg-[radial-gradient(circle,rgba(231,191,157,.22)_0%,rgba(231,191,157,.08)_48%,transparent_72%)]' : 'bg-[radial-gradient(circle,rgba(244,181,111,.28)_0%,rgba(233,153,96,.10)_48%,transparent_72%)]')} />
          <span className="absolute left-4 top-[22%] text-2xl text-[#e8bd82]">✦</span>
          <span className="absolute right-4 top-[15%] text-lg text-[#f2cf9d]">✦</span>
          <span className="absolute right-7 top-[68%] text-sm text-[#b6c19b]">✦</span>
          <img src="/assets/sauna-firewood-clay.png" alt="" width="1402" height="1122" className={cn('relative h-full w-full object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,.28)]', isLowResult && 'opacity-70')} />
        </div>
        <h2 id="daily-complete-title" className="mt-6 max-w-[20rem] text-balance font-serif text-[34px] font-bold leading-[1.04] tracking-[-.035em]">{title}</h2>
        <p className="mt-3 text-base font-semibold tabular-nums text-[#f4c58c]">{isRepeat ? 'Sauna logs already collected' : isLowResult ? '0 sauna logs earned' : `+${rewardAmount} sauna ${Number(rewardAmount) === 1 ? 'log' : 'logs'}`}</p>
        {copy && <p className="mt-3 max-w-[19rem] text-sm leading-6 text-[#fff9ef]/80">{copy}</p>}
        <div className="mt-auto w-full pt-8"><Button onClick={onClose} className="w-full bg-[#fff9ef] text-ink hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#211c24]" size="lg">{buttonLabel}</Button></div>
      </div>
    </div>
  )
}

function DailyCelebration({ rewardEarned, onClose }) {
  return <RewardCelebration eyebrow="Daily set complete" title="Three verbs in your pocket!" rewardText={rewardEarned ? '+1 sauna log' : 'Already earned'} copy={rewardEarned ? null : 'Today’s daily-word log was already earned.'} buttonLabel="Back to home" onClose={onClose} alwaysCelebrate />
}

function FikaSheet({ rewards, daysRemaining, hasGift, onClose, onEnjoy }) {
  const dialogRef = useDialogFocus(onClose)
  const captureCount = rewards.captureCount || 0
  const woodCount = rewards.woodCount || 0
  const saunaReady = captureCount >= 3 && woodCount >= 3 && daysRemaining === 0 && hasGift
  const saunaClaimed = Boolean(rewards.saunaGiftClaimed)
  const tasks = [
    { id: 'water', title: 'Fill the bucket', detail: `${captureCount}/3 things captured`, complete: captureCount >= 3, icon: <Droplet size={18} /> },
    { id: 'wood', title: 'Stack the firewood', detail: `${Math.min(woodCount, 3)} of 3 logs`, complete: woodCount >= 3, icon: <Flame size={18} /> },
  ]

  return (
    <div ref={dialogRef} className="absolute inset-0 z-40 flex items-end bg-ink/35 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="fika-title" onClick={onClose}>
      <section className="w-full rounded-[30px] bg-white p-5 shadow-[0_24px_70px_rgba(38,35,49,.24)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">Sauna prep</p>
            <h2 id="fika-title" className="mt-1 font-serif text-2xl font-bold text-ink">{saunaClaimed ? 'Sauna enjoyed' : !hasGift ? 'Sauna collection complete' : daysRemaining ? 'A little rest first' : saunaReady ? 'The sauna is ready' : 'Warm it up'}</h2>
          </div>
          <span className="rounded-full bg-cinnamon-soft px-3 py-2 text-sm font-black tabular-nums text-cinnamon">{saunaClaimed ? 'Done' : saunaReady ? 'Ready' : `${Number(captureCount >= 3) + Number(woodCount >= 3)}/2`}</span>
        </div>
        <div className="mt-5 grid gap-2">
          {tasks.map((task) => {
            return <div key={task.id} className={cn('flex min-h-[68px] items-center gap-3 rounded-[20px] border px-3 py-2', task.complete ? 'border-[#eadbc9] bg-[#fbf7f1]' : 'border-transparent bg-[#f6f6f6]')}>
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', task.complete ? 'bg-cinnamon text-white' : 'bg-white text-stone-400')}>{task.complete ? <Check size={18} /> : task.icon}</span>
              <span className="min-w-0"><span className="block text-sm font-bold text-ink">{task.title}</span><span className="block text-xs leading-4 text-stone-500">{task.detail}</span></span>
            </div>
          })}
        </div>
        <p className="mt-4 text-center text-xs font-semibold text-stone-500">{saunaClaimed ? 'Your gift is in Review. The reindeer is still smiling.' : !hasGift ? 'You’ve collected every sauna sticker for now. More treats are coming.' : daysRemaining ? `The next sauna gift is available in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}. Keep finding words meanwhile.` : saunaReady ? 'Your captures and practice made this sauna possible. A gift is waiting.' : captureCount >= 3 ? `${3 - Math.min(woodCount, 3)} more ${3 - Math.min(woodCount, 3) === 1 ? 'log' : 'logs'} to start the fire.` : woodCount >= 3 ? 'Firewood ready. Fill the bucket next.' : 'Find three things and practise to warm the sauna.'}</p>
        {saunaReady && !saunaClaimed ? <Button onClick={onEnjoy} className="mt-4 w-full">Start the sauna</Button> : <Button onClick={onClose} className="mt-4 w-full">Back to learning</Button>}
      </section>
    </div>
  )
}

function SaunaMoment({ capturedWords, onOpenGift }) {
  const dialogRef = useDialogFocus()
  return (
    <div ref={dialogRef} className="absolute inset-0 z-50 overflow-y-auto bg-[#fff9ef] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-center" role="dialog" aria-modal="true" aria-labelledby="sauna-moment-title">
      <div className="mx-auto flex min-h-full max-w-[22rem] flex-col items-center justify-center">
        <p className="text-xs font-black uppercase tracking-[.16em] text-cinnamon">Sauna time</p>
        <div className="relative mt-4 aspect-square w-full max-w-[20rem] overflow-hidden rounded-[32px] bg-[#e8d4b8] shadow-[inset_0_0_0_1px_rgba(91,55,32,.08)]">
          <img src="/assets/reindeer-sauna.png" width="512" height="512" alt="The reindeer relaxing in the sauna" className="h-full w-full object-cover" />
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.12),transparent_44%)]" aria-hidden="true" />
        </div>
        <h2 id="sauna-moment-title" className="mt-6 text-balance font-serif text-[34px] font-bold leading-[1.02] tracking-[-.045em] text-ink">You warmed it up.</h2>
        <p className="mt-3 max-w-[19rem] text-sm leading-6 text-stone-600">{capturedWords?.length ? `You found ${capturedWords.join(', ')} and earned three logs. One very happy reindeer.` : 'Three things found. Three logs earned. One very happy reindeer.'}</p>
        <Button onClick={onOpenGift} className="mt-8 w-full" size="lg">Open your gift</Button>
      </div>
    </div>
  )
}

function SaunaGift({ language, gift, capturedWords, onCollect }) {
  const dialogRef = useDialogFocus()
  return (
    <div ref={dialogRef} className="absolute inset-0 z-50 overflow-y-auto bg-[#fff9ef] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-center" role="dialog" aria-modal="true" aria-labelledby="sauna-gift-title">
      <div className="mx-auto flex min-h-full max-w-[22rem] flex-col items-center justify-center">
        <p className="text-xs font-black uppercase tracking-[.16em] text-cinnamon">From your reindeer</p>
        <div className="relative mt-5 grid h-40 w-40 place-items-center rounded-full bg-[radial-gradient(circle,#ffe8ba_0%,#f7cf90_58%,transparent_70%)]">
          <img src={gift.image} width="128" height="128" alt={gift.english} className="h-28 w-28 object-contain drop-shadow-[0_10px_12px_rgba(79,52,33,.16)]" />
        </div>
        <h2 id="sauna-gift-title" className="mt-5 text-balance font-serif text-[34px] font-bold leading-[1.02] tracking-[-.045em] text-ink">A little thank-you</h2>
        <p className="mt-2 max-w-[18rem] text-sm leading-5 text-stone-600">{capturedWords?.length ? `For finding ${capturedWords.join(', ')} and keeping the fire going.` : 'For the words you found and the practice you put in.'}</p>
        <div className="mt-5 w-full rounded-[24px] border border-black/[.06] bg-white px-5 py-4 text-left shadow-[0_10px_24px_rgba(79,52,33,.06)]">
          <p className="text-xs font-bold uppercase tracking-[.14em] text-cinnamon">{language.name}</p>
          <div className="mt-2 flex items-end justify-between gap-3"><span><span className="block text-2xl font-bold tracking-[-.03em] text-ink">{gift.word}</span><span className="mt-1 block text-sm font-medium text-stone-500">{gift.english}</span></span><Ipa value={gift.ipa} className="text-sm font-semibold text-stone-400" /></div>
        </div>
        <Button onClick={onCollect} className="mt-7 w-full" size="lg">Keep this gift</Button>
      </div>
    </div>
  )
}

function getIpa(languageKey, item) {
  if (item.ipa) return item.ipa

  const knownItems = [...reviewSeeds[languageKey], ...earlierReviewSeeds[languageKey]]
  return knownItems.find((knownItem) => knownItem.word === item.word)?.ipa || ''
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function createQuizQuestion(languageKey, reviewItems, previousWord, preferredItems = [], excludedWords = [], strictPreferred = false) {
  const excluded = new Set(excludedWords)
  const knownWords = [...reviewItems, ...earlierReviewSeeds[languageKey]]
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.word === item.word) === index)
    .filter((item) => !excluded.has(item.word))
  if (!knownWords.length) return null
  const preferredWords = new Set(preferredItems.map((item) => item.word))
  const preferredAnswers = knownWords.filter((item) => preferredWords.has(item.word) && item.word !== previousWord)
  if (strictPreferred && !preferredAnswers.length) return null
  const possibleAnswers = preferredAnswers.length ? preferredAnswers : knownWords.filter((item) => item.word !== previousWord)
  const answer = (possibleAnswers.length ? possibleAnswers : knownWords)[Math.floor(Math.random() * (possibleAnswers.length || knownWords.length))]
  const distractors = answer ? pickDistinctStickerChoices(answer, shuffle(knownWords), 3) : []
  const choices = answer ? shuffle([answer, ...distractors]) : []
  return { answer, choices: shuffle(choices) }
}

function getDailyVerbs(languageKey, items = [], completedDays = 0) {
  const sets = dailyVerbSets[languageKey]
  const fallbackVerbs = sets[new Date().getDate() % sets.length]
  const rules = contextualVerbRules[languageKey] || []
  const contextualVerbs = []

  items.filter((item) => item.kind !== 'phrase' && !/^to\s/i.test(item.english || '')).some((item) => {
    const word = item.word?.trim().toLocaleLowerCase(languages[languageKey].locale)
    const rule = rules.find((candidate) => candidate.objects[word] && !contextualVerbs.some((verb) => verb.word === candidate.verb.word))
    if (rule) {
      const lessonPhrases = rule.example(item, rule.objects[word]).map((phrase, index) => ({ ...phrase, ...(index === 0 ? { linkedWord: item.word } : {}) }))
      contextualVerbs.push({ ...rule.verb, sentence: lessonPhrases[0].text, lessonPhrases, collection: 'Useful with your words', linkedWord: item.word, linkedEnglish: item.english })
    }
    return contextualVerbs.length === 3
  })

  const actionVerbs = [...contextualVerbs, ...fallbackVerbs.filter((verb) => !contextualVerbs.some((candidate) => candidate.word === verb.word))]
  if (completedDays === 2) {
    const beVerb = languageKey === 'fi'
      ? { word: 'olla', ipa: '/ˈolːɑ/', english: 'to be', icon: '📍', tone: 'bg-[#e8dcc7]', tilt: '-rotate-1' }
      : { word: 'vara', ipa: '/ˈvɑːra/', english: 'to be', icon: '📍', tone: 'bg-[#e8dcc7]', tilt: '-rotate-1' }
    return [...actionVerbs.slice(0, 2), beVerb]
  }
  return actionVerbs.slice(0, 3)
}

function getWordCollections(items) {
  const fallbackCollections = { coffee: 'Café & kitchen', door: 'Home', key: 'Home', book: 'Home', shoe: 'Getting ready' }
  const legacyNames = { keittiö: 'Café & kitchen' }
  return items.reduce((collections, item) => {
    const name = legacyNames[item.collection?.toLowerCase()] || item.collection || fallbackCollections[item.english] || 'Everyday things'
    const existing = collections.find((collection) => collection.name === name)
    if (existing) existing.items.push(item)
    else collections.push({ name, items: [item] })
    return collections
  }, [])
}

function getLearningStats(items, dailyVerbs, savedDailyWords) {
  const wordCount = items.filter((item) => item.kind !== 'phrase').length
  const phraseCount = items.filter((item) => item.kind === 'phrase').length
  const collectionCount = getWordCollections(items).length
  const dailySavedCount = dailyVerbs.filter((verb) => savedDailyWords.includes(verb.word)).length

  return { dailySavedCount, dailyTotal: dailyVerbs.length, wordCount, phraseCount, collectionCount }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function useStickerGravity() {
  const [gravity, setGravity] = useState({ x: 0, y: 0 })
  const initialOrientation = useRef(null)

  useEffect(() => {
    if (!window.DeviceOrientationEvent) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const handleOrientation = (event) => {
      if (!Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return
      if (!initialOrientation.current) initialOrientation.current = { gamma: event.gamma, beta: event.beta }
      const x = clamp((event.gamma - initialOrientation.current.gamma) / 18, -1, 1)
      const y = clamp((event.beta - initialOrientation.current.beta) / 22, -1, 1)
      setGravity((current) => ({ x: current.x * .72 + x * .28, y: current.y * .72 + y * .28 }))
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  const bindGravity = {
    onPointerMove: (event) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      if (event.pointerType !== 'mouse') return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
      setGravity({ x: clamp(x, -1, 1), y: clamp(y, -1, 1) })
    },
    onPointerLeave: (event) => { if (event.pointerType === 'mouse') setGravity({ x: 0, y: 0 }) },
  }

  return { gravity, bindGravity }
}

function SentenceParts({ parts, language }) {
  const learnableParts = parts.filter((part) => /[\p{L}\p{N}]/u.test(part.word || ''))
  if (!learnableParts.length) return null

  return (
    <div className="mt-3 grid gap-2">
      {learnableParts.map((part) => (
        <button key={part.word} onClick={() => speak(part.word, language.locale)} className="grid min-h-[58px] grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left transition-[border-color,background-color] hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.99]">
          <span>
            <span className="block text-sm font-bold text-ink">{part.word}</span>
            <Ipa value={part.ipa} className="mt-0.5 block text-xs font-medium text-stone-500" />
          </span>
          <span className="text-right text-sm font-semibold text-[#594817]">{part.meaning}</span>
        </button>
      ))}
    </div>
  )
}

function App() {
  const scrollViewportRef = useRef(null)
  const [targetLanguage, setTargetLanguage] = useState(() => readStoredValue('lingo-target-language', null))
  const [step, setStep] = useState('home')
  const [captureMode, setCaptureMode] = useState('object')
  const [capturedImage, setCapturedImage] = useState('')
  const [captureResult, setCaptureResult] = useState(null)
  const [stickerEdit, setStickerEdit] = useState(null)
  const [captureCutout, setCaptureCutout] = useState(null)
  const [captureWord, setCaptureWord] = useState(null)

  useEffect(() => {
    if (step === 'camera' && captureMode === 'object') warmCutoutModel().catch(() => {})
  }, [step, captureMode])

  const [captureError, setCaptureError] = useState('')
  const [captureStage, setCaptureStage] = useState(0)
  const [storageError, setStorageError] = useState('')
  const [reviewItemsByLanguage, setReviewItemsByLanguage] = useState(() => restoreBuiltInStickerAssets(readStoredValue('lingo-review-items', {})))
  const [quizQuestion, setQuizQuestion] = useState(null)
  const [quizSessionWords, setQuizSessionWords] = useState([])
  const [quizRewardAvailable, setQuizRewardAvailable] = useState(true)
  const [quizLogsEarned, setQuizLogsEarned] = useState(0)
  const [matchingRewardAvailable, setMatchingRewardAvailable] = useState(true)
  const [quizCompletedWords, setQuizCompletedWords] = useState([])
  const [quizFinished, setQuizFinished] = useState(false)
  const [quizMistakes, setQuizMistakes] = useState(0)
  const [detailItem, setDetailItem] = useState(null)
  const [detailBackStep, setDetailBackStep] = useState('home')
  const [collectionDetail, setCollectionDetail] = useState(null)
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [dailyCelebrationRewardEarned, setDailyCelebrationRewardEarned] = useState(true)
  const [profileSettings, setProfileSettings] = useState(() => readStoredValue('lingo-profile-settings', { dailyGoal: 3, autoplay: true, showIpa: true }))
  const [learningGoalsByLanguage, setLearningGoalsByLanguage] = useState(() => readStoredValue('lingo-learning-goals', {}))
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...readStoredValue('lingo-profile', {}) }))
  const [profileEditorOpen, setProfileEditorOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [completedVerbDaysByLanguage, setCompletedVerbDaysByLanguage] = useState(() => readStoredValue('lingo-completed-verb-days', {}))
  const [dailyFika, setDailyFika] = useState(() => {
    const today = new Date().toDateString()
    try {
      const byLanguage = readStoredValue('lingo-daily-fika-by-language', {})
      const stored = byLanguage[targetLanguage] || JSON.parse(window.localStorage.getItem('lingo-daily-fika') || 'null')
      return stored?.date === today ? { ...freshDailySauna(), ...stored, lessonVersion: stored.lessonVersion || 0 } : freshDailySauna()
    } catch {
      return freshDailySauna()
    }
  })
  const [saunaHistoryByLanguage, setSaunaHistoryByLanguage] = useState(() => readStoredValue('lingo-sauna-history', {}))
  const [captureActivityByLanguage, setCaptureActivityByLanguage] = useState(() => readStoredValue('lingo-capture-activity', {}))
  const [practiceByLanguage, setPracticeByLanguage] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('lingo-practice-queue') || '{}')
    } catch {
      return {}
    }
  })
  const [reviewScheduleByLanguage, setReviewScheduleByLanguage] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem('lingo-review-schedule') || '{}')
    } catch {
      return {}
    }
  })

  const reviewItems = targetLanguage ? reviewItemsByLanguage[targetLanguage] || reviewSeeds[targetLanguage] : []
  const savedDailyWords = dailyFika.date === new Date().toDateString() ? dailyFika.learnedDailyWords || [] : []
  const dailyVerbs = targetLanguage ? (dailyFika.date === new Date().toDateString() && dailyFika.lessonVersion === DAILY_VERB_LESSON_VERSION && dailyFika.dailyVerbs?.length ? dailyFika.dailyVerbs : getDailyVerbs(targetLanguage, reviewItems, completedVerbDaysByLanguage[targetLanguage]?.length || 0)) : []

  const updateReviewItems = (updater) => {
    if (!targetLanguage) return
    setReviewItemsByLanguage((current) => {
      const currentItems = current[targetLanguage] || reviewSeeds[targetLanguage]
      const nextItems = typeof updater === 'function' ? updater(currentItems) : updater
      return { ...current, [targetLanguage]: nextItems }
    })
  }

  useEffect(() => persistValue('lingo-target-language', targetLanguage), [targetLanguage])
  useEffect(() => persistValue('lingo-review-items', Object.fromEntries(Object.entries(reviewItemsByLanguage).map(([key, items]) => [key, items.map(savedReviewItem)]))), [reviewItemsByLanguage])
  useEffect(() => persistValue('lingo-profile-settings', profileSettings), [profileSettings])
  useEffect(() => persistValue('lingo-learning-goals', learningGoalsByLanguage), [learningGoalsByLanguage])
  useEffect(() => persistValue('lingo-profile', profile), [profile])
  useEffect(() => persistValue('lingo-completed-verb-days', completedVerbDaysByLanguage), [completedVerbDaysByLanguage])

  useEffect(() => {
    try {
      window.localStorage.setItem('lingo-practice-queue', JSON.stringify(practiceByLanguage))
    } catch {
      // The practice queue still works for this session if browser storage is unavailable.
    }
  }, [practiceByLanguage])

  useEffect(() => {
    try {
      window.localStorage.setItem('lingo-review-schedule', JSON.stringify(reviewScheduleByLanguage))
    } catch {
      // Review scheduling still works for this session if browser storage is unavailable.
    }
  }, [reviewScheduleByLanguage])

  useEffect(() => {
    try {
      window.localStorage.setItem('lingo-daily-fika', JSON.stringify(dailyFika))
      if (targetLanguage) {
        const byLanguage = readStoredValue('lingo-daily-fika-by-language', {})
        window.localStorage.setItem('lingo-daily-fika-by-language', JSON.stringify({ ...byLanguage, [targetLanguage]: dailyFika }))
      }
    } catch {
      // Daily progress still works for this session if browser storage is unavailable.
    }
  }, [dailyFika, targetLanguage])
  useEffect(() => persistValue('lingo-capture-activity', captureActivityByLanguage), [captureActivityByLanguage])
  useEffect(() => persistValue('lingo-sauna-history', saunaHistoryByLanguage), [saunaHistoryByLanguage])

  const markFikaTask = (task) => {
    const today = new Date().toDateString()
    setDailyFika((current) => {
      const tasks = current.date === today ? current.tasks : []
      const base = current.date === today ? current : { date: today, captureCount: 0, woodCount: 0, tasks: [] }
      return { ...base, tasks: tasks.includes(task) ? tasks : [...tasks, task] }
    })
  }

  const recordSaunaCapture = (word) => {
    if (dailyFika.date === new Date().toDateString() && dailyFika.capturedWords?.includes(word)) return
    const today = new Date().toDateString()
    const dayKey = localDateKey(new Date())
    setCaptureActivityByLanguage((current) => {
      const languageActivity = current[targetLanguage] || {}
      const legacyCount = dailyFika.date === today ? dailyFika.captureCount || 0 : 0
      return { ...current, [targetLanguage]: { ...languageActivity, [dayKey]: (languageActivity[dayKey] ?? legacyCount) + 1 } }
    })
    setDailyFika((current) => {
      const base = current.date === today ? current : { date: today, captureCount: 0, woodCount: 0, tasks: [] }
      const capturedWords = base.capturedWords || []
      if (capturedWords.includes(word)) return base
      const captureCount = Math.min(3, (base.captureCount || 0) + 1)
      const tasks = captureCount === 3 && !base.tasks.includes('discover') ? [...base.tasks, 'discover'] : base.tasks
      return { ...base, captureCount, capturedWords: [...capturedWords, word].slice(0, 3), tasks }
    })
  }

  const awardSaunaWood = (amount = 1, source = 'quiz') => {
    const today = new Date().toDateString()
    setDailyFika((current) => {
      const base = current.date === today ? current : { date: today, captureCount: 0, woodCount: 0, tasks: [] }
      const task = source === 'quiz' ? 'recall' : 'match'
      if (base.tasks.includes(task) || amount <= 0) return base
      return { ...base, woodCount: Math.min(3, (base.woodCount || 0) + amount), tasks: [...base.tasks, task] }
    })
  }

  const claimSaunaGift = () => {
    if (!targetLanguage) return
    const gift = nextSaunaGift(targetLanguage, reviewItems)
    const lastClaimedAt = saunaHistoryByLanguage[targetLanguage]?.lastClaimedAt || 0
    if (!gift || Date.now() - lastClaimedAt < SAUNA_COOLDOWN_MS || dailyFika.saunaGiftClaimed || dailyFika.captureCount < 3 || dailyFika.woodCount < 3) return
    updateReviewItems((items) => [gift, ...items])
    setReviewScheduleByLanguage((current) => ({ ...current, [targetLanguage]: { ...(current[targetLanguage] || {}), [gift.word]: current[targetLanguage]?.[gift.word] || { stage: 0, dueAt: Date.now() } } }))
    setSaunaHistoryByLanguage((current) => ({ ...current, [targetLanguage]: { lastClaimedAt: Date.now(), lastGiftWord: gift.word } }))
    const today = new Date().toDateString()
    setDailyFika((current) => {
      const base = current.date === today ? current : { date: today, captureCount: 0, woodCount: 0, tasks: [] }
      return { ...base, saunaGiftClaimed: true }
    })
  }

  useEffect(() => {
    if (!targetLanguage) return
    const learnedAllDailyVerbs = dailyVerbs.length > 0 && dailyVerbs.every((verb) => savedDailyWords.includes(verb.word))
    if (!learnedAllDailyVerbs) return

    const today = new Date().toDateString()
    setDailyFika((current) => {
      const base = current.date === today ? current : { date: today, captureCount: 0, woodCount: 0, tasks: [] }
      if (base.tasks.includes('daily-verbs')) return base
      return { ...base, woodCount: Math.min(9, (base.woodCount || 0) + 1), tasks: [...base.tasks, 'daily-verbs'] }
    })
  }, [savedDailyWords, targetLanguage])

  const openCamera = (mode = 'object') => {
    setStickerEdit(null)
    setCaptureCutout(null)
    setCaptureWord(null)
    setStorageError('')
    setCaptureMode(mode)
    setCapturedImage('')
    setCaptureResult(null)
    setCaptureError('')
    setCaptureStage(0)
    setStep('camera')
  }
  const analyzeCapture = async (image) => {
    setCapturedImage(image)
    setCaptureResult(null)
    setCaptureCutout(null)
    setCaptureWord(null)
    setCaptureError('')
    setCaptureStage(0)
    setStep('analyzing')

    const captureStartedAt = performance.now()
    const timings = {}
    const captureController = new AbortController()
    const recordTiming = (phase) => { timings[phase] = Math.round(performance.now() - captureStartedAt) }
    try {
      let cutoutReadyAt = 0
      let cutoutAnimationMs = 0
      const earlyCutout = captureMode === 'object'
        ? prepareEarlyCutout(image, { signal: captureController.signal }).then((assets) => {
          captureController.signal.throwIfAborted()
          recordTiming('cutoutReadyMs')
          cutoutReadyAt = Date.now()
          cutoutAnimationMs = (assets.outlinePath ? STICKER_TRACE_MS : 0) + STICKER_LIFT_MS + STICKER_SETTLE_MS
          setCaptureCutout(assets)
          setCaptureStage(1)
          return assets
        }).catch((error) => {
          if (!captureController.signal.aborted) console.error('Early foreground segmentation failed.', error)
          return null
        })
        : null
      const analysisRequest = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, captureMode, targetLanguage: languages[targetLanguage].name }),
      })
      const response = await analysisRequest
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not analyze this photo.')
      recordTiming('recognitionReadyMs')
      if (payload.result?.blocked) {
        captureController.abort()
        cancelCutoutJobs()
        setCaptureCutout(null)
        setCaptureWord(null)
        setCaptureResult(null)
        setCapturedImage('')
        setCaptureError('A human face was detected. Processing stopped. Please retake the photo with faces out of frame.')
        return
      }
      setCaptureWord(payload.result)
      if (captureMode === 'phrase') setCaptureStage(1)
      let stickerImage = ''
      let photoCropImage = ''
      let cutoutIsTransparent = false
      if (captureMode === 'object') {
        const assets = await earlyCutout
        if (assets) {
          stickerImage = assets.stickerImage
          photoCropImage = await cropPhotoToBox(image, assets.foregroundBox).then((crop) => resizeStickerImage(crop, 640))
          cutoutIsTransparent = true
        } else {
          try {
            const fallbackAssets = await prepareEarlyCutout(image, { cpuOnly: true })
            stickerImage = fallbackAssets.stickerImage
            photoCropImage = await cropPhotoToBox(image, fallbackAssets.foregroundBox).then((crop) => resizeStickerImage(crop, 640))
            cutoutIsTransparent = true
            cutoutReadyAt = Date.now()
            cutoutAnimationMs = STICKER_LIFT_MS + STICKER_SETTLE_MS
            setCaptureCutout({ ...fallbackAssets, outlinePath: null, foregroundImage: null })
          } catch (cutoutError) {
            console.error('Foreground segmentation failed.', cutoutError)
            throw new Error('We found the object, but could not finish its sticker. Try processing it again.')
          }
        }
      } else {
        stickerImage = await resizeStickerImage(await cropPhotoToBox(image, payload.result.boundingBox), 640)
      }
      setCaptureResult({
        ...payload.result,
        tone: captureMode === 'phrase' ? 'bg-[#fff0cf]' : 'bg-[#d9f0eb]',
        tilt: captureMode === 'phrase' ? 'rotate-1' : '-rotate-2',
        kind: captureMode,
        captureImage: image,
        photoCropImage,
        stickerImage,
        cutoutImage: stickerImage,
        cutoutIsTransparent,
      })
      setCaptureStage(2)
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const hold = reducedMotion ? 0 : Math.max(0, cutoutAnimationMs - (Date.now() - cutoutReadyAt))
      await new Promise((resolve) => window.setTimeout(resolve, hold))
      recordTiming('resultReadyMs')
      console.info('[capture timing] ' + JSON.stringify({ mode: captureMode, ...timings }))
      if (captureMode === 'object' && !reducedMotion && typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => flushSync(() => setStep('result')))
      } else {
        setStep('result')
      }
    } catch (error) {
      setCaptureError(error.message || 'Could not analyze this photo.')
    }
  }
  const selectLanguage = (languageKey, learningGoal) => {
    if (learningGoal) setLearningGoalsByLanguage((current) => ({ ...current, [languageKey]: learningGoal }))
    const storedSauna = readStoredValue('lingo-daily-fika-by-language', {})[languageKey]
    setDailyFika(storedSauna?.date === new Date().toDateString() ? { ...freshDailySauna(), ...storedSauna, lessonVersion: storedSauna.lessonVersion || 0 } : freshDailySauna())
    setReviewItemsByLanguage((current) => current[languageKey] ? current : { ...current, [languageKey]: reviewSeeds[languageKey] })
    setTargetLanguage(languageKey)
    setStep('home')
    setCelebrationOpen(false)
  }
  const saveSticker = () => {
    if (!captureResult) return
    const currentItems = reviewItemsByLanguage[targetLanguage] || reviewSeeds[targetLanguage]
    const nextItems = currentItems.some((item) => item.word === captureResult.word)
      ? currentItems.map((item) => item.word === captureResult.word ? { ...item, ...captureResult } : item)
      : [captureResult, ...currentItems]
    const nextLibrary = { ...reviewItemsByLanguage, [targetLanguage]: nextItems }
    try {
      window.localStorage.setItem('lingo-review-items', JSON.stringify(Object.fromEntries(Object.entries(nextLibrary).map(([key, items]) => [key, items.map(savedReviewItem)]))))
    } catch {
      setStorageError('This device could not save the sticker. Free up browser storage, then try again. Your capture is still here for now.')
      return
    }
    setStorageError('')
    setReviewItemsByLanguage(nextLibrary)
    setReviewScheduleByLanguage((current) => ({ ...current, [targetLanguage]: { ...(current[targetLanguage] || {}), [captureResult.word]: { stage: 0, dueAt: Date.now() } } }))
    recordSaunaCapture(captureResult.word)
    const collection = getWordCollections(nextItems).find((candidate) => candidate.items.some((item) => item.word === captureResult.word))
    if (collection) setCollectionDetail(collection)
    setStep(collection ? 'collection' : 'review')
  }
  const addRelatedWord = (word) => {
    updateReviewItems((items) => items.some((item) => item.word === word.word) ? items : [word, ...items])
    setReviewScheduleByLanguage((current) => ({ ...current, [targetLanguage]: { ...(current[targetLanguage] || {}), [word.word]: current[targetLanguage]?.[word.word] || { stage: 0, dueAt: Date.now() } } }))
  }
  const practiceItems = targetLanguage ? Object.values(practiceByLanguage[targetLanguage] || {}).map((entry) => entry.item) : []
  const reviewSchedule = targetLanguage ? reviewScheduleByLanguage[targetLanguage] || {} : {}
  const dueReviewItems = reviewItems.filter((item) => !reviewSchedule[item.word] || reviewSchedule[item.word].dueAt <= Date.now())
  const prioritizedReviewItems = dueReviewItems
  const saunaHistory = targetLanguage ? saunaHistoryByLanguage[targetLanguage] : null
  const nextGift = targetLanguage ? nextSaunaGift(targetLanguage, reviewItems) : null
  const saunaDaysRemaining = saunaHistory?.lastClaimedAt ? Math.max(0, Math.ceil((saunaHistory.lastClaimedAt + SAUNA_COOLDOWN_MS - Date.now()) / (24 * 60 * 60 * 1000))) : 0
  const recordMistake = (item) => {
    if (!targetLanguage || !item) return
    setPracticeByLanguage((current) => {
      const languageQueue = current[targetLanguage] || {}
      const previous = languageQueue[item.word]
      return {
        ...current,
        [targetLanguage]: {
          ...languageQueue,
          [item.word]: { item, misses: (previous?.misses || 0) + 1, correctStreak: 0, lastMissedAt: Date.now() },
        },
      }
    })
  }
  const recordCorrect = (item) => {
    if (!targetLanguage || !item) return
    setPracticeByLanguage((current) => {
      const languageQueue = current[targetLanguage] || {}
      const previous = languageQueue[item.word]
      if (!previous) return current
      const nextLanguageQueue = { ...languageQueue }
      if ((previous.correctStreak || 0) + 1 >= 2) delete nextLanguageQueue[item.word]
      else nextLanguageQueue[item.word] = { ...previous, correctStreak: (previous.correctStreak || 0) + 1 }
      return { ...current, [targetLanguage]: nextLanguageQueue }
    })
  }
  const scheduleReviewResult = (item, correct) => {
    if (!targetLanguage || !item) return
    const intervals = [1, 3, 7, 14, 30]
    setReviewScheduleByLanguage((current) => {
      const languageSchedule = current[targetLanguage] || {}
      const previous = languageSchedule[item.word]
      if (correct && previous?.dueAt > Date.now()) return current
      const previousStage = previous?.stage || 0
      const nextStage = correct ? Math.min(previousStage + 1, intervals.length) : 0
      const delay = correct ? intervals[Math.max(0, nextStage - 1)] * 24 * 60 * 60 * 1000 : 10 * 60 * 1000
      return { ...current, [targetLanguage]: { ...languageSchedule, [item.word]: { stage: nextStage, dueAt: Date.now() + delay } } }
    })
  }
  const handleReviewMistake = (item) => {
    recordMistake(item)
    scheduleReviewResult(item, false)
  }
  const handleReviewCorrect = (item) => {
    recordCorrect(item)
    scheduleReviewResult(item, true)
  }
  const startQuiz = () => {
    setQuizRewardAvailable(!dailyFika.tasks.includes('recall') && (dailyFika.woodCount || 0) < 3)
    setQuizLogsEarned(0)
    const sessionItems = (prioritizedReviewItems.length ? prioritizedReviewItems : reviewItems).slice(0, 5)
    setQuizSessionWords(sessionItems)
    setQuizCompletedWords([])
    setQuizFinished(false)
    setQuizMistakes(0)
    setQuizQuestion(createQuizQuestion(targetLanguage, reviewItems, undefined, sessionItems, [], true))
    setStep('quiz')
  }
  const startMatching = () => {
    setMatchingRewardAvailable(!dailyFika.tasks.includes('match'))
    setStep('matching')
  }
  const nextQuizQuestion = () => {
    const completedWords = [...new Set([...quizCompletedWords, quizQuestion?.answer.word].filter(Boolean))]
    setQuizCompletedWords(completedWords)
    const nextQuestion = createQuizQuestion(targetLanguage, reviewItems, undefined, quizSessionWords, completedWords, true)
    if (!nextQuestion) {
      const logsEarned = quizRewardAvailable ? Math.min(quizMistakes < 3 ? 2 : 1, Math.max(0, 3 - (dailyFika.woodCount || 0))) : 0
      if (logsEarned) awardSaunaWood(logsEarned, 'quiz')
      setQuizLogsEarned(logsEarned)
      setQuizQuestion(null)
      setQuizFinished(true)
      return
    }
    setQuizQuestion(nextQuestion)
    if (completedWords.length % 2 === 1) speak(nextQuestion.answer.word, languages[targetLanguage].locale)
  }
  const markDailyWordSaved = (item) => {
    if (!targetLanguage) return
    if (!dailyVerbs.some((dailyWord) => dailyWord.word === item.word) || savedDailyWords.includes(item.word)) return
    markFikaTask('use')

    const nextWords = [...savedDailyWords, item.word]
    const completedSet = dailyVerbs.every((verb) => nextWords.includes(verb.word))
    const today = new Date().toDateString()
    setDailyFika((current) => {
      const base = current.date === today ? current : freshDailySauna()
      return { ...base, lessonVersion: DAILY_VERB_LESSON_VERSION, dailyVerbs: base.lessonVersion === DAILY_VERB_LESSON_VERSION && base.dailyVerbs?.length ? base.dailyVerbs : dailyVerbs, learnedDailyWords: [...new Set([...(base.learnedDailyWords || []), item.word])] }
    })
    if (completedSet) {
      const dayKey = localDateKey(new Date())
      setCompletedVerbDaysByLanguage((current) => ({ ...current, [targetLanguage]: [...new Set([...(current[targetLanguage] || []), dayKey])] }))
      setDailyCelebrationRewardEarned(!dailyFika.tasks.includes('daily-verbs'))
      setCelebrationOpen(true)
    }
  }
  const openWordDetails = (item, backStep = 'home') => {
    setDetailItem(item)
    setDetailBackStep(backStep)
    setStep('detail')
  }
  const savePhraseTranslation = (card, phrase, translation) => {
    const update = (item) => {
      if (item.word !== card.word || item.sentence !== card.sentence) return item
      return {
        ...item,
        ...(item.sentence === phrase ? { sentenceTranslation: translation } : {}),
        ...(item.expression?.sentence === phrase ? { expression: { ...item.expression, translation } } : {}),
      }
    }
    setDetailItem((current) => current ? update(current) : current)
    updateReviewItems((items) => items.map(update))
    setCollectionDetail((current) => current ? { ...current, items: current.items.map(update) } : current)
  }
  const deleteSticker = (item) => {
    updateReviewItems((items) => items.filter((savedItem) => savedItem.word !== item.word))
    setPracticeByLanguage((current) => {
      const nextLanguageQueue = { ...(current[targetLanguage] || {}) }
      delete nextLanguageQueue[item.word]
      return { ...current, [targetLanguage]: nextLanguageQueue }
    })
    setReviewScheduleByLanguage((current) => {
      const nextLanguageSchedule = { ...(current[targetLanguage] || {}) }
      delete nextLanguageSchedule[item.word]
      return { ...current, [targetLanguage]: nextLanguageSchedule }
    })
    setDetailItem(null)
    if (detailBackStep === 'collection') {
      setCollectionDetail(null)
      setStep('review')
    } else {
      setStep(detailBackStep)
    }
  }
  const openCollection = (collection) => {
    setCollectionDetail(collection)
    setStep('collection')
  }
  const dailyDetailItems = targetLanguage && detailItem ? dailyVerbs : []
  const detailSequence = dailyDetailItems.some((item) => item.word === detailItem?.word) ? dailyDetailItems : []
  useEffect(() => {
    if (step === 'detail' && detailBackStep === 'home' && detailItem && dailyVerbs.length && !dailyVerbs.some((item) => item.word === detailItem.word)) {
      setDetailItem(dailyVerbs[0])
    }
  }, [step, detailBackStep, detailItem, dailyVerbs])
  const moveDetail = (direction) => {
    if (!detailSequence.length) return
    const currentIndex = detailSequence.findIndex((item) => item.word === detailItem?.word)
    const nextIndex = (currentIndex + direction + detailSequence.length) % detailSequence.length
    setDetailItem(detailSequence[nextIndex])
  }
  const needsLearningGoal = Boolean(targetLanguage && !learningGoalsByLanguage[targetLanguage])
  const showBottomNav = Boolean(targetLanguage && !needsLearningGoal && !['camera', 'analyzing', 'result', 'quiz', 'matching', 'detail'].includes(step))
  const previewItem = stickerEdit && captureResult ? {
    ...captureResult,
    stickerImage: stickerEdit.usePhoto ? captureResult.photoCropImage : captureResult.cutoutImage || captureResult.stickerImage,
    cutoutIsTransparent: !stickerEdit.usePhoto && captureResult.kind === 'object',
    stickerAdjustment: stickerEdit,
  } : captureResult

  useEffect(() => {
    if (step === 'detail') scrollViewportRef.current?.scrollTo(0, 0)
  }, [step, detailItem?.word])

  return (
    <ShowIpaContext.Provider value={profileSettings.showIpa}>
    <main className="app-shell relative mx-auto h-[100dvh] w-full overflow-hidden bg-white sm:h-[min(852px,100dvh)] sm:w-[393px] sm:rounded-[36px] sm:shadow-[0_28px_80px_rgba(0,0,0,.48)]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <div ref={scrollViewportRef} className={cn('app-scroll isolate h-full overflow-y-auto overscroll-contain', targetLanguage && !needsLearningGoal && !['home', 'camera', 'analyzing'].includes(step) && 'safe-area-content', showBottomNav && 'pb-[calc(10rem+env(safe-area-inset-bottom))]')}>
        {!targetLanguage ? (
          <LanguageChoice onSelect={selectLanguage} />
        ) : needsLearningGoal ? (
          <LanguageChoice key={targetLanguage} initialLanguage={targetLanguage} goalOnly onSelect={(languageKey, goal) => {
            if (languageKey === targetLanguage) setLearningGoalsByLanguage((current) => ({ ...current, [languageKey]: goal }))
            else selectLanguage(languageKey, goal)
          }} />
        ) : step === 'home' ? (
          <HomeView language={languages[targetLanguage]} reviewItems={reviewItems} dailyVerbs={dailyVerbs} savedDailyWords={savedDailyWords} dailyGoal={profileSettings.dailyGoal} dailyRewards={dailyFika.date === new Date().toDateString() ? dailyFika : { captureCount: 0, woodCount: 0, tasks: [] }} saunaDaysRemaining={saunaDaysRemaining} nextGift={nextGift} captureActivity={captureActivityByLanguage[targetLanguage] || {}} onCaptureObject={() => openCamera('object')} onStartQuiz={startQuiz} onStartMatching={startMatching} onOpenWord={openWordDetails} onClaimSaunaGift={claimSaunaGift} />
        ) : step === 'camera' ? (
          <CameraView language={languages[targetLanguage]} captureMode={captureMode} onCaptureModeChange={setCaptureMode} onBack={() => setStep('home')} onRecognize={analyzeCapture} />
        ) : step === 'analyzing' ? (
          <AnalyzingView captureMode={captureMode} image={capturedImage} stage={captureStage} cutout={captureCutout} word={captureWord} language={languages[targetLanguage]} error={captureError} onRetry={() => setStep('camera')} />
        ) : step === 'review' ? (
          <ReviewView items={reviewItems} practiceItems={practiceItems} dueCount={dueReviewItems.length} logAvailable={!dailyFika.tasks.includes('recall') && (dailyFika.woodCount || 0) < 3} woodFull={(dailyFika.woodCount || 0) >= 3} onCapture={() => openCamera('object')} onStartQuiz={startQuiz} onOpenCollection={openCollection} />
        ) : step === 'quiz' ? (
          <QuizView onAnswer={(correct) => profileSettings.soundEffects !== false && playAnswerSound(correct)} language={languages[targetLanguage]} question={quizQuestion} finished={quizFinished} logsEarned={quizLogsEarned} woodFull={(dailyFika.woodCount || 0) >= 3} sessionCount={quizSessionWords.length} completedCount={quizCompletedWords.length} onBack={() => setStep('review')} onNext={nextQuizQuestion} onMistake={(item) => { setQuizMistakes((count) => count + 1); handleReviewMistake(item) }} onCorrect={handleReviewCorrect} />
        ) : step === 'matching' ? (
          <MatchingView onAnswer={(correct) => profileSettings.soundEffects !== false && playAnswerSound(correct)} items={[...reviewItems, ...earlierReviewSeeds[targetLanguage]]} language={languages[targetLanguage]} rewardAvailable={matchingRewardAvailable} onBack={() => setStep('home')} onMistake={handleReviewMistake} onCorrect={handleReviewCorrect} onComplete={(score) => matchingRewardAvailable && awardSaunaWood(score >= 15 ? 3 : score >= 10 ? 2 : score >= 5 ? 1 : 0, 'matching')} />
        ) : step === 'profile' ? (
          <ProfileView languageKey={targetLanguage} language={languages[targetLanguage]} reviewItems={reviewItems} dailyVerbs={dailyVerbs} savedDailyWords={savedDailyWords} settings={profileSettings} profile={profile} learningGoal={learningGoalsByLanguage[targetLanguage]} onLearningGoalChange={(goal) => setLearningGoalsByLanguage((current) => ({ ...current, [targetLanguage]: goal }))} onSettingsChange={setProfileSettings} onSelectLanguage={selectLanguage} onOpenReview={() => setStep('review')} onEditProfile={() => setProfileEditorOpen(true)} onOpenFeedback={() => setFeedbackOpen(true)} onOpenPrivacy={() => setPrivacyOpen(true)} />
        ) : step === 'collection' ? (
          <CollectionDetailView languageKey={targetLanguage} collection={collectionDetail} onBack={() => setStep('review')} onOpenWord={(item) => openWordDetails(item, 'collection')} />
        ) : step === 'detail' ? (
          detailSequence.length > 0
            ? <DailyVerbView key={detailItem.word} item={detailItem} language={languages[targetLanguage]} reviewItems={reviewItems} detailSequence={detailSequence} learnedDailyWords={savedDailyWords} onPrevious={() => moveDetail(-1)} onNext={() => moveDetail(1)} onBack={() => setStep(detailBackStep)} onLearnDailyWord={markDailyWordSaved} />
            : <WordDetailView item={detailItem} language={languages[targetLanguage]} reviewItems={reviewItems} onBack={() => setStep(detailBackStep)} onAddRelatedWord={addRelatedWord} onDelete={deleteSticker} onPhraseTranslation={savePhraseTranslation} />
        ) : (
          <ResultView language={languages[targetLanguage]} item={previewItem} captureMode={captureMode} storageError={storageError} autoPlayPronunciation={profileSettings.autoplay} onRetake={() => setStep('camera')} onEdit={() => setStickerEdit({ scale: captureResult?.stickerAdjustment?.scale ?? 1, rotation: captureResult?.stickerAdjustment?.rotation ?? 0, usePhoto: captureResult?.stickerAdjustment?.usePhoto ?? false })} onSave={saveSticker} />
        )}
      </div>
      {stickerEdit && captureResult && <StickerAdjustSheet item={captureResult} adjustment={stickerEdit} onChange={setStickerEdit} onClose={() => setStickerEdit(null)} onSave={() => {
        setCaptureResult((current) => ({ ...current, stickerImage: stickerEdit.usePhoto ? current.photoCropImage : current.cutoutImage || current.stickerImage, cutoutIsTransparent: !stickerEdit.usePhoto && current.kind === 'object', stickerAdjustment: stickerEdit }))
        setStickerEdit(null)
      }} />}
      {celebrationOpen && <DailyCelebration rewardEarned={dailyCelebrationRewardEarned} onClose={() => { setCelebrationOpen(false); setStep('home') }} />}
      {profileEditorOpen && <ProfileEditor profile={profile} onClose={() => setProfileEditorOpen(false)} onSave={(nextProfile) => { setProfile(nextProfile); setProfileEditorOpen(false) }} />}
      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
      {privacyOpen && <PrivacySheet onClose={() => setPrivacyOpen(false)} />}
      {showBottomNav && <BottomNav active={step === 'review' || step === 'collection' ? 'review' : step === 'profile' ? 'profile' : step === 'home' || step === 'detail' ? 'home' : ''} onHome={() => setStep('home')} onCapture={() => openCamera('object')} onReview={() => setStep('review')} onProfile={() => setStep('profile')} />}
    </main>
    </ShowIpaContext.Provider>
  )
}

function LanguageChoice({ onSelect, initialLanguage = null, goalOnly = false }) {
  const [page, setPage] = useState(goalOnly ? 4 : 0)
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const lastPage = 4

  const screens = [
    {
      eyebrow: 'Look around',
      title: 'Words are hiding everywhere.',
      body: 'Photograph a thing or a short phrase you meet in real life.',
      visual: (
        <div className="relative isolate flex h-full items-end justify-center overflow-hidden bg-[#f7f3ee] pb-5 [background-image:radial-gradient(rgba(158,94,45,.12)_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="onboarding-phone relative h-[472px] w-[236px] shrink-0 overflow-hidden rounded-[38px] border-[5px] border-[#2b2633] bg-white shadow-[0_22px_50px_rgba(43,38,51,.20)]">
            <img src="/assets/reindeer-coffee-break.png" width="512" height="512" alt="A coffee cup in the camera view" className="pointer-events-none absolute inset-0 h-[78%] w-full select-none object-cover" />
            <div className="absolute inset-x-0 top-0 flex h-12 items-center justify-between bg-gradient-to-b from-black/35 to-transparent px-4 text-[10px] font-bold text-white"><span>9:41</span><span>● ●●</span></div>
            <div className="absolute left-[88px] top-[148px] h-[88px] w-[88px] rounded-[20px] bg-white/[.06] shadow-[0_0_0_1px_rgba(255,255,255,.18)]" aria-hidden="true">
              <span className="absolute left-0 top-0 h-6 w-6 rounded-tl-[18px] border-l-[4px] border-t-[4px] border-white" />
              <span className="absolute right-0 top-0 h-6 w-6 rounded-tr-[18px] border-r-[4px] border-t-[4px] border-white" />
              <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-[18px] border-b-[4px] border-l-[4px] border-white" />
              <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br-[18px] border-b-[4px] border-r-[4px] border-white" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-[108px] items-center justify-center rounded-t-[28px] bg-white/95">
              <span className="grid h-[62px] w-[62px] place-items-center rounded-full border-[3px] border-[#e7d5c3] bg-white shadow-sm"><span className="h-[45px] w-[45px] rounded-full bg-cinnamon" /></span>
            </div>
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Keep it',
      title: 'A photo becomes a word you can use.',
      body: 'Get the sticker, pronunciation, and a sentence—not another lonely flashcard.',
      visual: (
        <div className="relative isolate flex h-full items-end justify-center overflow-hidden bg-[#f7f3ee] pb-5 [background-image:radial-gradient(rgba(158,94,45,.12)_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="onboarding-phone relative h-[472px] w-[236px] shrink-0 overflow-hidden rounded-[38px] border-[5px] border-[#2b2633] bg-[linear-gradient(180deg,#fff8df,#fff_72%)] shadow-[0_22px_50px_rgba(43,38,51,.20)]">
            <div className="absolute left-1/2 top-[54px] -translate-x-1/2">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,220,98,.7)_0%,rgba(255,230,145,.34)_38%,transparent_70%)] blur-[2px]" aria-hidden="true" />
              <div className="word-found-rays pointer-events-none absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
              <span className="sticker-cutout relative grid h-[132px] w-[132px] place-items-center text-[82px]" role="img" aria-label="Coffee cup sticker">☕</span>
            </div>
            <div className="absolute inset-x-4 top-[210px] rounded-[24px] bg-white p-4 shadow-[0_12px_30px_rgba(68,46,32,.10)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-[31px] font-bold leading-none text-ink">kahvi</p>
                  <p className="mt-2 text-xs font-semibold text-cinnamon">/ˈkɑhʋi/</p>
                  <p className="mt-1 text-xs text-stone-500">coffee</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#fff1df] text-cinnamon"><Volume2 size={18} /></span>
              </div>
              <div className="mt-4 rounded-2xl bg-[#fff5d8] px-3 py-3">
                <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#8b6723]">Say it today</p>
                <p className="mt-1 font-serif text-sm font-semibold text-ink">Juon kahvia aamulla.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      eyebrow: 'Make it stick',
      title: 'Learn a little. Heat the sauna.',
      body: 'Capture words to fill the bucket. Practice to earn firewood. After a sauna, your reindeer might thank you with a little gift.',
      visual: (
        <div className="relative h-full overflow-hidden bg-[#dbe8ef]">
          <img src="/assets/reindeer-ice-swimming.png" width="512" height="512" alt="The reindeer trying Finnish ice swimming" className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[58%_center]" />
          <div className="absolute bottom-5 right-4 flex gap-2">
            <div className="flex h-11 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-bold tabular-nums text-cinnamon"><img src="/assets/sauna-bucket-icon.png" width="28" height="28" alt="" className="h-7 w-7 object-contain" />3</div>
            <div className="flex h-11 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-bold tabular-nums text-cinnamon"><img src="/assets/sauna-firewood-icon.png" width="28" height="28" alt="" className="h-7 w-7 object-contain" />3</div>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div id="content" className="relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#fff7eb_0%,#fff_55%)] pb-[max(24px,env(safe-area-inset-bottom))]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-[calc(44px+max(20px,env(safe-area-inset-top)))] items-end justify-between px-5">
        {page > 0 ? (
          <button onClick={() => setPage((current) => current - 1)} aria-label="Previous onboarding screen" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/90 text-ink shadow-sm transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.96]"><ChevronLeft size={22} className="-translate-x-px" /></button>
        ) : <span className="h-11 w-11" />}
        {page < lastPage - 1 && <button onClick={() => setPage(lastPage - 1)} className="pointer-events-auto min-h-11 rounded-full bg-white/70 px-3 text-sm font-semibold text-stone-600 transition-[color,transform] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.96]">Skip</button>}
      </div>

      {page < lastPage - 1 ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="onboarding-visual min-h-[280px] flex-1 overflow-hidden">{screens[page].visual}</div>
          <div className="shrink-0 px-5 pb-1 pt-6">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cinnamon">{screens[page].eyebrow}</p>
            <h1 className="mt-2 max-w-[340px] text-balance text-[30px] font-semibold leading-[1.08] tracking-[-.04em] text-ink">{screens[page].title}</h1>
            <p className="mt-3 max-w-[335px] text-pretty text-[15px] leading-6 text-stone-600">{screens[page].body}</p>
          </div>
        </div>
      ) : page === lastPage - 1 ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="onboarding-choice-hero relative shrink-0 pt-[max(54px,env(safe-area-inset-top))]">
            <div className="onboarding-choice-art pointer-events-none absolute left-1/2 -translate-x-1/2 select-none" aria-hidden="true">
              <div className="absolute inset-3 rounded-full bg-[#fee1b8]/70 blur-2xl" />
              <img src="/assets/reindeer-forest-hiking.png" width="512" height="512" alt="" className="relative h-full w-full rounded-[32px] object-cover" />
            </div>
          </div>
          <div className="onboarding-choice-copy px-5">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cinnamon">Choose your trail</p>
            <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-.04em] text-ink">Which language are we learning?</h1>
            <p className="mt-2 text-[15px] leading-6 text-stone-600">You can change this later in Profile.</p>
            <div className="mt-4 grid gap-2.5">
              {Object.entries(languages).map(([key, language]) => (
                <button key={key} type="button" aria-pressed={selectedLanguage === key} onClick={() => { if (selectedLanguage !== key) setSelectedGoal(null); setSelectedLanguage(key) }} className={cn('flex min-h-[64px] items-center justify-between rounded-[21px] border px-4 text-left transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.96]', selectedLanguage === key ? 'border-cinnamon bg-[#fff1df]' : 'border-black/[.06] bg-white/90')}>
                  <span className="flex items-center gap-3"><span className="text-2xl" aria-hidden="true">{language.flag}</span><span><span className="block text-base font-bold text-ink">{language.name}</span><span className="block text-xs font-medium text-stone-500">{language.localName}</span></span></span>
                  {selectedLanguage === key && <span className="grid h-7 w-7 place-items-center rounded-full bg-cinnamon text-white" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="onboarding-choice-hero relative shrink-0 pt-[max(54px,env(safe-area-inset-top))]">
            <div className="onboarding-choice-art pointer-events-none absolute left-1/2 -translate-x-1/2 select-none" aria-hidden="true">
              <div className="absolute inset-3 rounded-full bg-[#fee1b8]/70 blur-2xl" />
              <img src="/assets/reindeer-berry-picking.png" width="512" height="512" alt="" className="relative h-full w-full rounded-[32px] object-cover" />
            </div>
          </div>
          <div className="onboarding-choice-copy px-5">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-cinnamon">A reason to begin</p>
            <h1 className="mt-2 text-balance text-[30px] font-semibold leading-[1.08] tracking-[-.04em] text-ink">What brings you to {languages[selectedLanguage]?.name || 'this language'}?</h1>
            <div className="mt-5 pb-4"><LearningGoalOptions value={selectedGoal} onChange={setSelectedGoal} compact /></div>
          </div>
        </div>
      )}

      <div className="mt-4 grid h-12 shrink-0 grid-cols-[1fr_124px] items-center gap-4 px-5">
        <div className="flex items-center justify-start gap-1.5" aria-label={`Onboarding screen ${page + 1} of ${lastPage + 1}`}>
          {Array.from({ length: lastPage + 1 }, (_, index) => <span key={index} className={cn('h-1.5 rounded-full transition-[width,background-color] duration-200', index === page ? 'w-7 bg-cinnamon' : 'w-1.5 bg-stone-300')} />)}
        </div>
        {page < lastPage ? <Button disabled={page === lastPage - 1 && !selectedLanguage} onClick={() => setPage((current) => current + 1)} className="h-12 w-[124px] rounded-full bg-ink pl-5 pr-[18px] text-white shadow-none transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.96] disabled:bg-stone-200 disabled:text-stone-400">Continue <ChevronRight size={18} /></Button> : <Button disabled={!selectedGoal} onClick={() => selectedLanguage && selectedGoal && onSelect(selectedLanguage, selectedGoal)} className="h-12 w-[124px] rounded-full bg-ink px-3 text-white shadow-none transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.96] disabled:bg-stone-200 disabled:text-stone-400">Start learning</Button>}
      </div>
    </div>
  )
}

function LearningGoalOptions({ value, onChange, compact = false }) {
  return <div className={cn('grid', compact ? 'gap-2' : 'gap-2.5')} role="group" aria-label="Learning goal">
    {learningGoals.map((goal) => <button key={goal.id} type="button" aria-pressed={value === goal.id} onClick={() => onChange(goal.id)} className={cn('flex w-full items-center justify-between gap-3 rounded-[20px] border px-4 text-left transition-[transform,background-color,border-color] duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 active:scale-[.98]', compact ? 'min-h-[54px] py-1.5' : 'min-h-[68px] py-3', value === goal.id ? 'border-cinnamon bg-[#fff1df]' : 'border-black/[.06] bg-white/90')}>
      <span><span className="block text-sm font-bold text-ink">{goal.label}</span><span className="mt-0.5 block text-xs leading-4 text-stone-600">{goal.detail}</span></span>
      {value === goal.id && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cinnamon text-white" aria-hidden="true"><Check size={16} strokeWidth={3} /></span>}
    </button>)}
  </div>
}

function LanguageDropdown({ selectedKey, onSelect }) {
  const [open, setOpen] = useState(false)
  const selectedLanguage = languages[selectedKey]

  return (
    <div className="relative">
      <button onClick={() => setOpen((isOpen) => !isOpen)} aria-haspopup="listbox" aria-expanded={open} className="flex min-h-11 items-center gap-2 rounded-full border border-black/[.07] bg-white px-3 text-sm font-bold text-ink shadow-sm transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.98]">
        <span className="text-lg" aria-hidden="true">{selectedLanguage.flag}</span>
        <span>{selectedLanguage.name}</span>
        <ChevronDown size={16} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="listbox" aria-label="Choose target language" className="absolute right-0 top-14 z-30 grid w-44 gap-1 rounded-2xl border border-black/[.07] bg-white p-2 shadow-float">
          {Object.entries(languages).map(([key, language]) => (
            <button key={key} role="option" aria-selected={key === selectedKey} onClick={() => { onSelect(key); setOpen(false) }} className={cn('flex min-h-11 items-center justify-between rounded-xl px-3 text-left text-sm font-semibold text-ink transition-[background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.99]', key === selectedKey ? 'bg-brand-soft' : 'hover:bg-stone-50')}>
              <span className="flex items-center gap-2"><span className="text-lg" aria-hidden="true">{language.flag}</span>{language.name}</span>
              {key === selectedKey && <Check size={16} className="text-moss" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryIcon({ name, item }) {
  const category = name.toLowerCase()
  const word = item?.english?.toLowerCase() || item?.word?.toLowerCase() || ''
  const iconProps = { size: 18, strokeWidth: 2.6 }

  if (category.includes('café') || category.includes('cafe') || category.includes('kitchen') || word.includes('coffee')) return <Coffee {...iconProps} />
  if (category.includes('home') || word.includes('door')) return <DoorOpen {...iconProps} />
  if (word.includes('key')) return <KeyRound {...iconProps} />
  if (category.includes('phrase')) return <MessageSquareText {...iconProps} />
  if (category.includes('go') || category.includes('daily') || word.includes('go')) return <Footprints {...iconProps} />
  if (word.includes('water') || word.includes('drink')) return <Droplet {...iconProps} />

  return <BookOpen {...iconProps} />
}

function polarPoint(center, radius, angle) {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  }
}

function ringArcPath(center, radius, startAngle, endAngle) {
  const start = polarPoint(center, radius, startAngle)
  const end = polarPoint(center, radius, endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

function CategoryProgress({ stats, activityByDate, todayCount, dailyGoal, onCapture }) {
  const today = new Date()
  const todayIndex = (today.getDay() + 6) % 7
  const activity = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index - todayIndex)
    return index === todayIndex ? todayCount : activityByDate[localDateKey(day)] || 0
  })
  let currentStreak = 0
  const streakDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (todayCount === 0) streakDay.setDate(streakDay.getDate() - 1)
  while ((activityByDate[localDateKey(streakDay)] || (localDateKey(streakDay) === localDateKey(today) ? todayCount : 0)) > 0) {
    currentStreak += 1
    streakDay.setDate(streakDay.getDate() - 1)
  }
  const maxActivity = Math.max(...activity, dailyGoal)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <section className="relative z-10 -mt-2 overflow-hidden pb-4 pt-5 text-ink" aria-labelledby="learning-overview-title">
      <h2 id="learning-overview-title" className="sr-only">Learning overview</h2>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0 rounded-2xl bg-white/80 px-3 py-3 shadow-[inset_0_0_0_1px_rgba(91,55,32,.06)]">
          <p className="font-sans text-[28px] font-semibold leading-none tracking-[-.04em] text-ink tabular-nums">{currentStreak}</p>
          <p className="mt-1.5 text-[11px] font-semibold leading-4 text-stone-600">Streak</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/80 px-3 py-3 shadow-[inset_0_0_0_1px_rgba(91,55,32,.06)]">
          <p className="font-sans text-[28px] font-semibold leading-none tracking-[-.04em] text-ink tabular-nums">{stats.wordCount}</p>
          <p className="mt-1.5 text-[11px] font-semibold leading-4 text-stone-600">Words</p>
        </div>
        <div className="min-w-0 rounded-2xl bg-white/80 px-3 py-3 shadow-[inset_0_0_0_1px_rgba(91,55,32,.06)]">
          <p className="font-sans text-[28px] font-semibold leading-none tracking-[-.04em] text-ink tabular-nums">{stats.phraseCount}</p>
          <p className="mt-1.5 text-[11px] font-semibold leading-4 text-stone-600">Phrases</p>
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3"><p className="text-xs font-semibold text-stone-600">This week</p><p className="text-xs font-semibold tabular-nums text-cinnamon">Today {todayCount}/{dailyGoal}</p></div>
      <div className="mt-3 grid grid-cols-7 gap-2" aria-label={`${todayCount} captures today toward a goal of ${dailyGoal}, with daily activity shown from Monday to Sunday`}>
        {days.map((day, index) => {
          const count = activity[index]
          const fill = count === 0 ? 0 : 24 + (count / maxActivity) * 66
          const isToday = index === todayIndex
          return (
            <div key={day} className="flex min-w-0 flex-col items-center">
              <span className={cn('mb-1.5 text-[10px] font-bold tabular-nums', count > 0 ? 'text-ink' : 'text-stone-400')}>{index > todayIndex ? '·' : count}</span>
              <div className="relative h-[76px] w-4 overflow-hidden rounded-full" style={{ backgroundColor: 'oklch(0.92 0.012 65)' }}>
                <div className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: `${fill}%`, backgroundColor: isToday ? 'oklch(0.52 0.1 55)' : 'oklch(0.72 0.06 55)' }} />
              </div>
              <span className={cn('mt-2 text-[10px] font-bold', isToday ? 'text-cinnamon' : 'text-stone-500')}>{day}</span>
            </div>
          )
        })}
      </div>
      <Button onClick={onCapture} className="mt-4 w-full bg-ink text-white hover:bg-ink/90" size="lg"><Camera size={18} />Capture something</Button>
    </section>
  )
}

function HomeView({ language, reviewItems, dailyVerbs, savedDailyWords, dailyGoal, dailyRewards, saunaDaysRemaining, nextGift, captureActivity, onCaptureObject, onStartQuiz, onStartMatching, onOpenWord, onClaimSaunaGift }) {
  const stats = getLearningStats(reviewItems, dailyVerbs, savedDailyWords)
  const [fikaOpen, setFikaOpen] = useState(false)
  const [saunaStage, setSaunaStage] = useState(null)
  const captureCount = dailyRewards.captureCount || 0
  const woodCount = dailyRewards.woodCount || 0
  const saunaReady = captureCount >= 3 && woodCount >= 3 && saunaDaysRemaining === 0 && Boolean(nextGift)
  const saunaClaimed = Boolean(dailyRewards.saunaGiftClaimed)
  const heroCopy = saunaClaimed ? 'You made one reindeer very happy.' : !nextGift ? 'Every sauna treat is yours.' : saunaDaysRemaining ? 'The reindeer is resting up.' : saunaReady ? 'The sauna is ready.' : captureCount >= 3 ? 'Water ready. Feed the fire.' : 'Three finds fill the bucket.'

  return (
    <div id="content" className="home-canvas min-h-full px-5">
      <section className="home-hero relative -mx-5 min-h-[350px] overflow-hidden px-6 pb-8 pt-6">
        <img src="/assets/reindeer-sauna-prep-home.png" width="680" height="680" fetchPriority="high" alt="A reindeer preparing a Finnish sauna" className="pointer-events-none absolute -bottom-3 left-0 h-[340px] w-[340px] object-contain" />
        {saunaReady && <span className="pointer-events-none absolute left-[67%] top-[31%] h-24 w-12 animate-pulse rounded-full bg-white/35 blur-xl" aria-hidden="true" />}
        <div className="relative z-10 flex items-center justify-end">
          <button onClick={() => setFikaOpen(true)} aria-label="Open sauna rewards" className="shrink-0 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]">
            {saunaClaimed || saunaReady || saunaDaysRemaining || !nextGift ? <Chip className="h-11 min-w-[88px] flex-nowrap justify-center gap-1.5 whitespace-nowrap bg-white/80 py-1 pl-1.5 pr-3 text-cinnamon backdrop-blur-sm"><img src={saunaReady ? nextGift.image : '/assets/reindeer-sauna.png'} alt="" width="32" height="32" className="pointer-events-none h-8 w-8 shrink-0 rounded-full object-cover" /><span>{saunaClaimed ? 'Enjoyed' : saunaReady ? 'Ready' : saunaDaysRemaining ? `${saunaDaysRemaining}d` : 'Complete'}</span></Chip> : <span className="flex gap-1.5"><Chip className="h-10 gap-1 bg-white/80 py-1 pl-1 pr-2.5 text-cinnamon backdrop-blur-sm"><img src="/assets/sauna-bucket-icon.png" alt="" width="30" height="30" className="pointer-events-none h-7 w-7 shrink-0 object-contain" />{captureCount}/3</Chip><Chip className="h-10 gap-1 bg-white/80 py-1 pl-1 pr-2.5 text-cinnamon backdrop-blur-sm"><img src="/assets/sauna-firewood-icon.png" alt="" width="30" height="30" className="pointer-events-none h-7 w-7 shrink-0 object-contain" />{Math.min(woodCount, 3)}/3</Chip></span>}
          </button>
        </div>
        <div className="relative ml-auto mt-5 min-h-[220px] w-[9.5rem]">
          <div className="min-w-0 text-right">
            <h1 className="text-balance font-sans text-[25px] font-semibold leading-[1.05] tracking-[-.04em] text-ink">{heroCopy}</h1>
          </div>
        </div>
      </section>

      <CategoryProgress stats={stats} activityByDate={captureActivity} todayCount={captureActivity[localDateKey(new Date())] ?? captureCount} dailyGoal={dailyGoal} onCapture={onCaptureObject} />

      <div className="mt-4 grid h-[244px] grid-cols-[1.08fr_.92fr] gap-3 pb-3">
        <button onClick={() => onOpenWord(dailyVerbs[0])} className="relative min-w-0 overflow-hidden rounded-[24px] border border-black/[.06] bg-tile px-4 pb-4 pt-4 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.98]" aria-labelledby="daily-verbs-title">
          <span className="absolute left-4 right-4 top-4">
            <span id="daily-verbs-title" className="block text-base font-bold leading-tight text-ink">Today’s verbs</span>
            <span className="mt-2 block text-xs leading-[1.45] text-stone-600">{stats.dailySavedCount ? `${stats.dailySavedCount} of ${stats.dailyTotal} learned today.` : dailyVerbs[0]?.linkedWord ? `Use “${dailyVerbs[0].linkedWord}” in a sentence.` : 'Turn saved stickers into sentences.'}</span>
          </span>
          <img src="/assets/feature-daily-verbs.png" alt="" className="pointer-events-none absolute bottom-3 right-3 h-20 w-20 object-contain" />
        </button>

        <div className="grid min-h-0 grid-rows-2 gap-2">
          <button onClick={onStartQuiz} className="group relative min-h-0 overflow-hidden rounded-[24px] border border-black/[.06] bg-tile px-4 pb-4 pt-4 text-left transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.98]" aria-label="Start sticker quiz">
            <span className="absolute left-4 right-4 top-4">
              <span className="block text-base font-bold leading-tight text-ink">Sticker quiz</span>
              <span className="mt-2 block max-w-[6rem] text-xs leading-[1.4] text-stone-600">Review saved words.</span>
            </span>
            <img src="/assets/feature-quiz-book.png" alt="" className="pointer-events-none absolute bottom-2 right-2 h-12 w-12 object-contain" />
          </button>

          <button onClick={onStartMatching} className="group relative min-h-0 overflow-hidden rounded-[24px] border border-black/[.06] bg-tile px-4 pb-4 pt-4 text-left transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.98]" aria-label="Start timed word matching">
            <span className="absolute left-4 right-4 top-4">
              <span className="block text-base font-bold leading-tight text-ink">Match words</span>
              <span className="mt-2 block max-w-[6rem] text-xs leading-[1.4] text-stone-600">Pair translations fast.</span>
            </span>
            <img src="/assets/feature-match-countdown.png" alt="" className="pointer-events-none absolute bottom-2 right-2 h-12 w-12 object-contain" />
          </button>
        </div>
      </div>
      {fikaOpen && createPortal(<FikaSheet rewards={dailyRewards} daysRemaining={saunaDaysRemaining} hasGift={Boolean(nextGift)} onClose={() => setFikaOpen(false)} onEnjoy={() => { setFikaOpen(false); setSaunaStage('sauna') }} />, document.querySelector('.app-shell'))}
      {saunaStage === 'sauna' && <SaunaMoment capturedWords={dailyRewards.capturedWords} onOpenGift={() => setSaunaStage('gift')} />}
      {saunaStage === 'gift' && nextGift && <SaunaGift language={language} gift={nextGift} capturedWords={dailyRewards.capturedWords} onCollect={() => { onClaimSaunaGift(); setSaunaStage(null) }} />}
    </div>
  )
}

function compressPhoto(file, captureMode) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please choose an image file.'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read this photo.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not open this photo.'))
      image.onload = () => {
        const maxSide = captureMode === 'object' ? 960 : 1600
        const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.naturalWidth * scale)
        canvas.height = Math.round(image.naturalHeight * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.84))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not prepare the sticker image.'))
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

function resizeStickerImage(source, maxSide = 384) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('Could not prepare the sticker for saving.'))
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
      if (scale === 1) {
        resolve(source)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', 0.86))
    }
    image.src = source
  })
}

let cutoutWorker = null
let cutoutJobId = 0
const cutoutJobs = new Map()
let cutoutPreloadPromise = null

function ensureCutoutWorker() {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') throw new Error('Worker canvas unavailable.')
  if (!cutoutWorker) {
    cutoutWorker = new Worker(new URL('./cutout.worker.js', import.meta.url), { type: 'module' })
    cutoutWorker.onmessage = ({ data }) => {
      const job = cutoutJobs.get(data.id)
      if (!job) return
      cutoutJobs.delete(data.id)
      if (data.type === 'complete' || data.type === 'ready') job.resolve(data.blob ?? true)
      else job.reject(new Error(data.message || 'Could not prepare the cutout model.'))
    }
    cutoutWorker.onerror = () => {
      for (const job of cutoutJobs.values()) job.reject(new Error('Cutout worker stopped.'))
      cutoutJobs.clear()
      cutoutWorker.terminate()
      cutoutWorker = null
      cutoutPreloadPromise = null
    }
  }
  return cutoutWorker
}

function cancelCutoutJobs() {
  cutoutWorker?.terminate()
  cutoutWorker = null
  cutoutPreloadPromise = null
  for (const job of cutoutJobs.values()) job.reject(new DOMException('Capture stopped.', 'AbortError'))
  cutoutJobs.clear()
}

function sendCutoutWorkerJob(type, source) {
  return new Promise((resolve, reject) => {
    try {
      const worker = ensureCutoutWorker()
      const id = ++cutoutJobId
      cutoutJobs.set(id, { resolve, reject })
      worker.postMessage({ id, source, type })
    } catch (error) {
      reject(error)
    }
  })
}

function warmCutoutModel() {
  if (!cutoutPreloadPromise) {
    cutoutPreloadPromise = sendCutoutWorkerJob('preload').catch((error) => {
      cutoutPreloadPromise = null
      throw error
    })
  }
  return cutoutPreloadPromise
}

async function removeBackgroundOffThread(source) {
  await warmCutoutModel()
  return sendCutoutWorkerJob('remove', source)
}

async function prepareEarlyCutout(source, { cpuOnly = false, signal } = {}) {
  const scaledPhoto = await resizeStickerImage(source, 640)
  signal?.throwIfAborted()
  const removeOnCpu = () => {
    signal?.throwIfAborted()
    return sendCutoutWorkerJob('remove-cpu', scaledPhoto)
  }
  const foreground = cpuOnly ? await removeOnCpu() : await removeBackgroundOffThread(scaledPhoto).catch(removeOnCpu)
  signal?.throwIfAborted()
  const foregroundUrl = await blobToDataUrl(foreground)
  const image = await new Promise((resolve, reject) => {
    const loaded = new Image()
    loaded.onload = () => resolve(loaded)
    loaded.onerror = () => reject(new Error('Could not read the object cutout.'))
    loaded.src = foregroundUrl
  })
  const width = image.naturalWidth
  const height = image.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0)
  const alpha = context.getImageData(0, 0, width, height).data
  let left = width
  let top = height
  let right = 0
  let bottom = 0
  let foregroundPixels = 0
  const edges = []

  for (let y = 0; y < height; y += 3) {
    let first = width
    let last = -1
    for (let x = 0; x < width; x += 2) {
      if (alpha[(y * width + x) * 4 + 3] < 96) continue
      first = Math.min(first, x)
      last = x
      foregroundPixels += 1
    }
    if (last < 0) continue
    left = Math.min(left, first)
    right = Math.max(right, last)
    top = Math.min(top, y)
    bottom = y
    edges.push([first, last, y])
  }
  if (foregroundPixels < width * height * .002 || !edges.length) throw new Error('No usable object cutout was found.')

  const outlinePoints = [
    ...edges.map(([first, , y]) => [first, y]),
    ...edges.slice().reverse().map(([, last, y]) => [last, y]),
  ]
  const outlinePath = `${outlinePoints.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')} Z`

  const pad = Math.max(12, Math.round(Math.max(right - left, bottom - top) * .08))
  const cropX = Math.max(0, left - pad)
  const cropY = Math.max(0, top - pad)
  const cropWidth = Math.min(width - cropX, right - cropX + pad)
  const cropHeight = Math.min(height - cropY, bottom - cropY + pad)
  const sticker = document.createElement('canvas')
  const scale = Math.min(1, 384 / Math.max(cropWidth, cropHeight))
  sticker.width = Math.max(1, Math.round(cropWidth * scale))
  sticker.height = Math.max(1, Math.round(cropHeight * scale))
  sticker.getContext('2d').drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, sticker.width, sticker.height)
  return { stickerImage: sticker.toDataURL('image/png'), foregroundImage: foregroundUrl, foregroundBox: { x: left / width * 100, y: top / height * 100, width: (right - left + 1) / width * 100, height: (bottom - top + 1) / height * 100 }, outlinePath, outlineViewBox: `0 0 ${width} ${height}` }
}

function cropPhotoToBox(source, boundingBox) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onerror = () => reject(new Error('Could not focus on the identified object.'))
    image.onload = () => {
      const fallback = { x: 15, y: 15, width: 70, height: 70 }
      const box = boundingBox && ['x', 'y', 'width', 'height'].every((key) => Number.isFinite(Number(boundingBox[key]))) ? boundingBox : fallback
      const widthPercent = Math.min(100, Math.max(5, Number(box.width)))
      const heightPercent = Math.min(100, Math.max(5, Number(box.height)))
      const paddingX = Math.min(8, widthPercent * 0.12)
      const paddingY = Math.min(8, heightPercent * 0.12)
      const left = Math.max(0, Number(box.x) - paddingX)
      const top = Math.max(0, Number(box.y) - paddingY)
      const right = Math.min(100, Number(box.x) + widthPercent + paddingX)
      const bottom = Math.min(100, Number(box.y) + heightPercent + paddingY)
      const sourceX = image.naturalWidth * left / 100
      const sourceY = image.naturalHeight * top / 100
      const sourceWidth = Math.max(1, image.naturalWidth * (right - left) / 100)
      const sourceHeight = Math.max(1, image.naturalHeight * (bottom - top) / 100)
      const maxSide = 1024
      const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(sourceWidth * scale))
      canvas.height = Math.max(1, Math.round(sourceHeight * scale))
      canvas.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.src = source
  })
}

function CameraView({ language, captureMode, onCaptureModeChange, onBack, onRecognize }) {
  const isPhraseMode = captureMode === 'phrase'
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)
  const swipeStartRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    let stream
    let active = true

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available here. Choose a photo instead.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      } catch {
        setCameraError('Camera permission was not granted. Choose a photo instead.')
      }
    }

    startCamera()
    return () => {
      active = false
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const captureFrame = () => {
    const video = videoRef.current
    if (!cameraReady || !video?.videoWidth) {
      fileInputRef.current?.click()
      return
    }
    const maxSide = captureMode === 'object' ? 960 : 1600
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    primeSpeech(language.locale)
    onRecognize(canvas.toDataURL('image/jpeg', 0.84))
  }

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    primeSpeech(language.locale)
    setPhotoError('')
    try {
      onRecognize(await compressPhoto(file, captureMode))
    } catch (error) {
      setPhotoError(error.message)
    }
  }

  const startModeSwipe = (event) => {
    if (event.target instanceof Element && event.target.closest('button, input')) return
    const touch = event.touches[0]
    swipeStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  const finishModeSwipe = (event) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null
    const touch = event.changedTouches[0]
    if (!start || !touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.3) return
    onCaptureModeChange(dx < 0 ? 'phrase' : 'object')
  }

  return (
    <div id="content" onTouchStart={startModeSwipe} onTouchEnd={finishModeSwipe} onTouchCancel={() => { swipeStartRef.current = null }} className="relative h-full min-h-0 touch-pan-y overflow-hidden bg-[#1c2522] text-white">
      <video ref={videoRef} muted playsInline autoPlay onLoadedMetadata={() => setCameraReady(true)} className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-200', cameraReady ? 'opacity-100' : 'opacity-0')} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,18,16,.60),transparent_28%,transparent_55%,rgba(12,18,16,.95))]" />

      <header className="camera-safe-inline absolute inset-x-0 top-0 z-10 grid grid-cols-[44px_1fr_44px] items-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <button onClick={onBack} aria-label="Close camera" className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/30 text-white backdrop-blur-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.96]"><ChevronLeft /></button>
        <h1 className="text-center font-serif text-xl font-bold">Capture</h1>
        <span aria-hidden="true" />
      </header>

      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(1.25rem,env(safe-area-inset-top))+5.5rem)] z-10 px-6 text-center">
        <h2 className="font-serif text-[22px] font-bold drop-shadow-md">{isPhraseMode ? 'Frame a short phrase' : 'Point at one thing'}</h2>
        <p className="mt-1 text-sm font-medium text-white/85 drop-shadow-md">{isPhraseMode ? 'Signs and labels work best.' : 'Keep the object clear and centered.'}</p>
      </div>

      <div className="pointer-events-none absolute inset-x-[17%] top-[30%] bottom-[34%]" aria-hidden="true">
        <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/90" />
        <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/90" />
        <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/90" />
        <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white/90" />
      </div>

      {!cameraReady && <div className="pointer-events-none absolute inset-0 grid place-items-center px-10 text-center"><p className="max-w-[17rem] text-sm font-semibold text-white/80">{cameraError || 'Starting camera…'}</p></div>}

      <div className="camera-safe-inline absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {photoError && <p role="alert" className="mb-3 rounded-xl bg-black/60 px-4 py-2 text-center text-sm font-semibold text-white">{photoError}</p>}
        <button onClick={captureFrame} aria-label={cameraReady ? isPhraseMode ? 'Capture phrase' : 'Capture object' : isPhraseMode ? 'Select a phrase photo' : 'Select an object photo'} className="grid h-[82px] w-[82px] place-items-center rounded-full border-[5px] border-white bg-white/20 shadow-[0_5px_20px_rgba(0,0,0,.32)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c2522] active:scale-[.94]">
          <span className="grid h-[62px] w-[62px] place-items-center rounded-full bg-ink text-white"><Camera size={25} aria-hidden="true" /></span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choosePhoto} className="hidden" tabIndex={-1} aria-hidden="true" />
        <div className="relative mt-6 grid w-[min(100%,280px)] grid-cols-2 rounded-full border border-white/25 bg-black/45 p-1 shadow-[0_6px_20px_rgba(0,0,0,.18)] backdrop-blur-md" role="group" aria-label="Choose what to capture">
          <span aria-hidden="true" className={cn('pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white/20 shadow-[0_1px_5px_rgba(0,0,0,.18)] ring-1 ring-white/35 transition-transform duration-200 ease-out motion-reduce:transition-none', isPhraseMode && 'translate-x-full')} />
          {[
            { key: 'object', label: 'Object' },
            { key: 'phrase', label: 'Short phrase' },
          ].map((mode) => (
            <button key={mode.key} onClick={() => onCaptureModeChange(mode.key)} className={cn('relative z-10 min-h-11 rounded-full px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', captureMode === mode.key ? 'text-white' : 'text-white/65')} aria-pressed={captureMode === mode.key}>{mode.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ObjectLiftingView({ image, cutout, word, stage, language, error, onRetry }) {
  const [phase, setPhase] = useState('scan')
  const liftingRef = useRef(null)
  const statusRef = useRef(null)
  const wordReady = Boolean(word)
  const stickerReady = Boolean(cutout)
  const pairReady = stage >= 2
  const finished = wordReady && stickerReady && pairReady
  const activeStep = pairReady ? 2 : wordReady ? 1 : 0
  const stepLabels = ['Finding the word', 'Lifting the sticker', 'Pairing them up']
  const status = finished
    ? 'All set. Your new word is ready.'
    : wordReady && stickerReady
      ? 'The word and sticker are ready. Bringing them together…'
      : wordReady
        ? `Found “${word.word}”. Trimming the sticker…`
        : stickerReady
          ? `The sticker’s ready. Finding its ${language.name} word…`
          : 'Finding the word and trimming its sticker…'

  useEffect(() => {
    if (!cutout) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('land')
      return undefined
    }
    setPhase(cutout.outlinePath ? 'trace' : 'lift')
    const hasOutline = Boolean(cutout.outlinePath)
    const liftTimer = window.setTimeout(() => setPhase('lift'), hasOutline ? STICKER_TRACE_MS : 0)
    const landTimer = window.setTimeout(() => setPhase('land'), (hasOutline ? STICKER_TRACE_MS : 0) + STICKER_LIFT_MS)
    return () => {
      window.clearTimeout(liftTimer)
      window.clearTimeout(landTimer)
    }
  }, [cutout])

  return (
    <div id="content" ref={liftingRef} className="capture-lifting relative isolate min-h-full overflow-hidden bg-[#fff9ef] text-center" data-phase={error ? 'error' : phase} style={{ '--sticker-trace-duration': `${STICKER_TRACE_MS}ms` }}>
      <div className="capture-lifting-scene absolute inset-0">
        {image && <img src={image} alt="Your captured photo" className="capture-lifting-photo h-full w-full object-cover" />}
        <div className="capture-lifting-dim absolute inset-0 bg-ink/65" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink/55 via-ink/15 to-transparent" aria-hidden="true" />
        {!error && <div className="capture-lifting-scan pointer-events-none absolute inset-x-[17%] top-[30%] bottom-[34%]" aria-hidden="true">
          <span className="capture-lifting-scan-line absolute inset-x-4 top-1/2 h-px bg-white/70" />
          <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/85" />
          <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/85" />
          <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/85" />
          <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-[3px] border-r-[3px] border-white/85" />
        </div>}
        {cutout?.foregroundImage && !error && <img src={cutout.foregroundImage} alt="" className="capture-lifting-foreground pointer-events-none absolute inset-0 h-full w-full object-cover" aria-hidden="true" />}
        {cutout?.outlinePath && !error && <svg viewBox={cutout.outlineViewBox} preserveAspectRatio="xMidYMid slice" className="capture-lifting-outline pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true"><path d={cutout.outlinePath} pathLength="1" fill="none" stroke="white" strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" className="capture-lifting-outline-path" /></svg>}
      </div>
      <div className="capture-lifting-cream pointer-events-none absolute inset-0 bg-[#fff9ef]" aria-hidden="true" />

      {!error && cutout && <div className="capture-lifting-sticker pointer-events-none absolute left-1/2 w-[min(52vw,190px)]" style={{ top: 'calc(64px + env(safe-area-inset-top) + min(13.5dvh, 110px))' }} aria-hidden="true">
        <img src={cutout.stickerImage} alt="" className="capture-lifting-sticker-body h-[min(21dvh,170px)] w-full object-contain" />
        <img src={cutout.stickerImage} alt="" className="capture-lifting-sticker-border captured-sticker-cutout absolute inset-0 h-[min(21dvh,170px)] w-full object-contain" />
        <span className="capture-lifting-sparkle capture-lifting-sparkle-one absolute -left-2 top-5" />
        <span className="capture-lifting-sparkle capture-lifting-sparkle-two absolute -right-3 top-1/3" />
        <span className="capture-lifting-sparkle capture-lifting-sparkle-three absolute bottom-3 right-4" />
      </div>}

      {error ? <div className="absolute inset-x-6 bottom-[max(2rem,env(safe-area-inset-bottom))] rounded-[26px] bg-[#fff9ef] p-6 text-ink">
        <h1 className="font-serif text-2xl font-bold">Let’s try that again</h1>
        <p role="alert" className="mt-2 text-sm leading-6 text-red-700">{error}</p>
        <Button onClick={onRetry} className="mt-5 w-full" size="lg">Try another photo</Button>
      </div> : <>
        <section ref={statusRef} className="capture-lifting-status absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-20 flex flex-col items-center text-center text-white" aria-live="polite" aria-atomic="true">
          {wordReady && phase === 'land' ? <div className="capture-lifting-word text-center">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-cinnamon">{language.name}</p>
            <h1 className="capture-word-reveal mt-1 break-words font-serif text-[clamp(2.25rem,9vw,3rem)] font-bold leading-none text-white">{word.word}</h1>
            <p className="mt-1.5 text-sm text-white/85">{word.english}</p>
          </div> : <>
            <p key={activeStep} className={cn('capture-step-label min-h-8 font-serif text-[clamp(1.25rem,5vw,1.4rem)] font-bold leading-tight', !finished && 'capture-thinking')}>{stepLabels[activeStep]}{finished ? '' : '…'}</p>
            <p key={`detail-${activeStep}`} className={cn('capture-step-detail mt-2 min-h-10 text-sm leading-5', phase === 'land' ? 'text-stone-600' : 'text-white/90')}>{status}</p>
          </>}
        </section>
      </>}
    </div>
  )
}

function AnalyzingView({ captureMode, image, stage, cutout, word, language, error, onRetry }) {
  const isPhraseMode = captureMode === 'phrase'
  if (!isPhraseMode) return <ObjectLiftingView image={image} cutout={cutout} word={word} stage={stage} language={language} error={error} onRetry={onRetry} />
  const phases = isPhraseMode
    ? ['Reading the photo', 'Making your phrase sticker', 'Sticker ready']
    : ['Finding the object', 'Lifting it from the photo', 'Sticker ready']

  return (
    <div id="content" className="min-h-full bg-white px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] text-center">
      <header>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-moss">{error ? 'Couldn’t finish' : 'Creating your sticker'}</p>
        <h1 className="mt-2 font-serif text-3xl font-bold text-ink">{error ? 'Let’s try that again' : isPhraseMode ? 'Turning text into a memory' : 'Lifting it from the photo'}</h1>
      </header>

      <div className="relative mt-6 aspect-[3/4] overflow-hidden rounded-[30px] bg-[#26312f]">
        {image && <img src={image} alt="Your captured photo" className="capture-processing-photo absolute inset-0 h-full w-full object-cover" />}
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(38,35,49,.16),rgba(38,35,49,.48))]" />
        {!error && <span className="capture-focus-halo absolute left-1/2 top-1/2" aria-hidden="true" />}
        {!error && <span className="capture-orbit absolute left-1/2 top-1/2" aria-hidden="true" />}
        <div className={cn('capture-cutout-stage absolute left-1/2 top-1/2 overflow-hidden border-[4px] border-white bg-[#fff9ef]', isPhraseMode ? 'h-28 w-[76%] rounded-[22px]' : 'h-44 w-44 rounded-[36px]')}>
          {image && <img src={image} alt="" className="capture-cutout-image h-full w-full object-cover" />}
          {!error && <span className="capture-cutout-glow absolute inset-0 rounded-[inherit]" />}
        </div>
        {!error && <div className="pointer-events-none absolute inset-0" aria-hidden="true">{[[-68, -56], [64, -70], [-84, 34], [86, 45], [-24, 88], [32, 96]].map(([x, y], index) => <span key={index} className="capture-particle absolute left-1/2 top-1/2" style={{ '--particle-x': `${x}px`, '--particle-y': `${y}px`, animationDelay: `${index * 95}ms` }} />)}</div>}
      </div>

      {!error ? (
        <div className="mt-6" aria-live="polite">
          <div className="flex justify-center gap-2" aria-hidden="true">
            {phases.map((label, index) => <span key={label} className={cn('h-1.5 w-8 rounded-full transition-[transform,opacity,background-color] duration-200', index <= stage ? 'scale-100 bg-moss opacity-100' : 'scale-x-75 bg-stone-200 opacity-70')} />)}
          </div>
          <p className="mt-3 text-base font-bold text-ink">{phases[stage]}</p>
          <p className="mt-1 text-xs text-stone-500">This can take a moment on the first capture.</p>
        </div>
      ) : (
        <div className="mt-6">
          <p role="alert" className="mx-auto max-w-[19rem] text-sm leading-5 text-red-600">{error}</p>
          <Button onClick={onRetry} className="mt-5" size="lg">Try another photo</Button>
        </div>
      )}
    </div>
  )
}

function StickerAdjustSheet({ item, adjustment, onChange, onClose, onSave }) {
  const dialogRef = useDialogFocus(onClose)
  const setValue = (key, value) => onChange((current) => ({ ...current, [key]: value }))

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-ink/35 sm:rounded-[36px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sticker-edit-title" className="max-h-[min(76dvh,640px)] w-full overflow-y-auto overscroll-contain rounded-t-[30px] bg-white px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 text-ink shadow-[0_-16px_48px_rgba(38,35,49,.18)]">
        <div className="mx-auto h-1.5 w-11 rounded-full bg-[#e8ddcd]" aria-hidden="true" />
        <header className="mt-3 flex items-center justify-between gap-3">
          <h2 id="sticker-edit-title" className="font-serif text-3xl font-bold tracking-tight">Edit sticker</h2>
          <button type="button" onClick={() => onChange((current) => ({ ...current, scale: 1, rotation: 0 }))} className="min-h-11 rounded-full px-2 text-sm font-bold text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.96]">Reset</button>
        </header>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3"><label htmlFor="sticker-size" className="text-base font-bold">Size</label><output htmlFor="sticker-size" className="text-base tabular-nums text-stone-600">{Math.round(adjustment.scale * 100)}%</output></div>
            <input id="sticker-size" type="range" min="0.8" max="1.35" step="0.01" value={adjustment.scale} onChange={(event) => setValue('scale', Number(event.target.value))} className="sticker-adjust-range mt-2 w-full" style={{ '--range-progress': `${((adjustment.scale - 0.8) / 0.55) * 100}%` }} />
          </div>
          <div className="border-t border-[#eee5d9] pt-4">
            <div className="flex items-center justify-between gap-3"><label htmlFor="sticker-tilt" className="text-base font-bold">Tilt</label><output htmlFor="sticker-tilt" className="text-base tabular-nums text-stone-600">{adjustment.rotation}°</output></div>
            <input id="sticker-tilt" type="range" min="-12" max="12" step="1" value={adjustment.rotation} onChange={(event) => setValue('rotation', Number(event.target.value))} className="sticker-adjust-range mt-2 w-full" style={{ '--range-progress': `${((adjustment.rotation + 12) / 24) * 100}%` }} />
          </div>
        </div>
        {item.kind === 'object' && item.photoCropImage && <button type="button" onClick={() => setValue('usePhoto', !adjustment.usePhoto)} className="mt-3 min-h-11 w-full rounded-full text-sm font-bold text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">{adjustment.usePhoto ? 'Use cutout instead' : 'Use photo crop instead'}</button>}
        <Button type="button" onClick={onSave} className="mt-4 w-full" size="lg">Save edits</Button>
        <button type="button" onClick={onClose} className="mt-2 min-h-11 w-full rounded-full text-sm font-bold text-stone-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">Cancel</button>
      </section>
    </div>
  )
}

const captureLearningExamples = {
  fi: {
    käsi: {
      phrases: [{ text: 'Nostan käteni.', meaning: 'I raise my hand.', targetForm: 'käteni', formNote: 'käsi → käteni: Finnish uses the stem käte- with -ni (“my”), meaning “my hand.”' }, { text: 'Pesen käteni.', meaning: 'I wash my hands.', targetForm: 'käteni' }],
      forms: [{ form: 'käsi', meaning: 'hand (base form)' }, { form: 'käteni', meaning: 'my hand' }],
      chunks: [{ text: 'nostaa käsi', meaning: 'to raise a hand' }, { text: 'pestä kädet', meaning: 'to wash hands' }],
    },
    silmälasit: {
      phrases: [{ text: 'Ostan uudet silmälasit.', meaning: 'I’m buying new glasses.', targetForm: 'silmälasit' }, { text: 'Käytän silmälaseja.', meaning: 'I wear glasses.', targetForm: 'silmälaseja' }],
      forms: [{ form: 'silmälasit', meaning: 'glasses (base form)' }, { form: 'silmälaseja', meaning: 'glasses (object of “wear/use”)' }],
      chunks: [{ text: 'ostaa silmälasit', meaning: 'to buy glasses' }, { text: 'käyttää silmälaseja', meaning: 'to wear glasses' }],
    },
  },
}

function getCaptureLearningContent(item, language) {
  const locale = language.locale.slice(0, 2)
  const curated = captureLearningExamples[locale]?.[item.word?.trim().toLocaleLowerCase(language.locale)]
  const changedForm = item.form && item.form !== item.word ? item.form : ''
  const formExplanation = [item.formChange, item.formReason].filter((value, index, all) => typeof value === 'string' && value.trim() && all.findIndex((candidate) => typeof candidate === 'string' && candidate.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase()) === index).join(' ')
  const explanationHasFormPair = formExplanation.toLocaleLowerCase(language.locale).includes(item.word?.toLocaleLowerCase(language.locale) || '\u0000')
    && formExplanation.toLocaleLowerCase(language.locale).includes(changedForm.toLocaleLowerCase(language.locale))
  const formNote = changedForm
    ? explanationHasFormPair ? formExplanation : `${item.word} → ${changedForm}: ${formExplanation || 'This form is used to fit the word’s role in this sentence.'}`
    : ''
  const sentencePhrase = item.sentence ? {
    text: item.sentence,
    meaning: item.sentenceTranslation || '',
    targetForm: findCapturedForm(item.sentence, item.form, item.word, language.locale),
    formNote,
  } : null
  const expressionPhrase = item.expression?.sentence ? {
    text: item.expression.sentence,
    meaning: item.expression.translation || '',
    targetForm: findCapturedForm(item.expression.sentence, item.expression.wordForm, item.word, language.locale),
  } : null
  const phrases = curated?.phrases || [sentencePhrase, expressionPhrase].filter(Boolean)
  const forms = curated?.forms || [
    { form: item.word, meaning: item.english || 'base form' },
    ...(item.form && item.form !== item.word ? [{ form: item.form, meaning: item.formMeaning || 'related form' }] : []),
  ]
  const chunks = curated?.chunks || (item.sentenceParts || []).filter((part) => /[\p{L}\p{N}]/u.test(part.word || '')).map((part) => ({ text: part.word, meaning: part.meaning || '' }))
  return { phrases, forms, chunks }
}

function findCapturedForm(text, preferredForm, baseWord, locale) {
  const tokens = [...(text || '').matchAll(/[\p{L}\p{N}]+(?:[-’'][\p{L}\p{N}]+)*/gu)].map(([token]) => token)
  const candidates = [preferredForm, baseWord].filter(Boolean).map((candidate) => candidate.toLocaleLowerCase(locale))
  return tokens.find((token) => candidates.includes(token.toLocaleLowerCase(locale))) || ''
}

function HighlightedCapturePhrase({ phrase, locale }) {
  const targetForm = phrase.targetForm?.trim()
  if (!targetForm) return phrase.text
  const start = phrase.text.toLocaleLowerCase(locale).indexOf(targetForm.toLocaleLowerCase(locale))
  if (start < 0) return phrase.text
  const end = start + targetForm.length
  return <>{phrase.text.slice(0, start)}<span className="font-bold text-cinnamon">{phrase.text.slice(start, end)}</span>{phrase.text.slice(end)}</>
}

function ResultView({ language, item, captureMode, storageError, autoPlayPronunciation, onRetake, onEdit, onSave }) {
  const [playing, setPlaying] = useState(false)
  const [speechStatus, setSpeechStatus] = useState('')
  const [activeTab, setActiveTab] = useState('phrases')
  const hasAutoPlayed = useRef(false)
  const showIpa = useContext(ShowIpaContext)
  const isPhraseMode = captureMode === 'phrase'
  const target = item
  const learningContent = getCaptureLearningContent(target || {}, language)
  const resultTabs = [{ id: 'phrases', label: 'Phrases' }, { id: 'forms', label: 'Forms' }, { id: 'chunks', label: 'Chunks' }]
  const playPronunciation = () => {
    if (!target) return
    setPlaying(true)
    const didSpeak = speak(target.word, language.locale)
    setSpeechStatus(didSpeak ? `Playing ${language.name} pronunciation` : 'Speech is not available in this browser')
    window.setTimeout(() => setPlaying(false), 1200)
  }

  useEffect(() => {
    if (!target || !autoPlayPronunciation || hasAutoPlayed.current) return undefined
    const timer = window.setTimeout(() => {
      if (hasAutoPlayed.current) return
      hasAutoPlayed.current = true
      playPronunciation()
    }, 320)
    return () => window.clearTimeout(timer)
  }, [autoPlayPronunciation, target?.word])

  if (!target) return null

  return (
    <div id="content" className={cn('flex min-h-full flex-col bg-[#fff9ef] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 text-ink', isPhraseMode && 'result-screen-enter')}>
      <header className="grid min-h-11 grid-cols-[44px_1fr_44px] items-center gap-2">
        <button onClick={onRetake} aria-label="Retake photo" className="grid h-11 w-11 place-items-center rounded-full bg-black/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button>
        <span className="justify-self-center whitespace-nowrap rounded-full bg-black/[.04] px-3 py-2 text-xs font-semibold text-stone-600"><ShieldCheck size={14} className="mr-1 inline align-[-2px]" aria-hidden="true" />Only your sticker is saved</span>
        <span aria-hidden="true" />
      </header>

      <section className="grid h-[min(27dvh,220px)] min-h-[160px] place-items-center py-3" aria-label={isPhraseMode ? 'Captured phrase sticker' : 'Captured object sticker'}>
        <div className={cn(isPhraseMode && 'animate-pop')} style={target.stickerAdjustment ? { transform: `scale(${target.stickerAdjustment.scale}) rotate(${target.stickerAdjustment.rotation}deg)` } : undefined}>
          {isPhraseMode ? <div className="sticker-cutout h-28 w-[min(68vw,250px)] rotate-[-2deg] overflow-hidden rounded-[22px] border-[3px] border-white bg-white shadow-[0_0_22px_rgba(188,119,66,.18),0_12px_26px_rgba(38,35,49,.14)]"><img src={item.stickerImage} alt="Captured phrase" className="h-full w-full object-cover" /></div> : <img src={item.stickerImage} alt={`Sticker of ${item.english}`} className={cn('capture-result-sticker h-[min(21dvh,170px)] w-[min(52vw,190px)]', item.cutoutIsTransparent ? 'captured-sticker-cutout capture-result-cutout-glow object-contain' : 'rounded-[22px] border-[3px] border-white object-cover shadow-[0_8px_20px_rgba(38,35,49,.18)]')} />}
        </div>
      </section>

      <div className={cn('flex flex-1 flex-col', captureMode === 'object' && 'capture-result-content-rise')}>
      <section className="text-center" aria-labelledby="capture-result-title">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-cinnamon">{language.name}</p>
        <h1 id="capture-result-title" className={cn('mt-1 break-words font-serif font-bold leading-[1.02] tracking-tight', isPhraseMode ? 'text-[clamp(1.75rem,6vw,2.25rem)]' : 'text-[clamp(2.1rem,8vw,3rem)]')}>{target.word}</h1>
        <div className="mt-2 flex items-center justify-center gap-2 text-stone-600">
          <button onClick={playPronunciation} aria-label={`Play ${language.name} pronunciation`} className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black/[.04] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.96]', playing ? 'text-coral' : 'text-cinnamon')}><Volume2 size={21} aria-hidden="true" /></button>
          <div className={cn('min-w-0', isPhraseMode ? 'max-w-[16rem] text-left text-sm leading-5' : 'flex flex-wrap items-center gap-x-1 text-base')}>
            <Ipa value={target.ipa} className="font-medium" />
            <span className={isPhraseMode ? 'block' : ''}>{!isPhraseMode && showIpa && target.ipa ? '· ' : ''}{target.english}</span>
          </div>
        </div>
        <p aria-live="polite" className="sr-only">{speechStatus}</p>
      </section>

      <section className="mt-5" aria-label={`Learn about ${target.word}`}>
        <div role="tablist" aria-label="Word details" className="grid grid-cols-3 gap-1 rounded-[18px] bg-ink p-1">
          {resultTabs.map((tab) => <button key={tab.id} id={`capture-result-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`capture-result-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={cn('min-h-11 rounded-[14px] px-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', activeTab === tab.id ? 'bg-white text-ink' : 'text-white/80')}>{tab.label}</button>)}
        </div>
        <div id={`capture-result-panel-${activeTab}`} role="tabpanel" aria-labelledby={`capture-result-tab-${activeTab}`} className="min-h-[112px] rounded-b-[22px] border border-t-0 border-black/[.06] bg-white px-4 py-3">
          {activeTab === 'phrases' && (learningContent.phrases.length ? <div className="divide-y divide-black/[.07]">{learningContent.phrases.map((phrase) => <div key={phrase.text} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold leading-6 text-ink"><HighlightedCapturePhrase phrase={phrase} locale={language.locale} /></p>{phrase.meaning && <p className="mt-1 text-sm leading-5 text-stone-600">{phrase.meaning}</p>}{phrase.formNote && <p className="mt-1 text-xs leading-5 text-cinnamon">{phrase.formNote}</p>}</div><button onClick={() => speak(phrase.text, language.locale)} aria-label={`Play ${phrase.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff9ef] text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div> : <p className="py-2 text-sm leading-5 text-stone-600">No example sentence is available for this word yet.</p>)}
          {activeTab === 'forms' && <div className="divide-y divide-black/[.07]">{learningContent.forms.map((form) => <div key={form.form} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{form.form}</p>{form.meaning && <p className="text-sm text-stone-600">{form.meaning}</p>}</div><button onClick={() => speak(form.form, language.locale)} aria-label={`Play ${form.form}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff9ef] text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div>}
          {activeTab === 'chunks' && (learningContent.chunks.length ? <div className="divide-y divide-black/[.07]">{learningContent.chunks.map((chunk) => <div key={chunk.text} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{chunk.text}</p>{chunk.meaning && <p className="text-sm text-stone-600">{chunk.meaning}</p>}</div><button onClick={() => speak(chunk.text, language.locale)} aria-label={`Play ${chunk.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff9ef] text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div> : <p className="py-2 text-sm leading-5 text-stone-600">Useful word combinations will appear here when available.</p>)}
        </div>
      </section>

      <div className="mt-auto pt-5">
        {storageError && <p role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">{storageError}</p>}
        <Button onClick={onSave} className="w-full" size="lg">{isPhraseMode ? 'Add to my phrases' : 'Add to my words'}</Button>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onEdit} className="flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-bold text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:text-ink"><Pencil size={17} aria-hidden="true" />Edit</button>
          <button onClick={onRetake} className="flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-bold text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:text-ink"><RotateCcw size={17} aria-hidden="true" />Retake</button>
        </div>
      </div>
      </div>
    </div>
  )
}

function getFinnishLearningMeta(item) {
  const word = item.word?.toLowerCase()
  const exact = {
    kahvi: { themes: ['Shops & services', 'Everyday life'], level: 'A1', familyForms: [{ form: 'kahvi', meaning: 'coffee' }, { form: 'kahvia', meaning: 'some coffee' }], verb: 'juoda', verbMeaning: 'to drink' },
    juoda: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'juoda', meaning: 'to drink' }, { form: 'juon', meaning: 'I drink' }], verb: 'juoda', verbMeaning: 'to drink' },
    mennä: { themes: ['Everyday life', 'Getting around'], level: 'A1', familyForms: [{ form: 'mennä', meaning: 'to go' }, { form: 'menen', meaning: 'I go' }], verb: 'mennä', verbMeaning: 'to go' },
    ottaa: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'ottaa', meaning: 'to take' }, { form: 'otan', meaning: 'I take' }], verb: 'ottaa', verbMeaning: 'to take' },
    ovi: { themes: ['Home & housing'], level: 'A1', familyForms: [{ form: 'ovi', meaning: 'door' }, { form: 'oven', meaning: 'of the door' }, { form: 'ovea', meaning: 'some door' }], verb: 'avata', verbMeaning: 'to open' },
    avain: { themes: ['Home & housing', 'Everyday life'], level: 'A1', familyForms: [{ form: 'avain', meaning: 'key' }, { form: 'avaimen', meaning: 'of the key' }, { form: 'avainta', meaning: 'some key' }], verb: 'avata', verbMeaning: 'to open' },
    kirja: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'kirja', meaning: 'book' }, { form: 'kirjan', meaning: 'of the book' }, { form: 'kirjaa', meaning: 'some book' }], verb: 'lukea', verbMeaning: 'to read' },
    kenkä: { themes: ['Clothes', 'Everyday life'], level: 'A1', familyForms: [{ form: 'kenkä', meaning: 'shoe' }, { form: 'kengän', meaning: 'of the shoe' }, { form: 'kenkää', meaning: 'some shoe' }], verb: 'pukea', verbMeaning: 'to put on' },
    vesipullo: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'vesipullo', meaning: 'water bottle' }, { form: 'vesipullon', meaning: 'of the bottle' }, { form: 'vesipulloa', meaning: 'some bottle' }], verb: 'täyttää', verbMeaning: 'to fill' },
    vesi: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'vesi', meaning: 'water' }, { form: 'veden', meaning: 'of the water' }, { form: 'vettä', meaning: 'some water' }], verb: 'juoda', verbMeaning: 'to drink' },
    reppu: { themes: ['Everyday life'], level: 'A1', familyForms: [{ form: 'reppu', meaning: 'backpack' }, { form: 'repun', meaning: 'of the backpack' }, { form: 'reppua', meaning: 'some backpack' }], verb: 'kantaa', verbMeaning: 'to carry' },
  }
  if (exact[word]) return exact[word]

  const collection = item.collection?.toLowerCase() || ''
  const theme = collection.includes('home') ? 'Home & housing' : collection.includes('café') || collection.includes('kitchen') ? 'Shops & services' : 'Everyday life'
  const familyForms = [{ form: item.word, meaning: item.english }, ...(item.form ? [{ form: item.form, meaning: item.formMeaning || 'related form' }] : [])]
  const contextualRule = contextualVerbRules.fi.find((rule) => rule.objects[word])
  const usefulVerb = contextualRule ? { verb: contextualRule.verb.word, verbMeaning: contextualRule.verb.english } : {}

  return { themes: [theme], level: null, familyForms, ...usefulVerb }
}

const reviewFormHints = {
  fi: {
    pulla: { form: 'pullaa', meaning: 'a cinnamon bun as the object of eating' },
    ämpäri: { form: 'ämpärissä', meaning: 'in the bucket' },
    polttopuu: { form: 'polttopuuta', meaning: 'firewood as the object of adding' },
    kenkä: { form: 'kengät', meaning: 'the shoes' },
    reppu: { form: 'repussa', meaning: 'in the backpack' },
  },
  sv: {
    dörr: { form: 'dörren', meaning: 'the door' },
    nyckel: { form: 'nycklar', meaning: 'keys' },
    sko: { form: 'skorna', meaning: 'the shoes' },
    hink: { form: 'hinken', meaning: 'the bucket' },
    vattenflaska: { form: 'vattenflaskan', meaning: 'the water bottle' },
  },
}

function DailyVerbView({ item, language, reviewItems, detailSequence, learnedDailyWords, onPrevious, onNext, onBack, onLearnDailyWord }) {
  const [activeTab, setActiveTab] = useState('phrases')
  const swipeStart = useRef(null)
  const tabRefs = useRef([])
  const sequenceIndex = detailSequence.findIndex((word) => word.word === item.word)
  const learnedCount = detailSequence.filter((word) => learnedDailyWords.includes(word.word)).length
  const isLearned = learnedDailyWords.includes(item.word)
  const note = dailyVerbNotes[language.locale.slice(0, 2)]?.[item.word] || {}
  const variants = (note.variants || (item.form ? [{ form: item.form, meaning: item.formMeaning }] : [])).slice(0, 1)
  const sourceEvidence = useFinnishEvidence(item, language, variants[0]?.form)
  const linkedEnglish = item.linkedEnglish || reviewItems.find((word) => word.word === item.linkedWord)?.english
  const phrases = resolveDailyVerbPhrases({ ...item, linkedEnglish }, note, contextualVerbRules[language.locale.slice(0, 2)] || [])
  const hasStickerPhrase = phrases.some((phrase) => phrase.linkedWord === item.linkedWord)
  const frame = getPhraseFrame(phrases)
  const tabs = [{ id: 'phrases', label: 'Phrases' }, { id: 'forms', label: 'Forms' }, { id: 'chunks', label: 'Chunks' }]

  const startSwipe = (event) => {
    if (event.target.closest('button, a, summary') || event.pointerType === 'mouse' && event.button !== 0) return
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const finishSwipe = (event) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start || start.id !== event.pointerId) return
    const distanceX = event.clientX - start.x
    const distanceY = event.clientY - start.y
    if (Math.abs(distanceX) < 48 || Math.abs(distanceX) < Math.abs(distanceY) * 1.2) return
    if (distanceX > 0) onNext()
    else onPrevious()
  }
  const handleTabKeyDown = (event, index) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (nextIndex === null) return
    event.preventDefault()
    setActiveTab(tabs[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div id="content" className="min-h-full touch-pan-y bg-cream px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5" onPointerDown={startSwipe} onPointerUp={finishSwipe} onPointerCancel={() => { swipeStart.current = null }} onDragStart={(event) => event.preventDefault()}>
      <header className="grid min-h-11 grid-cols-[44px_1fr_44px] items-center">
        <button onClick={onBack} aria-label="Go back home" className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button>
        <p className="text-center text-sm font-bold text-moss">Today’s verbs</p>
        <span className="text-right text-sm font-bold tabular-nums text-ink">{sequenceIndex + 1}/{detailSequence.length}</span>
      </header>
      <section aria-labelledby="daily-verb-title" className="relative mt-4 rounded-[30px] border border-black/[.07] bg-white p-3 shadow-[0_2px_4px_rgba(38,35,49,.04),0_18px_42px_rgba(38,35,49,.08)]">
        <div className={cn('relative grid h-44 place-items-center overflow-hidden rounded-[23px]', item.tone)}>
          <Sticker item={item} hero />
        </div>
        <div className="px-3 pb-3 pt-4">
          <h1 id="daily-verb-title" className="font-serif text-[2.65rem] font-bold leading-none tracking-tight text-ink">{item.word}</h1>
          <div className="mt-1 flex items-center gap-2"><Ipa value={item.ipa} className="text-sm font-medium text-stone-600" /><button onClick={() => speak(item.word, language.locale)} aria-label={`Play ${item.word}`} className="grid h-11 w-11 place-items-center rounded-full text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={20} /></button></div>
          <p className="text-base font-semibold text-ink">{item.english}</p>
          {hasStickerPhrase && <p className="mt-1 text-xs text-stone-600">Useful with your sticker “{item.linkedWord}”</p>}
        </div>
      </section>

      <FinnishSourceNote evidence={sourceEvidence} form={variants[0]?.form} />

      <section className="mt-5" aria-label={`Learn about ${item.word}`}>
        <div role="tablist" aria-label="Verb details" className="grid grid-cols-3 gap-1 rounded-[18px] bg-ink p-1">
          {tabs.map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element }} id={`daily-verb-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`daily-verb-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={cn('min-h-11 whitespace-nowrap rounded-[14px] px-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', activeTab === tab.id ? 'bg-white text-ink' : 'text-white/80')}>{tab.label}</button>)}
        </div>
        <div id={`daily-verb-panel-${activeTab}`} role="tabpanel" aria-labelledby={`daily-verb-tab-${activeTab}`} tabIndex={0} className="min-h-[190px] rounded-b-[24px] border border-t-0 border-black/[.06] bg-white p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">
          {activeTab === 'phrases' && <div>
            <div className="divide-y divide-black/[.07]">{phrases.map((phrase, phraseIndex) => {
              const words = phrase.text.toLocaleLowerCase(language.locale).match(/\p{L}+/gu) || []
              const formHint = note.formHints?.find((hint) => words.includes(hint.form))
              return <div key={phrase.text} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  {phrase.linkedWord && <p className="mb-2 text-xs font-bold text-cinnamon">With your sticker “{phrase.linkedWord}”</p>}
                  <p className="font-serif text-lg font-semibold leading-6 text-ink">{formHint ? phrase.text.split(/(\p{L}+)/u).map((part, index) => part.toLocaleLowerCase(language.locale) === formHint.form ? <span key={index} className="text-cinnamon">{part}</span> : part) : phrase.text}</p>
                  {phrase.meaning && <p className="mt-1 text-sm leading-5 text-stone-600">{phrase.meaning}</p>}
                  {formHint && phraseIndex === 0 && <p className="mt-1 text-xs font-semibold leading-5 text-cinnamon">{formHint.explanation}</p>}
                </div>
                <button onClick={() => speak(phrase.text, language.locale)} aria-label={`Play ${phrase.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={20} /></button>
              </div>
            })}</div>
          </div>}
          {activeTab === 'forms' && <div><p className="text-xs font-bold uppercase tracking-[.14em] text-cinnamon">Verb forms</p><p className="mt-3 text-sm text-stone-600">Base form <span className="font-semibold text-ink">{item.word}</span></p><div className="mt-4 grid gap-2">{variants.map((variant) => <div key={variant.form} className="flex items-baseline justify-between gap-3 border-t border-black/[.07] pt-2"><span className="font-serif text-xl font-bold text-ink">{variant.form}</span><span className="text-right text-sm text-stone-600">{variant.meaning}</span></div>)}</div>{variants.length ? <p className="mt-4 text-xs leading-5 text-stone-600">{note.formIntro || 'The verb changes form to show who acts or when it happens.'}</p> : <p className="mt-4 text-sm text-stone-600">No extra forms are available for this verb yet.</p>}</div>}
          {activeTab === 'chunks' && (frame ? <div><p className="text-sm leading-5 text-stone-600">Keep the beginning. Change the last piece.</p><p className="mt-3 font-serif text-xl font-bold text-ink">{frame.fixed} <span className="text-cinnamon">…</span></p><div className="mt-4 divide-y divide-black/[.07]">{frame.choices.map((choice) => <div key={choice.text} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{choice.variable}</p><p className="text-sm text-stone-600">{choice.meaning}</p></div><button onClick={() => speak(choice.text, language.locale)} aria-label={`Play ${choice.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div></div> : <div><p className="text-sm leading-5 text-stone-600">Useful expressions to say aloud.</p><div className="mt-3 divide-y divide-black/[.07]">{phrases.map((phrase) => <div key={phrase.text} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{phrase.text}</p><p className="mt-1 text-sm text-stone-600">{phrase.meaning}</p></div><button onClick={() => speak(phrase.text, language.locale)} aria-label={`Play ${phrase.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div></div>)}
        </div>
      </section>

      <div className="mt-6 flex items-center justify-center gap-2" role="img" aria-label={`Verb ${sequenceIndex + 1} of ${detailSequence.length}; ${learnedCount} learned`}>
        {detailSequence.map((word, index) => {
          const isCurrent = index === sequenceIndex
          const isLearnedWord = learnedDailyWords.includes(word.word)
          return <span key={word.word} aria-hidden="true" className={cn('h-2 rounded-full transition-[width,background-color] duration-150', isCurrent ? 'w-6 bg-ink' : isLearnedWord ? 'w-2 bg-cinnamon' : 'w-2 bg-stone-300')} />
        })}
      </div>
      <Button onClick={() => { if (isLearned) onNext(); else { onLearnDailyWord(item); onNext() } }} className="mt-5 w-full" size="lg">{isLearned ? 'Next verb' : 'Mark learned'}</Button>
    </div>
  )
}

function PhraseTranslation({ phrase, language, onResolved }) {
  const [request, setRequest] = useState({ status: 'idle', attempt: 0 })

  useEffect(() => {
    if (phrase.translation) return undefined
    const controller = new AbortController()
    setRequest((current) => ({ ...current, status: 'loading' }))
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: phrase.text, targetLanguage: language.name }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.translation) throw new Error(payload.error || 'Translation unavailable.')
        return payload.translation
      })
      .then((translation) => onResolved(phrase.text, translation))
      .catch((error) => { if (error.name !== 'AbortError') setRequest((current) => ({ ...current, status: 'error' })) })
    return () => controller.abort()
  }, [phrase.text, phrase.translation, language.name, request.attempt])

  if (phrase.translation) return <p className="mt-1 text-sm leading-5 text-stone-600">{phrase.translation}</p>
  if (request.status === 'error') return <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm leading-5 text-stone-600"><span>English translation unavailable.</span><button type="button" onClick={() => setRequest((current) => ({ status: 'idle', attempt: current.attempt + 1 }))} className="min-h-11 font-semibold text-cinnamon underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">Try again</button></div>
  return <p className="mt-1 text-sm leading-5 text-stone-600" role="status">Translating to English…</p>
}

function HighlightedPhrase({ text, form, locale }) {
  if (!form || !text.toLocaleLowerCase(locale).includes(form.toLocaleLowerCase(locale))) return text
  return text.split(/(\p{L}+)/u).map((part, index) => part.toLocaleLowerCase(locale) === form.toLocaleLowerCase(locale) ? <span key={index} className="text-cinnamon">{part}</span> : part)
}

function WordDetailView({ item, language, reviewItems, onBack, onAddRelatedWord, onDelete, onPhraseTranslation }) {
  const [activeTab, setActiveTab] = useState('phrases')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const tabRefs = useRef([])
  const languageKey = language.locale.slice(0, 2)
  const verbNote = item && dailyVerbNotes[languageKey]?.[item.word]
  const linkedEnglish = item?.linkedEnglish || reviewItems.find((word) => word.word === item?.linkedWord)?.english
  const recommendedPhrases = item && (verbNote || item.lessonPhrases) ? resolveDailyVerbPhrases({ ...item, linkedEnglish }, verbNote, contextualVerbRules[languageKey] || []) : []
  const learningMeta = item && language.locale?.startsWith('fi') ? getFinnishLearningMeta(item) : null
  const formHint = item && reviewFormHints[languageKey]?.[item.word?.toLocaleLowerCase(language.locale)]
  const familyForms = [formHint, ...(verbNote?.variants || []), ...(learningMeta?.familyForms || [])].filter(Boolean)
  const content = item ? buildReviewCardContent(item, familyForms, recommendedPhrases) : null
  const sourceEvidence = useFinnishEvidence(item, language, content?.variant?.form)
  if (!item) return null
  const isSaved = reviewItems.some((savedItem) => savedItem.word === item.word)
  const showUsefulVerb = learningMeta?.verb && learningMeta.verb.toLowerCase() !== item.word?.toLowerCase()
  const hasRelated = Boolean(showUsefulVerb || item.relatedWords?.length)
  const tabs = [
    { id: 'phrases', label: 'Phrases' },
    { id: 'forms', label: 'Forms' },
    { id: 'chunks', label: 'Chunks' },
  ]
  const handleTabKeyDown = (event, index) => {
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (nextIndex === null) return
    event.preventDefault()
    setActiveTab(tabs[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <div id="content" className="min-h-full bg-cream px-5 pb-6 pt-5">
      <header className="grid min-h-11 grid-cols-[44px_1fr_44px] items-center">
        <button onClick={onBack} aria-label="Back to collection" className="grid h-11 w-11 place-items-center rounded-full bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button>
        <p className="text-center text-sm font-bold text-moss">Word card</p>
        {isSaved && <button onClick={() => setDeleteOpen(true)} aria-label={`Delete ${item.word}`} className="grid h-11 w-11 place-items-center rounded-full bg-white text-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-95"><Trash2 size={19} /></button>}
      </header>

      <section aria-labelledby="word-detail-title" className="relative mt-4 rounded-[30px] border border-black/[.07] bg-white p-3 shadow-[0_2px_4px_rgba(38,35,49,.04),0_18px_42px_rgba(38,35,49,.08)]">
        <div className={cn('relative grid h-44 place-items-center overflow-hidden rounded-[23px]', item.tone || 'bg-[#f2f1f0]')}><Sticker item={item} hero /></div>
        <div className="px-3 pb-3 pt-4">
          <h1 id="word-detail-title" className="break-words font-serif text-[2.65rem] font-bold leading-none tracking-tight text-ink">{item.word}</h1>
          <div className="mt-1 flex items-center gap-2"><Ipa value={item.ipa} className="text-sm font-medium text-stone-600" /><button onClick={() => speak(item.word, language.locale)} aria-label={`Play ${item.word}`} className="grid h-11 w-11 place-items-center rounded-full text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={20} /></button></div>
          <p className="text-base font-semibold text-ink">{item.english}</p>
        </div>
      </section>

      <FinnishSourceNote evidence={sourceEvidence} form={content.variant?.form} />

      <section className="mt-5" aria-label={`Learn about ${item.word}`}>
        <div role="tablist" aria-label="Word details" className="grid grid-cols-3 gap-1 rounded-[18px] bg-ink p-1">
          {tabs.map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element }} id={`word-detail-tab-${tab.id}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`word-detail-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={cn('min-h-11 whitespace-nowrap rounded-[14px] px-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white', activeTab === tab.id ? 'bg-white text-ink' : 'text-white/80')}>{tab.label}</button>)}
        </div>
        <div id={`word-detail-panel-${activeTab}`} role="tabpanel" aria-labelledby={`word-detail-tab-${activeTab}`} tabIndex={0} className="min-h-[190px] rounded-b-[24px] border border-t-0 border-black/[.06] bg-white p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">
          {activeTab === 'phrases' && (content.phrases.length ? <div className="divide-y divide-black/[.07]">{content.phrases.map((phrase) => <div key={phrase.text} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold leading-6 text-ink"><HighlightedPhrase text={phrase.text} form={content.variant?.form} locale={language.locale} /></p><PhraseTranslation phrase={phrase} language={language} onResolved={(text, translation) => onPhraseTranslation(item, text, translation)} />{phrase.text === item.sentence && content.variant && <p className="mt-1 text-xs font-semibold leading-5 text-cinnamon">{item.word} → {content.variant.form}{content.variant.meaning ? `: “${content.variant.meaning}”` : ''}</p>}</div><button onClick={() => speak(phrase.text, language.locale)} aria-label={`Play ${phrase.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={20} /></button></div>)}</div> : <p className="text-sm leading-5 text-stone-600">No example has been saved with this sticker yet. Hear the word above, then try it in your own sentence.</p>)}
          {activeTab === 'forms' && (item.kind === 'phrase' ? <p className="text-sm leading-5 text-stone-600">This is a complete phrase. Open Chunks to hear its parts.</p> : <div><p className="text-xs font-bold uppercase tracking-[.14em] text-cinnamon">Word forms</p><p className="mt-4 text-sm text-stone-600">Base form <span className="font-semibold text-ink">{content.forms[0].form}</span></p>{content.variant ? <div className="mt-4 border-t border-black/[.07] pt-4"><div className="flex items-baseline justify-between gap-3"><span className="font-serif text-xl font-bold text-ink">{content.variant.form}</span><span className="text-right text-sm text-stone-600">{content.variant.meaning}</span></div>{(item.formChange || item.formReason) && item.form === content.variant.form && <details className="mt-4 text-xs leading-5 text-stone-600"><summary className="min-h-11 cursor-pointer font-semibold text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">Why this form?</summary><p>{item.formChange}{item.formChange && item.formReason ? ' ' : ''}{item.formReason}</p></details>}</div> : <p className="mt-4 border-t border-black/[.07] pt-4 text-sm leading-5 text-stone-600">No other form is verified in this example.</p>}</div>)}
          {activeTab === 'chunks' && (content.frame ? <div><p className="text-sm leading-5 text-stone-600">Keep the beginning. Change the last piece.</p><p className="mt-3 font-serif text-xl font-bold text-ink">{content.frame.fixed} <span className="text-cinnamon">…</span></p><div className="mt-4 divide-y divide-black/[.07]">{content.frame.choices.map((choice) => <div key={choice.text} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{choice.variable}</p><PhraseTranslation phrase={choice} language={language} onResolved={(text, translation) => onPhraseTranslation(item, text, translation)} /></div><button onClick={() => speak(choice.text, language.locale)} aria-label={`Play ${choice.text}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div></div> : <div><p className="text-sm leading-5 text-stone-600">{content.chunks.length > 1 ? 'Hear the example in pieces.' : 'Hear this word on its own.'}</p><div className="mt-3 divide-y divide-black/[.07]">{content.chunks.map((part, index) => <div key={`${part.word}-${index}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-serif text-lg font-semibold text-ink">{part.word}</p>{part.meaning && <p className="mt-1 text-sm text-stone-600">{part.meaning}</p>}</div><button onClick={() => speak(part.word, language.locale)} aria-label={`Play ${part.word}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><Volume2 size={19} /></button></div>)}</div></div>)}
        </div>
      </section>

      {hasRelated && <section className="mt-5 rounded-[24px] border border-black/[.06] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.14em] text-cinnamon">Keep exploring</p>{showUsefulVerb && <p className="mt-3 text-sm text-stone-600">Useful verb: <span className="font-serif text-lg font-bold text-ink">{learningMeta.verb}</span> · {learningMeta.verbMeaning}</p>}{item.relatedWords?.map((word) => { const wordSaved = reviewItems.some((savedItem) => savedItem.word === word.word); return <div key={word.word} className="mt-3 flex items-center justify-between gap-3"><div><p className="font-serif text-lg font-bold text-ink">{word.word}</p><p className="text-sm text-stone-600">{word.english}</p></div><button onClick={() => onAddRelatedWord(word)} disabled={wordSaved} className="min-h-11 min-w-11 rounded-full bg-cream px-3 text-xs font-bold text-cinnamon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss disabled:text-stone-500">{wordSaved ? 'Saved' : 'Add'}</button></div> })}</section>}

      {!isSaved && <Button onClick={() => onAddRelatedWord(item)} className="mt-5 w-full" size="lg"><Sparkles size={19} />Add to my collection</Button>}
      {deleteOpen && <DeleteStickerDialog item={item} onDelete={onDelete} onClose={() => setDeleteOpen(false)} />}
    </div>
  )
}

function DeleteStickerDialog({ item, onDelete, onClose }) {
  const dialogRef = useDialogFocus(onClose)
  return (
    <div className="absolute inset-0 z-50 grid place-items-end bg-ink/30 p-4 backdrop-blur-[2px]">
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="delete-sticker-title" className="w-full rounded-[28px] bg-white p-5 shadow-[0_18px_50px_rgba(38,35,49,.22)]">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-600"><Trash2 size={20} /></span>
        <h2 id="delete-sticker-title" className="mt-4 font-serif text-2xl font-bold text-ink">Delete “{item.word}”?</h2>
        <p className="mt-2 text-sm leading-5 text-stone-600">This removes the sticker from your collection and future reviews.</p>
        <div className="mt-5 grid gap-2">
          <button onClick={() => onDelete(item)} className="min-h-12 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:scale-[.98]">Delete sticker</button>
          <button onClick={onClose} className="min-h-12 rounded-full px-5 text-sm font-bold text-ink transition-[transform,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.98]">Keep sticker</button>
        </div>
      </section>
    </div>
  )
}

function QuizView({ onAnswer, language, question, finished, logsEarned, woodFull, sessionCount, completedCount, onBack, onNext, onMistake, onCorrect }) {
  const [selectedWord, setSelectedWord] = useState(null)
  const [showWrittenWord, setShowWrittenWord] = useState(false)
  const isListeningRound = completedCount % 2 === 1 && 'speechSynthesis' in window

  useEffect(() => {
    setSelectedWord(null)
    setShowWrittenWord(false)
  }, [question])
  useEffect(() => {
    if (!question?.answer?.word || isListeningRound) return
    let timer
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => speak(question.answer.word, language.locale), 520)
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [isListeningRound, language.locale, question?.answer?.word])

  if (!question && finished) {
    const copy = logsEarned === 2 ? 'Fewer than 3 misses—an extra log for the fire!' : logsEarned === 1 ? 'You finished the round. The fire is one log warmer.' : woodFull ? 'The sauna has all three logs. Your review still counts.' : 'Today’s review logs are already in the pile.'
    return <RewardCelebration eyebrow="Quiz complete" title={`${completedCount} ${completedCount === 1 ? 'word' : 'words'} reviewed!`} rewardText={logsEarned ? `+${logsEarned} sauna ${logsEarned === 1 ? 'log' : 'logs'}` : 'Already earned'} copy={copy} buttonLabel="Back to review" onClose={onBack} />
  }

  if (!question) return null

  const selectedItem = question.choices.find((item) => item.word === selectedWord)
  const isCorrect = selectedWord === question.answer.word
  const showWord = !isListeningRound || showWrittenWord || isCorrect
  const chooseSticker = (item) => {
    if (isCorrect) return
    onAnswer(item.word === question.answer.word)
    setSelectedWord(item.word)
    if (item.word !== question.answer.word) {
      onMistake(question.answer)
      window.setTimeout(() => setSelectedWord((current) => current === item.word ? null : current), 260)
    } else {
      onCorrect(question.answer)
    }
  }
  const advanceQuestion = () => {
    setSelectedWord(null)
    onNext()
  }

  return (
    <div id="content" className="px-5 pt-5">
      <header className="flex items-center justify-between"><button onClick={onBack} aria-label="Leave sticker quiz" className="grid h-11 w-11 place-items-center rounded-full border border-black/[.07] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button><p className="text-sm font-bold text-moss">Sticker quiz</p><span className="w-11 text-right text-sm font-bold tabular-nums text-stone-500">{Math.min(completedCount + 1, sessionCount)}/{sessionCount}</span></header>
      <section className="mt-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">{isListeningRound ? 'Listen and choose the sticker' : 'Choose the matching sticker'}</p>
        {showWord ? <>
          <div className="mt-3 flex items-center justify-center gap-3"><h1 className="font-serif text-4xl font-bold tracking-tight">{question.answer.word}</h1><AudioButton onClick={() => speak(question.answer.word, language.locale)} label={`Play ${question.answer.word}`}><Volume2 size={26} /></AudioButton></div>
          <Ipa value={question.answer.ipa} className="mt-1 block text-sm font-semibold text-moss" />
        </> : <>
          <h1 className="sr-only">Listen to the word</h1>
          <button type="button" onClick={() => speak(question.answer.word, language.locale)} aria-label="Play word" className="mx-auto mt-4 grid h-16 w-16 place-items-center text-ink transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.94]"><Volume2 size={34} aria-hidden="true" /></button>
          <button type="button" onClick={() => setShowWrittenWord(true)} aria-label="Reveal written word" className="mt-2 min-h-11 px-3 text-sm font-semibold text-moss underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">Reveal</button>
        </>}
      </section>
      <div className="mt-7 grid grid-cols-2 gap-3">
        {question.choices.map((item) => {
          const selectedWrong = selectedWord === item.word && item.word !== question.answer.word
          const selectedCorrect = selectedWord === item.word && item.word === question.answer.word
          return <button key={item.word} onClick={() => chooseSticker(item)} disabled={isCorrect} className={cn('grid min-h-[154px] place-items-center rounded-[28px] border-2 p-4 transition-[transform,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.98] disabled:cursor-default disabled:active:scale-100', selectedCorrect ? 'quiz-correct-pop border-[#4f8a5b] bg-[#edf8ee]' : selectedWrong ? 'quiz-wrong-shake border-coral bg-[#fff0ea]' : 'border-black/[.07] bg-white')} aria-label={`Choose ${item.english}`}><Sticker item={item} /></button>
        })}
      </div>
      <p className="sr-only" aria-live="polite">{selectedItem && !isCorrect ? 'Not that one. Try again.' : ''}</p>
      <div className="mt-3 flex min-h-9 items-center justify-center" aria-live="polite">
        {selectedItem && isCorrect && <p className="flex items-center gap-2 text-sm font-bold text-[#3f744b]"><span className="grid h-6 w-6 place-items-center rounded-full bg-[#4f8a5b] text-white"><Check size={14} /></span>{question.answer.english}</p>}
      </div>
      {isCorrect && <Button onClick={advanceQuestion} className="mt-1 w-full" size="lg">{completedCount + 1 >= sessionCount ? 'See result' : 'Next word'}</Button>}
    </div>
  )
}

function createMatchingRound(items, excludedWords = []) {
  const excluded = new Set(excludedWords)
  const pool = shuffle(items.filter((item) => item.kind !== 'phrase'))
    .filter((item, index, allItems) => allItems.findIndex((candidate) => candidate.word === item.word) === index)
    .filter((item) => !excluded.has(item.word))
    .slice(0, 5)

  return { left: shuffle(pool), right: shuffle(pool) }
}

function MatchingView({ onAnswer, items, language, rewardAvailable, onBack, onMistake, onCorrect, onComplete }) {
  const duration = 30
  const scoreRef = useRef(0)
  const finishedRef = useRef(false)
  const [round, setRound] = useState(() => createMatchingRound(items))
  const [completedWords, setCompletedWords] = useState([])
  const [selectedLeft, setSelectedLeft] = useState(null)
  const [selectedRight, setSelectedRight] = useState(null)
  const [matched, setMatched] = useState([])
  const [correctPair, setCorrectPair] = useState(null)
  const [wrongPair, setWrongPair] = useState(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [gameOver, setGameOver] = useState(false)
  const resultCopy = score === 0
    ? 'Find 5 pairs next time to earn a log.'
    : 'Find 5 pairs to earn a log.'

  const resetSelections = () => {
    setSelectedLeft(null)
    setSelectedRight(null)
    setCorrectPair(null)
    setWrongPair(null)
  }

  const finishGame = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    onComplete(scoreRef.current)
    setGameOver(true)
  }

  const evaluatePair = (leftWord, rightWord) => {
    if (!leftWord || !rightWord || wrongPair || correctPair || gameOver) return
    onAnswer(leftWord === rightWord)
    if (leftWord === rightWord) {
      onCorrect(items.find((item) => item.word === leftWord))
      setCorrectPair(leftWord)
      setScore((current) => {
        const next = current + 1
        scoreRef.current = next
        return next
      })
      window.setTimeout(() => {
        setMatched((current) => [...current, leftWord])
        setCorrectPair(null)
        setSelectedLeft(null)
        setSelectedRight(null)
      }, 280)
      return
    }

    onMistake(items.find((item) => item.word === leftWord))
    onMistake(items.find((item) => item.word === rightWord))
    setWrongPair({ left: leftWord, right: rightWord })
    window.setTimeout(resetSelections, 380)
  }

  const chooseLeft = (item) => {
    if (wrongPair || correctPair || gameOver) return
    speak(item.word, language.locale)
    setSelectedLeft(item.word)
    if (selectedRight) evaluatePair(item.word, selectedRight)
  }

  const chooseRight = (item) => {
    if (wrongPair || correctPair || gameOver) return
    speak(item.english, 'en-US')
    setSelectedRight(item.word)
    if (selectedLeft) evaluatePair(selectedLeft, item.word)
  }

  useEffect(() => {
    if (gameOver) return undefined
    const interval = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          finishGame()
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [gameOver])

  useEffect(() => {
    if (!round.left.length || matched.length !== round.left.length || gameOver) return undefined
    const timer = window.setTimeout(() => {
      const nextCompletedWords = [...new Set([...completedWords, ...round.left.map((item) => item.word)])]
      const nextRound = createMatchingRound(items, nextCompletedWords)
      setCompletedWords(nextCompletedWords)
      setMatched([])
      resetSelections()
      if (!nextRound.left.length) {
        setTimeLeft(0)
        finishGame()
        return
      }
      setRound(nextRound)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [completedWords, gameOver, items, matched.length, round.left])

  if (!round.left.length) {
    return (
      <div id="content" className="px-5 pt-5">
        <button onClick={onBack} aria-label="Leave matching game" className="grid h-11 w-11 place-items-center rounded-full bg-[#F6F6F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button>
        <section className="mt-16 text-center"><h1 className="text-balance text-[28px] font-semibold leading-tight tracking-[-.04em]">Capture a word first</h1><p className="mt-3 text-sm text-stone-500">Matching needs at least one saved word.</p><Button onClick={onBack} className="mt-5">Back home</Button></section>
      </div>
    )
  }

  return (
    <div id="content" className="min-h-full px-5 pb-6 pt-5">
      <header className="grid min-h-11 grid-cols-[44px_1fr_64px] items-center">
        <button onClick={onBack} aria-label="Leave matching game" className="grid h-11 w-11 place-items-center rounded-full bg-[#F6F6F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss"><ChevronLeft /></button>
        <h1 className="text-center text-xl font-semibold tracking-[-.025em] text-ink">Match words</h1>
        <span className={cn('justify-self-end rounded-full px-3 py-2 text-sm font-black tabular-nums', timeLeft <= 8 ? 'bg-[#fff0ea] text-coral' : 'bg-[#F6F6F6] text-ink')}>{timeLeft}s</span>
      </header>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-brand-soft" aria-hidden="true"><span className="block h-full origin-left rounded-full bg-moss transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${timeLeft / duration})` }} /></div>

      {!gameOver ? (
        <>
          <section className="mt-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">Score <span className="tabular-nums">{score}</span></p>
            <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-.04em] text-ink">Find every pair</h2>
            <p className="mt-2 text-sm text-stone-500">Tap one word from each side.</p>
          </section>

          <div className="mt-6 grid grid-cols-2 gap-3" aria-label="Word matching board">
            <div className="grid content-start gap-3">
              <p className="text-center text-[11px] font-bold uppercase tracking-[.12em] text-stone-400">Your words</p>
              {round.left.map((item) => {
                const isMatched = matched.includes(item.word)
                const isSelected = selectedLeft === item.word
                const isCorrect = correctPair === item.word
                const isWrong = wrongPair?.left === item.word
                return <button key={item.word} onClick={() => chooseLeft(item)} disabled={isMatched || isCorrect} aria-label={`${item.word}. Select and play pronunciation.`} className={cn('min-h-[64px] rounded-[20px] border-2 px-3 text-center font-bold transition-[transform,opacity,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]', isMatched ? 'pointer-events-none opacity-0' : isCorrect ? 'quiz-correct-pop border-[#4f8a5b] bg-[#edf8ee] text-[#315d39]' : isWrong ? 'quiz-wrong-shake border-coral bg-[#fff0ea] text-ink' : isSelected ? 'border-moss bg-brand-soft text-ink' : 'border-black/[.07] bg-white text-ink')}>{item.word}</button>
              })}
            </div>
            <div className="grid content-start gap-3">
              <p className="text-center text-[11px] font-bold uppercase tracking-[.12em] text-stone-400">English</p>
              {round.right.map((item) => {
                const isMatched = matched.includes(item.word)
                const isSelected = selectedRight === item.word
                const isCorrect = correctPair === item.word
                const isWrong = wrongPair?.right === item.word
                return <button key={item.word} onClick={() => chooseRight(item)} disabled={isMatched || isCorrect} aria-label={`${item.english}. Select and play pronunciation.`} className={cn('min-h-[64px] rounded-[20px] border-2 px-3 text-center font-bold transition-[transform,opacity,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]', isMatched ? 'pointer-events-none opacity-0' : isCorrect ? 'quiz-correct-pop border-[#4f8a5b] bg-[#edf8ee] text-[#315d39]' : isWrong ? 'quiz-wrong-shake border-coral bg-[#fff0ea] text-ink' : isSelected ? 'border-moss bg-brand-soft text-ink' : 'border-black/[.07] bg-white text-ink')}>{item.english}</button>
              })}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">{wrongPair ? 'Not a match. Try again.' : correctPair ? 'Correct match.' : `${score} matches`}</p>
        </>
      ) : (
        <RewardCelebration
          eyebrow="Round complete"
          title={`${score} ${score === 1 ? 'match' : 'matches'}!`}
          rewardText={!rewardAvailable && score > 0 ? 'Already earned' : score >= 15 ? '+3 sauna logs' : score >= 10 ? '+2 sauna logs' : score >= 5 ? '+1 sauna log' : 'No logs yet'}
          copy={!rewardAvailable && score > 0 ? 'Your match logs are already in the pile. Nice work on those pairs!' : score < 5 ? resultCopy : null}
          buttonLabel="Back to review"
          onClose={onBack}
        />
      )}
    </div>
  )
}

function CollectionFolder({ collection, onSelect, gravity, bindGravity }) {
  const countText = `${collection.items.length} ${collection.items.length === 1 ? 'word' : 'words'}`
  const previewItems = collection.items.slice(0, 6)
  const isSmallCollection = previewItems.length <= 2
  const offsetProfiles = [
    { x: -128, y: 28, rotate: -16, weight: 22 },
    { x: -78, y: 10, rotate: -7, weight: 14 },
    { x: -24, y: 28, rotate: 4, weight: 18 },
    { x: 34, y: 14, rotate: -3, weight: 13 },
    { x: 90, y: 26, rotate: 12, weight: 20 },
    { x: 134, y: 40, rotate: 18, weight: 24 },
  ]

  return (
    <button {...bindGravity} onClick={onSelect} className={cn('group relative block w-full overflow-hidden rounded-[28px] bg-[#F6F6F6] px-5 pb-0 pt-4 text-left shadow-[0_0_0_1px_rgba(38,35,49,.045)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.98]', isSmallCollection ? 'min-h-[156px]' : 'min-h-[214px]')}>
      <span className="pointer-events-none absolute inset-x-0 top-0 z-20 h-20 bg-gradient-to-b from-[#F6F6F6] via-[#F6F6F6]/94 to-transparent" />
      <span className="absolute left-5 right-5 top-4 z-30 flex items-start justify-between gap-4">
        <span className="max-w-[15rem] text-xl font-semibold leading-none tracking-[-.025em] text-ink">{collection.name}</span>
        <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-white/85 px-2 text-xs font-black tabular-nums text-stone-500 shadow-[0_0_0_1px_rgba(38,35,49,.04)]">{collection.items.length}</span>
      </span>
      {isSmallCollection ? <span className="absolute inset-x-5 bottom-1 z-10 flex h-[96px] items-center justify-start gap-8" aria-label={`${countText} in ${collection.name}`}>{previewItems.map((item, index) => <span key={item.word} className="grid place-items-center transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `translate3d(${gravity.x * (10 + index * 4)}px, ${gravity.y * (7 + index * 3)}px, 0) rotate(${gravity.x * (6 + index * 2)}deg)` }}><Sticker item={item} /></span>)}</span> : <span className="absolute inset-x-0 bottom-0 z-10 h-[148px] overflow-hidden" aria-label={`${countText} in ${collection.name}`}>
        {previewItems.map((item, index) => {
          const profile = offsetProfiles[index] || offsetProfiles[offsetProfiles.length - 1]
          const translateX = profile.x + gravity.x * profile.weight
          const translateY = profile.y + Math.abs(gravity.x) * 4 + gravity.y * 4
          const rotate = profile.rotate + gravity.x * 9
          return (
            <span key={item.word} className="absolute left-1/2 top-0 transition-transform duration-200 ease-out will-change-transform" style={{ transform: `translate3d(calc(-50% + ${translateX}px), ${translateY}px, 0) rotate(${rotate}deg) scale(1.42)` }}>
              <Sticker item={item} large />
            </span>
          )
        })}
      </span>}
      <span className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-b from-white/45 to-white/88 backdrop-blur-[2px]', isSmallCollection ? 'h-[42px]' : 'h-[66px]')} aria-hidden="true" />
    </button>
  )
}

function SettingToggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-8 w-14 shrink-0 rounded-full transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-2', checked ? 'bg-moss' : 'bg-stone-300')}>
      <span className={cn('absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(38,35,49,.18)] transition-transform', checked && 'translate-x-6')} />
    </button>
  )
}

function ProfileView({ languageKey, language, reviewItems, dailyVerbs, savedDailyWords, settings, profile, learningGoal, onLearningGoalChange, onSettingsChange, onSelectLanguage, onOpenReview, onEditProfile, onOpenFeedback, onOpenPrivacy }) {
  const [goalOptionsOpen, setGoalOptionsOpen] = useState(false)
  const stats = getLearningStats(reviewItems, dailyVerbs, savedDailyWords)
  const updateSetting = (key, value) => onSettingsChange((current) => ({ ...current, [key]: value }))
  const avatar = profileAvatars[profile.avatar] || profileAvatars.hiker
  const selectedGoal = learningGoals.find((goal) => goal.id === learningGoal)

  return (
    <div id="content" className="px-5 pb-4 pt-6">
      <div className="-mx-5 -mt-6">
        <div className="profile-header-gradient h-[224px] overflow-hidden rounded-b-[36px]" />

        <section className="relative mx-5 -mt-14 rounded-[30px] border border-black/[.05] bg-white px-5 pb-5 pt-12 shadow-[0_4px_14px_rgba(79,52,33,.05)]">
          <button type="button" onClick={onEditProfile} className="group mx-auto block rounded-2xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss focus-visible:ring-offset-4">
            <span className="absolute left-1/2 top-0 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-[5px] border-white bg-brand-soft">
              <img src={avatar.src} alt="" className={cn('h-full w-full object-cover', avatar.crop)} />
              <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-ink text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><Pencil size={13} /></span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-2xl font-semibold leading-tight tracking-[-.025em] text-ink">{profile.name}<Pencil size={15} className="text-stone-400" /></span>
            <span className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-stone-600"><span aria-hidden="true">{language.flag}</span> Learning {language.name}</span>
          </button>
          <div className="mt-5 grid grid-cols-3 text-center">
            <div><p className="text-xl font-bold tabular-nums text-ink">{stats.wordCount}</p><p className="mt-1 text-[11px] font-semibold text-stone-500">Words</p></div>
            <div className="border-x border-black/[.06]"><p className="text-xl font-bold tabular-nums text-ink">{stats.phraseCount}</p><p className="mt-1 text-[11px] font-semibold text-stone-500">Phrases</p></div>
            <div><p className="text-xl font-bold tabular-nums text-ink">{stats.collectionCount}</p><p className="mt-1 text-[11px] font-semibold text-stone-500">Collections</p></div>
          </div>
        </section>
      </div>

      <section className="mt-7" aria-label="Learning settings">
        <div className="divide-y divide-black/[.06] overflow-hidden rounded-[24px] border border-black/[.06] bg-white">
          <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-bold text-ink">Target language</p>
              <p className="mt-1 text-sm text-stone-500">The language used for new captures.</p>
            </div>
            <LanguageDropdown selectedKey={languageKey} onSelect={onSelectLanguage} />
          </div>
          <div className="px-4 py-4">
            <button type="button" onClick={() => setGoalOptionsOpen((open) => !open)} aria-expanded={goalOptionsOpen} className="flex min-h-11 w-full items-center justify-between gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss">
              <span><span className="block font-bold text-ink">Learning goal</span><span className="mt-1 block text-sm text-stone-500">{selectedGoal?.label || `Why you’re learning ${language.name}`}</span></span>
              <ChevronDown size={18} className={cn('shrink-0 text-stone-500 transition-transform', goalOptionsOpen && 'rotate-180')} aria-hidden="true" />
            </button>
            {goalOptionsOpen && <div className="mt-3"><LearningGoalOptions value={learningGoal} onChange={(goal) => { onLearningGoalChange(goal); setGoalOptionsOpen(false) }} compact /></div>}
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-bold text-ink">Daily goal</p><p className="mt-1 text-sm text-stone-500">Things to capture each day</p></div>
              <p className="text-sm font-black tabular-nums text-moss">{settings.dailyGoal}</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Choose a daily word goal">
              {[3, 5, 10].map((goal) => (
                <button key={goal} onClick={() => updateSetting('dailyGoal', goal)} aria-pressed={settings.dailyGoal === goal} className={cn('min-h-11 rounded-full text-sm font-bold transition-[transform,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.97]', settings.dailyGoal === goal ? 'bg-ink text-white' : 'bg-[#F6F6F6] text-stone-600')}>{goal}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-7" aria-label="Practice settings">
        <div className="divide-y divide-black/[.06] overflow-hidden rounded-[24px] border border-black/[.06] bg-white">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><Volume2 size={20} className="shrink-0 text-moss" /><div><p className="font-bold text-ink">Auto-play pronunciation</p><p className="mt-1 text-sm text-stone-500">Hear words when a learning card opens.</p></div></div>
            <SettingToggle checked={settings.autoplay} onChange={(value) => updateSetting('autoplay', value)} label="Auto-play pronunciation" />
          </div>
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><Check size={20} className="shrink-0 text-moss" /><div><p className="font-bold text-ink">Answer sounds</p><p className="mt-1 text-sm text-stone-500">Hear feedback in quizzes and matching.</p></div></div>
            <SettingToggle checked={settings.soundEffects !== false} onChange={(value) => updateSetting('soundEffects', value)} label="Answer sounds" />
          </div>
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3"><Eye size={20} className="shrink-0 text-moss" /><div><p className="font-bold text-ink">Show pronunciation</p><p className="mt-1 text-sm text-stone-500">Display IPA on word cards.</p></div></div>
            <SettingToggle checked={settings.showIpa} onChange={(value) => updateSetting('showIpa', value)} label="Show IPA pronunciation" />
          </div>
        </div>
      </section>

      <section className="mt-7" aria-label="Library and support settings">
        <div className="divide-y divide-black/[.06] overflow-hidden rounded-[24px] border border-black/[.06] bg-white">
          <button onClick={onOpenReview} className="flex min-h-[64px] w-full items-center justify-between gap-4 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss active:bg-[#F6F6F6]">
            <span className="flex items-center gap-3 font-bold text-ink"><BookOpen size={20} className="text-moss" />Manage saved words</span><ChevronRight size={18} className="text-stone-400" />
          </button>
          <button type="button" onClick={onOpenFeedback} className="flex min-h-[64px] w-full items-center justify-between gap-4 px-4 text-left font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss active:bg-[#F6F6F6]">
            <span className="flex items-center gap-3"><HelpCircle size={20} className="text-moss" />Help & feedback</span><ChevronRight size={18} className="text-stone-400" />
          </button>
          <button type="button" onClick={onOpenPrivacy} className="flex min-h-[64px] w-full items-center justify-between gap-4 px-4 text-left font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-moss active:bg-[#F6F6F6]">
            <span className="flex items-center gap-3"><ShieldCheck size={20} className="text-moss" />Privacy & photos</span><ChevronRight size={18} className="text-stone-400" />
          </button>
          <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 text-sm text-stone-500"><span>App version</span><span className="font-semibold tabular-nums">0.1 beta</span></div>
        </div>
      </section>
    </div>
  )
}

function Sheet({ title, children, onClose }) {
  const dialogRef = useDialogFocus(onClose)

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-ink/35 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:rounded-[36px]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title" className="max-h-[86dvh] w-full overflow-y-auto rounded-[28px] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_48px_rgba(38,35,49,.2)]">
        <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-200" />
        <header className="mt-4 flex items-center justify-between gap-4">
          <h2 id="sheet-title" className="text-xl font-semibold tracking-[-.025em] text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-ink transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-95"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function ProfileEditor({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile.name)
  const [avatar, setAvatar] = useState(profile.avatar)
  const [error, setError] = useState('')

  const save = (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Add a name so your profile feels like yours.')
      return
    }
    onSave({ name: trimmedName.slice(0, 32), avatar })
  }

  return (
    <Sheet title="Edit profile" onClose={onClose}>
      <form className="mt-5" onSubmit={save}>
        <label htmlFor="profile-name" className="text-sm font-bold text-ink">Display name</label>
        <input id="profile-name" value={name} onChange={(event) => { setName(event.target.value); if (error) setError('') }} maxLength={32} autoComplete="name" className="mt-2 min-h-12 w-full rounded-2xl border border-black/[.1] bg-white px-4 text-base font-medium text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-moss" aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-name-error' : undefined} />
        {error && <p id="profile-name-error" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
        <fieldset className="mt-6">
          <legend className="text-sm font-bold text-ink">Choose your buddy</legend>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {Object.entries(profileAvatars).map(([key, candidate]) => (
              <button type="button" key={key} onClick={() => setAvatar(key)} aria-pressed={avatar === key} className={cn('relative aspect-square overflow-hidden rounded-2xl border-2 bg-brand-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss active:scale-[.97]', avatar === key ? 'border-moss' : 'border-transparent')}>
                <img src={candidate.src} alt="" className={cn('h-full w-full object-cover', candidate.crop)} />
                {avatar === key && <span className="absolute bottom-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-moss text-white"><Check size={14} /></span>}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" className="mt-7 w-full" size="lg">Save profile</Button>
      </form>
    </Sheet>
  )
}

function FeedbackSheet({ onClose }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')

  const shareFeedback = async (event) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setStatus('Tell us what happened first.')
      return
    }
    const feedback = `Sanoa beta feedback\n\n${trimmedMessage}\n\nDevice: ${navigator.userAgent}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sanoa feedback', text: feedback })
        setStatus('Thanks — your feedback is ready to send.')
      } else {
        await navigator.clipboard.writeText(feedback)
        setStatus('Copied. Paste it into an email or message to the team.')
      }
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('Could not open sharing. Please try again.')
    }
  }

  return (
    <Sheet title="Help improve the beta" onClose={onClose}>
      <p className="mt-2 text-sm leading-6 text-stone-600">Tell us what felt useful, confusing, or broken. Sharing includes your device details so we can reproduce issues.</p>
      <form className="mt-5" onSubmit={shareFeedback}>
        <label htmlFor="beta-feedback" className="text-sm font-bold text-ink">Your feedback</label>
        <textarea id="beta-feedback" value={message} onChange={(event) => { setMessage(event.target.value); if (status) setStatus('') }} placeholder="For example: I couldn’t save a sticker after taking a photo." rows={5} className="mt-2 w-full rounded-2xl border border-black/[.1] bg-white px-4 py-3 text-base text-ink outline-none transition focus-visible:ring-2 focus-visible:ring-moss" aria-describedby="feedback-help" />
        <p id="feedback-help" className="mt-2 text-xs leading-5 text-stone-500">Your note stays on this device until you choose a sharing app.</p>
        {status && <p className="mt-3 text-sm font-medium text-moss" role="status">{status}</p>}
        <Button type="submit" className="mt-6 w-full" size="lg"><Mail size={18} />Share feedback</Button>
      </form>
    </Sheet>
  )
}

function PrivacySheet({ onClose }) {
  return (
    <Sheet title="Privacy & photos" onClose={onClose}>
      <div className="mt-5 space-y-5 text-sm leading-6 text-stone-600">
        <section><h3 className="font-bold text-ink">No account required</h3><p className="mt-1">Your profile, saved words, and learning progress are stored in this browser on your device. Clearing browser data removes them.</p></section>
        <section><h3 className="font-bold text-ink">Photos you choose</h3><p className="mt-1">When you tap Analyze, the photo is sent to our language-analysis service so it can identify a word or phrase. Don’t capture personal documents, faces, or sensitive information.</p></section>
        <section><h3 className="font-bold text-ink">Saved learning cards</h3><p className="mt-1">The word and learning details you save stay on this device. We don’t create a cloud account or sync your library in this beta.</p></section>
      </div>
      <Button type="button" onClick={onClose} className="mt-7 w-full" size="lg">Got it</Button>
    </Sheet>
  )
}

function CollectionDetailView({ languageKey, collection, onBack, onOpenWord }) {
  if (!collection) return null

  const scatter = [
    'rotate-[-8deg] translate-y-1',
    'rotate-[6deg] -translate-y-3',
    'rotate-[3deg] translate-y-2',
    'rotate-[-5deg] -translate-y-1',
    'rotate-[8deg] translate-y-4',
    'rotate-[-2deg] -translate-y-2',
  ]

  return (
    <div id="content" className="collection-page px-5 pt-5">
      <header className="collection-detail-header flex items-center justify-between">
        <button onClick={onBack} aria-label="Back to collections" className="grid h-11 w-11 place-items-center rounded-full border border-black/[.07] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"><ChevronLeft /></button>
        <p className="text-sm font-bold text-moss">Collection</p>
        <span className="w-11" />
      </header>

      <section className="collection-detail-copy mt-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[.14em] text-moss">{collection.items.length} saved stickers</p>
        <h1 className="mt-2 text-balance text-[32px] font-semibold leading-none tracking-[-.04em] text-ink">{collection.name}</h1>
        <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-5 text-stone-600">Tap any sticker to open the learning card, hear it, and practice the sentence.</p>
      </section>

      <section className="collection-sticker-stage relative mt-7 min-h-[440px] rounded-[36px] bg-[#f2f1f0] px-4 py-6 shadow-[0_0_0_1px_rgba(38,35,49,.045)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[36px] bg-gradient-to-b from-white/80 to-transparent" />
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-7">
          {collection.items.map((item, index) => (
            <button
              key={item.word}
              onClick={() => onOpenWord(item)}
              aria-label={`Learn ${item.word}`}
              className={cn('scatter-sticker group grid min-h-[156px] place-items-center rounded-[28px] px-2 py-3 text-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]', scatter[index % scatter.length])}
              style={{ animationDelay: `${120 + Math.min(index, 7) * 48}ms` }}
            >
              <Sticker item={item} large />
              <span className="mt-1 max-w-full truncate font-serif text-2xl font-bold leading-tight text-ink">{item.word}</span>
              <Ipa value={getIpa(languageKey, item) || item.ipa} className="-mt-1 block max-w-full truncate text-sm font-semibold text-moss" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function ReviewView({ items, practiceItems = [], dueCount = 0, logAvailable, woodFull, onCapture, onStartQuiz, onOpenCollection }) {
  const { gravity, bindGravity } = useStickerGravity()
  const collections = [
    ...(practiceItems.length ? [{ name: 'Needs practice', items: practiceItems }] : []),
    ...getWordCollections(items),
  ]
  const sessionCount = Math.min(dueCount || items.length, 5)

  return (
    <div id="content" className="px-5 pb-4 pt-6">
      <header className="flex min-h-11 items-center justify-between gap-4">
        <h1 className="text-[28px] font-semibold leading-none tracking-[-.04em] text-ink">Review</h1>
      </header>

      {items.length ? (
        <>
          <section className="relative mt-5 min-h-[214px] overflow-hidden rounded-[28px] bg-brand-soft p-5" aria-label="Sticker review">
            <img src="/assets/reindeer-sauna.png" alt="" width="214" height="214" className="pointer-events-none absolute bottom-0 right-1 h-[76%] w-[38%] select-none object-contain object-bottom" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-soft via-brand-soft/95 to-transparent" />
            <div className="relative z-10 flex min-h-[174px] w-[62%] flex-col items-start">
              <h2 className="text-balance text-[22px] font-semibold leading-[1.08] tracking-[-.03em] text-ink">{dueCount ? `${dueCount} ${dueCount === 1 ? 'word' : 'words'} due today` : 'All caught up today'}</h2>
              <p className="mt-2 text-sm leading-5 text-stone-600">{dueCount ? `${sessionCount} in this round · about ${Math.max(1, Math.ceil(sessionCount * 0.4))} min` : `Practice ${sessionCount} again · about ${Math.max(1, Math.ceil(sessionCount * 0.4))} min`}</p>
              <p className="mt-1 text-xs font-semibold leading-4 text-cinnamon">{logAvailable ? 'Finish for 1 sauna log. Fewer than 3 misses earns 2.' : woodFull ? 'The sauna has all three logs. Review for practice.' : 'Today’s review logs are already earned.'}</p>
              <Button onClick={onStartQuiz} className="mt-auto h-11 w-auto px-4" size="default"><BookOpen size={17} />{dueCount ? `Review ${sessionCount}` : `Practice ${sessionCount}`}</Button>
            </div>
          </section>

          <section className="mt-7" aria-labelledby="collections-title">
            <div className="flex items-end justify-between gap-4">
              <h2 id="collections-title" className="text-[22px] font-semibold leading-tight tracking-[-.03em] text-ink">Collections</h2>
            </div>
            <div className="mt-4 grid gap-4">
              {collections.map((collection) => (
                <CollectionFolder key={collection.name} collection={collection} gravity={gravity} bindGravity={bindGravity} onSelect={() => onOpenCollection(collection)} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-8 grid justify-items-center rounded-[28px] bg-[#F6F6F6] px-6 py-9 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-[26px] bg-brand-soft text-moss"><BookOpen size={32} /></div>
          <h2 className="mt-5 text-balance text-[22px] font-semibold leading-tight tracking-[-.03em]">Your sticker library starts here</h2>
          <p className="mt-2 max-w-[17rem] text-sm leading-5 text-stone-600">Capture an object or short phrase, then save it to begin your first collection.</p>
          <Button onClick={onCapture} className="mt-5 w-full"><Camera size={18} />Capture something</Button>
        </section>
      )}
    </div>
  )
}

function FilledHomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M4 10.7c0-.7.34-1.36.91-1.77l5.8-4.18a2.2 2.2 0 0 1 2.58 0l5.8 4.18A2.2 2.2 0 0 1 20 10.7v7.1a2.2 2.2 0 0 1-2.2 2.2h-2.55a1 1 0 0 1-1-1v-4.2a2.25 2.25 0 0 0-4.5 0V19a1 1 0 0 1-1 1H6.2A2.2 2.2 0 0 1 4 17.8v-7.1Z" />
    </svg>
  )
}

function FilledBookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M5.3 4.05C4.03 4.05 3 5.08 3 6.35v10.8c0 1.13.92 2.05 2.05 2.05h4.15c.82 0 1.56.33 2.1.86V6.6a3.74 3.74 0 0 0-2.95-2.55H5.3Zm13.4 0h-3.05A3.74 3.74 0 0 0 12.7 6.6v13.46a2.95 2.95 0 0 1 2.1-.86h4.15A2.05 2.05 0 0 0 21 17.15V6.35c0-1.27-1.03-2.3-2.3-2.3Z" />
    </svg>
  )
}

function FilledUserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 12.15a4.55 4.55 0 1 0 0-9.1 4.55 4.55 0 0 0 0 9.1Zm0 1.9c-4.35 0-7.55 2.28-7.55 5.05 0 1.05.85 1.9 1.9 1.9h11.3a1.9 1.9 0 0 0 1.9-1.9c0-2.77-3.2-5.05-7.55-5.05Z" />
    </svg>
  )
}

function FilledCameraIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M8.7 4.25c-.52 0-1 .27-1.28.72L6.5 6.45H5.1A3.1 3.1 0 0 0 2 9.55v7.1a3.1 3.1 0 0 0 3.1 3.1h13.8a3.1 3.1 0 0 0 3.1-3.1v-7.1a3.1 3.1 0 0 0-3.1-3.1h-1.4l-.92-1.48a1.5 1.5 0 0 0-1.28-.72H8.7Zm3.3 13a4.25 4.25 0 1 1 0-8.5 4.25 4.25 0 0 1 0 8.5Zm0-1.8a2.45 2.45 0 1 0 0-4.9 2.45 2.45 0 0 0 0 4.9Z" />
    </svg>
  )
}

function BottomNav({ active, onHome, onCapture, onReview, onProfile }) {
  const navItems = [
    { key: 'home', label: 'Home', icon: FilledHomeIcon, onClick: onHome },
    { key: 'review', label: 'Review', icon: FilledBookIcon, onClick: onReview },
    { key: 'profile', label: 'Profile', icon: FilledUserIcon, onClick: onProfile },
  ]

  return (
    <nav aria-label="Main navigation" className="bottom-nav absolute left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 items-center justify-center gap-3 px-5">
      <div className="nav-glass relative grid min-h-[60px] w-[206px] grid-cols-3 rounded-full px-2 py-2">
        {navItems.map(({ key, label, icon: Icon, onClick }) => (
          <button key={key} onClick={onClick} aria-label={label} className={cn('grid min-h-12 place-items-center rounded-full px-1 transition-[transform,background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]', active === key ? 'bg-brand-soft text-moss' : 'text-stone-400')}>
            <Icon className="h-[21px] w-[21px]" />
          </button>
        ))}
      </div>
      <button onClick={onCapture} aria-label="Capture something" className={cn('relative grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full bg-ink text-white shadow-[0_6px_16px_rgba(38,35,49,.14)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 active:scale-[.96]', active === 'capture' && 'scale-105')}><FilledCameraIcon className="h-7 w-7" /></button>
    </nav>
  )
}

export default App
