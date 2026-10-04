import { createHash } from 'node:crypto'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [kotusPath, ...treebankPaths] = process.argv.slice(2)
if (!kotusPath || treebankPaths.length !== 3) {
  throw new Error('Usage: node scripts/build-finnish-sources.mjs KOTUS_TXT FTB_TRAIN FTB_DEV FTB_TEST')
}

const outputDirectory = resolve('server/data')
mkdirSync(outputDirectory, { recursive: true })

const kotus = readFileSync(kotusPath, 'utf8')
if (!kotus.startsWith('Hakusana\tHomonymia\tSanaluokka\tTaivutustiedot\n')) {
  throw new Error('Unexpected Kotus word-list format')
}
writeFileSync(resolve(outputDirectory, 'nykysuomensanalista2024.txt'), kotus)

const forms = new Set()
const hashes = {}
for (const path of treebankPaths) {
  const source = readFileSync(path, 'utf8')
  hashes[path.split('/').at(-1)] = createHash('sha256').update(source).digest('hex')
  for (const line of source.split('\n')) {
    if (!/^[0-9]+\t/u.test(line)) continue
    const [, surface, lemma] = line.split('\t', 4)
    if (surface && lemma && lemma !== '_' && !lemma.includes(' ') && !surface.includes(' ')) {
      forms.add(`${lemma.toLocaleLowerCase('fi')}\t${surface.toLocaleLowerCase('fi')}`)
    }
  }
}
writeFileSync(resolve(outputDirectory, 'ftb-forms.tsv'), [...forms].sort((a, b) => a.localeCompare(b, 'fi')).join('\n') + '\n')
writeFileSync(resolve(outputDirectory, 'provenance.json'), JSON.stringify({
  kotus: {
    title: 'Nykysuomen sanalista 2024',
    publisher: 'Kotimaisten kielten keskus',
    url: 'https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista/',
    download: 'https://kaino.kotus.fi/lataa/nykysuomensanalista2024.txt',
    license: 'CC BY 4.0',
    sha256: createHash('sha256').update(kotus).digest('hex'),
  },
  ftb: {
    title: 'UD Finnish FTB',
    publisher: 'FinnTreeBank / Universal Dependencies',
    url: 'https://universaldependencies.org/treebanks/fi_ftb/',
    repository: 'https://github.com/UniversalDependencies/UD_Finnish-FTB',
    license: 'CC BY 4.0',
    sourceHashes: hashes,
    derived: 'Unique lemma–surface-form pairs only; not frequency estimates or example sentences.',
  },
}, null, 2) + '\n')

console.log(`Prepared Kotus word list and ${forms.size} FinnTreeBank lemma–form pairs.`)
