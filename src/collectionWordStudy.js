const studies = {
  fi: {
    kahvi: {
      forms: [['kahvi', 'coffee · base form'], ['kahvin', 'of the coffee'], ['kahvia', 'some coffee']],
      chunks: [['juoda kahvia', 'to drink coffee'], ['mustaa kahvia', 'black coffee']],
    },
    ovi: { chunks: [['avata oven', 'to open the door'], ['oven takana', 'behind the door']] },
    avain: { chunks: [['löytää avaimen', 'to find the key'], ['avata avaimella', 'to open with a key']] },
    kirja: { chunks: [['lukea kirjaa', 'to read a book'], ['kirjan kansi', 'the book’s cover']] },
    kenkä: { chunks: [['laittaa kengät jalkaan', 'to put shoes on'], ['ottaa kengät pois', 'to take shoes off']] },
    vesipullo: { chunks: [['täyttää vesipullon', 'to fill the water bottle'], ['juoda vesipullosta', 'to drink from a water bottle']] },
    vesi: { chunks: [['juoda vettä', 'to drink water'], ['kylmää vettä', 'cold water']] },
    reppu: { chunks: [['kantaa reppua', 'to carry a backpack'], ['pakata repun', 'to pack the backpack']] },
    pulla: { chunks: [['syödä pullaa', 'to eat a cinnamon bun'], ['tuore pulla', 'a fresh cinnamon bun']] },
    ämpäri: { chunks: [['täyttää ämpärin', 'to fill the bucket'], ['kantaa ämpäriä', 'to carry a bucket']] },
    polttopuu: { chunks: [['lisätä polttopuita', 'to add firewood'], ['hakea polttopuita', 'to fetch firewood']] },
  },
  sv: {
    kaffe: { forms: [['kaffe', 'coffee · base form'], ['kaffet', 'the coffee']], chunks: [['dricka kaffe', 'to drink coffee'], ['svart kaffe', 'black coffee']] },
    dörr: { forms: [['dörr', 'door · base form'], ['dörren', 'the door'], ['dörrar', 'doors'], ['dörrarna', 'the doors']], chunks: [['öppna dörren', 'to open the door'], ['stänga dörren', 'to close the door']] },
    nyckel: { forms: [['nyckel', 'key · base form'], ['nyckeln', 'the key'], ['nycklar', 'keys'], ['nycklarna', 'the keys']], chunks: [['hitta nyckeln', 'to find the key'], ['tappa nyckeln', 'to lose the key']] },
    bok: { forms: [['bok', 'book · base form'], ['boken', 'the book'], ['böcker', 'books'], ['böckerna', 'the books']], chunks: [['läsa en bok', 'to read a book'], ['låna en bok', 'to borrow a book']] },
    sko: { forms: [['sko', 'shoe · base form'], ['skon', 'the shoe'], ['skor', 'shoes'], ['skorna', 'the shoes']], chunks: [['ta på skorna', 'to put shoes on'], ['ta av skorna', 'to take shoes off']] },
    kanelbulle: { forms: [['kanelbulle', 'cinnamon bun · base form'], ['kanelbullen', 'the cinnamon bun'], ['kanelbullar', 'cinnamon buns']], chunks: [['äta en kanelbulle', 'to eat a cinnamon bun'], ['baka kanelbullar', 'to bake cinnamon buns']] },
    hink: { forms: [['hink', 'bucket · base form'], ['hinken', 'the bucket'], ['hinkar', 'buckets']], chunks: [['fylla hinken', 'to fill the bucket'], ['bära hinken', 'to carry the bucket']] },
    ved: { chunks: [['hugga ved', 'to chop firewood'], ['elda med ved', 'to burn firewood']] },
    vattenflaska: { forms: [['vattenflaska', 'water bottle · base form'], ['vattenflaskan', 'the water bottle'], ['vattenflaskor', 'water bottles']], chunks: [['fylla vattenflaskan', 'to fill the water bottle'], ['dricka ur vattenflaskan', 'to drink from the water bottle']] },
    vatten: { chunks: [['dricka vatten', 'to drink water'], ['kallt vatten', 'cold water']] },
    väska: { forms: [['väska', 'bag · base form'], ['väskan', 'the bag'], ['väskor', 'bags']], chunks: [['packa väskan', 'to pack the bag'], ['bära väskan', 'to carry the bag']] },
  },
}

const extraPhrases = {
  fi: {
    kahvi: [['Haluatko kahvia?', 'Would you like coffee?', 'kahvia']],
    ovi: [['Suljen oven.', 'I close the door.', 'oven']],
    avain: [['Avaan oven avaimella.', 'I open the door with a key.', 'avaimella', 'avain → avaimella: avaime- + -lla means “with a key,” the tool used.']],
    kirja: [['Kirja on pöydällä.', 'The book is on the table.', 'Kirja']],
    kenkä: [['Laitan kengät jalkaan.', 'I put my shoes on.', 'kengät']],
    vesipullo: [['Täytän vesipullon.', 'I fill the water bottle.', 'vesipullon']],
    vesi: [['Vesi on kylmää.', 'The water is cold.', 'Vesi']],
    reppu: [['Pakkaan repun.', 'I pack the backpack.', 'repun']],
    pulla: [['Pulla on tuore.', 'The cinnamon bun is fresh.', 'Pulla']],
    ämpäri: [['Täytän ämpärin vedellä.', 'I fill the bucket with water.', 'ämpärin']],
    polttopuu: [['Haen polttopuita.', 'I fetch firewood.', 'polttopuita']],
  },
  sv: {
    kaffe: [['Vill du ha kaffe?', 'Would you like coffee?', 'kaffe']],
    dörr: [['Jag öppnar dörren.', 'I open the door.', 'dörren']],
    nyckel: [['Var är nyckeln?', 'Where is the key?', 'nyckeln']],
    bok: [['Jag lånar en bok.', 'I borrow a book.', 'bok']],
    sko: [['Jag tar på mig skorna.', 'I put my shoes on.', 'skorna']],
    kanelbulle: [['Vill du ha en kanelbulle?', 'Would you like a cinnamon bun?', 'kanelbulle']],
    hink: [['Jag fyller hinken med vatten.', 'I fill the bucket with water.', 'hinken']],
    ved: [['Vi behöver mer ved.', 'We need more firewood.', 'ved']],
    vattenflaska: [['Jag fyller vattenflaskan.', 'I fill the water bottle.', 'vattenflaskan']],
    vatten: [['Vill du ha vatten?', 'Would you like water?', 'vatten']],
    väska: [['Jag packar väskan.', 'I pack the bag.', 'väskan']],
  },
}

const savedPhraseForms = {
  fi: { kahvi: 'kahvia', ovi: 'Ovi', avain: 'Avaimeni', kirja: 'kirjaa', kenkä: 'Kengät', vesipullo: 'vesipullo', vesi: 'vettä', reppu: 'repussa', pulla: 'pullaa', ämpäri: 'ämpärissä', polttopuu: 'polttopuuta' },
  sv: { kaffe: 'kaffe', dörr: 'Dörren', nyckel: 'nycklar', bok: 'bok', sko: 'Skorna', kanelbulle: 'kanelbulle', hink: 'hinken', ved: 'ved', vattenflaska: 'vattenflaska', vatten: 'vatten', väska: 'väskan' },
}

const savedPhraseNotes = {
  fi: {
    avain: 'avain → avaimeni: the stem is avaime-; -ni means “my.” Ovat (“are”) makes it “my keys.”',
  },
}

export function getCollectionWordStudy(word, languageKey) {
  const key = word?.trim().toLocaleLowerCase().replace(/^(en|ett) /u, '')
  const study = studies[languageKey]?.[key]
  if (!study) return null
  return {
    forms: study.forms?.map(([form, meaning]) => ({ form, meaning })) || [],
    chunks: study.chunks.map(([text, meaning]) => ({ text, meaning })),
    sentenceTargetForm: savedPhraseForms[languageKey]?.[key] || '',
    sentenceFormNote: savedPhraseNotes[languageKey]?.[key] || '',
    phrases: (extraPhrases[languageKey]?.[key] || []).map(([text, meaning, targetForm, formNote]) => ({ text, meaning, targetForm, formNote: formNote || '' })),
  }
}
