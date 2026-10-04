# Finnish lexical sources

The app uses two openly licensed, traceable Finnish resources. Source checks apply to the **base word and a specific surface form**, not to the entire learning card.

| Resource | Publisher and license | Used for | Not used for |
| --- | --- | --- | --- |
| [Nykysuomen sanalista 2024](https://kotus.fi/sanakirjat/kielitoimiston-sanakirja/nykysuomen-sana-aineistot/nykysuomen-sanalista/) | Kotimaisten kielten keskus (Kotus), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Base-word presence, part of speech, inflection-type code | English meanings, IPA, usage approval, example sentences |
| [UD Finnish FTB](https://universaldependencies.org/treebanks/fi_ftb/) | FinnTreeBank / Universal Dependencies, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Whether a particular lemma–surface-form pair occurs in the treebank | Everyday frequency estimates, English translations, example text in the app |

Kotus explicitly says its list is neither exhaustive nor normative. A missing entry does not prove a word is wrong. FTB is a grammar-example corpus, not a representative everyday-language sample. The app therefore says **listed** and **attested**, never “approved” or “common” on the strength of these datasets.

Photo analysis still uses DeepSeek to propose object labels, meanings, IPA, and teaching sentences. Those fields are not sourced from Kotus or FTB and are identified as app content in the word-card source disclosure. The same limitation applies to the hand-authored starter and daily-verb cards. The full *Kielitoimiston sanakirja* was not copied into this repository. [FinnWordNet](https://www.kielipankki.fi/corpora/finnwordnet/) is also open (CC BY 3.0, subject to the Princeton WordNet license) but is not used to automatically assign English glosses: its senses need disambiguation for a particular photo.

## Rebuilding the data

Download the Kotus TXT file and the `train`, `dev`, and `test` CoNLL-U files from the [UD Finnish FTB repository](https://github.com/UniversalDependencies/UD_Finnish-FTB). Then run:

```sh
node scripts/build-finnish-sources.mjs /path/to/nykysuomensanalista2024.txt /path/to/fi_ftb-ud-train.conllu /path/to/fi_ftb-ud-dev.conllu /path/to/fi_ftb-ud-test.conllu
```

The script copies the Kotus word list and derives only unique lemma–surface-form pairs from FTB; it does not redistribute FTB sentences. Input hashes, links and licenses are recorded in [`server/data/provenance.json`](server/data/provenance.json). The app performs source lookups locally on the server, so it does not depend on the institutions' APIs being online during use.

Citation: *Nykysuomen sanalista*. Kotimaisten kielten keskus, 2024 (TXT updated 11 April 2025), accessed 4 October 2026. UD Finnish FTB, FinnTreeBank / Universal Dependencies, repository files accessed 4 October 2026.
