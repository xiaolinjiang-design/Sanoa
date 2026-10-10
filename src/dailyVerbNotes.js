function focusedLesson(base, form, meaning, examples, formIntro) {
  const phrases = examples.map(([text, translation]) => ({ text, meaning: translation }))
  return {
    variants: [{ form, meaning }],
    formIntro,
    formHints: [{ form, explanation: `${base} → ${form}: “${meaning}”` }],
    phrases,
  }
}

export const dailyVerbNotes = {
  fi: {
    syödä: focusedLesson('syödä', 'syön', 'I eat', [
      ['Syön pullaa.', 'I eat a cinnamon bun.'],
      ['Syön omenaa.', 'I eat an apple.'],
    ], 'Use syön when you say “I eat.”'),
    juoda: focusedLesson('juoda', 'juon', 'I drink', [
      ['Juon vettä.', 'I drink water.'],
      ['Juon kahvia.', 'I drink coffee.'],
    ], 'Use juon when you say “I drink.”'),
    täyttää: focusedLesson('täyttää', 'täytän', 'I fill', [
      ['Täytän vesipullon.', 'I fill the water bottle.'],
      ['Täytän kupin.', 'I fill the cup.'],
    ], 'Use täytän when you say “I fill.”'),
    avata: focusedLesson('avata', 'avaan', 'I open', [
      ['Avaan oven.', 'I open the door.'],
      ['Avaan ikkunan.', 'I open the window.'],
      ['Avaan laatikon.', 'I open the drawer.'],
    ], 'Use avaan when you say “I open.”'),
    lukea: focusedLesson('lukea', 'luen', 'I read', [
      ['Luen kirjaa.', 'I read a book.'],
      ['Luen lehteä.', 'I read a magazine.'],
    ], 'Use luen when you say “I read.”'),
    mennä: focusedLesson('mennä', 'menen', 'I go', [
      ['Menen kotiin.', 'I go home.'],
      ['Menen kauppaan.', 'I go to the shop.'],
    ], 'Use menen when you say “I go.”'),
    ottaa: focusedLesson('ottaa', 'otan', 'I take', [
      ['Otan avaimet.', 'I take the keys.'],
      ['Otan laukun.', 'I take the bag.'],
    ], 'Use otan when you say “I take.”'),
    olla: focusedLesson('olla', 'on', 'is', [
      ['Se on tässä.', 'It is here.'],
      ['Se on kotona.', 'It is at home.'],
    ], 'Olla becomes on when you say “it is.”'),
  },
  sv: {
    äta: focusedLesson('äta', 'äter', 'I eat', [
      ['Jag äter en kanelbulle.', 'I eat a cinnamon bun.'],
      ['Jag äter ett äpple.', 'I eat an apple.'],
    ], 'Use äter with jag to say “I eat.”'),
    dricka: focusedLesson('dricka', 'dricker', 'I drink', [
      ['Jag dricker vatten.', 'I drink water.'],
      ['Jag dricker kaffe.', 'I drink coffee.'],
    ], 'Use dricker with jag to say “I drink.”'),
    fylla: focusedLesson('fylla', 'fyller', 'I fill', [
      ['Jag fyller vattenflaskan.', 'I fill the water bottle.'],
      ['Jag fyller koppen.', 'I fill the cup.'],
    ], 'Use fyller with jag to say “I fill.”'),
    öppna: focusedLesson('öppna', 'öppnar', 'I open', [
      ['Jag öppnar dörren.', 'I open the door.'],
      ['Jag öppnar fönstret.', 'I open the window.'],
      ['Jag öppnar flaskan.', 'I open the bottle.'],
    ], 'Use öppnar with jag to say “I open.”'),
    läsa: focusedLesson('läsa', 'läser', 'I read', [
      ['Jag läser en bok.', 'I read a book.'],
      ['Jag läser en tidning.', 'I read a newspaper.'],
    ], 'Use läser with jag to say “I read.”'),
    gå: focusedLesson('gå', 'går', 'I go', [
      ['Jag går till affären.', 'I go to the shop.'],
      ['Jag går till skolan.', 'I go to school.'],
    ], 'Use går with jag to say “I go.”'),
    ta: focusedLesson('ta', 'tar', 'I take', [
      ['Jag tar nycklarna.', 'I take the keys.'],
      ['Jag tar väskan.', 'I take the bag.'],
    ], 'Use tar with jag to say “I take.”'),
    vara: focusedLesson('vara', 'är', 'is', [
      ['Den är här.', 'It is here.'],
      ['Den är hemma.', 'It is at home.'],
    ], 'Vara becomes är in the present tense.'),
  },
}

// Present-tense forms follow the person order in getDailyVerbPersons.
export const dailyVerbDetails = {
  fi: {
    syödä: { forms: ['syön', 'syöt', 'syö', 'syömme', 'syötte', 'syövät'], chunks: [['syödä aamupalaa', 'eat breakfast'], ['syödä ulkona', 'eat out']] },
    juoda: { forms: ['juon', 'juot', 'juo', 'juomme', 'juotte', 'juovat'], chunks: [['juoda teetä', 'drink tea'], ['juoda hitaasti', 'drink slowly']] },
    täyttää: { forms: ['täytän', 'täytät', 'täyttää', 'täytämme', 'täytätte', 'täyttävät'], chunks: [['täyttää lomake', 'fill in a form'], ['täyttää ämpäri', 'fill a bucket']] },
    avata: { forms: ['avaan', 'avaat', 'avaa', 'avaamme', 'avaatte', 'avaavat'], chunks: [['avata paketti', 'open a package'], ['avata sovellus', 'open an app']] },
    lukea: { forms: ['luen', 'luet', 'lukee', 'luemme', 'luette', 'lukevat'], chunks: [['lukea ääneen', 'read aloud'], ['lukea viesti', 'read a message']] },
    mennä: { forms: ['menen', 'menet', 'menee', 'menemme', 'menette', 'menevät'], chunks: [['mennä töihin', 'go to work'], ['mennä bussilla', 'go by bus']] },
    ottaa: { forms: ['otan', 'otat', 'ottaa', 'otamme', 'otatte', 'ottavat'], chunks: [['ottaa kuva', 'take a photo'], ['ottaa mukaan', 'take along']] },
    olla: { forms: ['olen', 'olet', 'on', 'olemme', 'olette', 'ovat'], chunks: [['olla valmis', 'be ready'], ['olla lähellä', 'be nearby']] },
  },
  sv: {
    äta: { present: 'äter', chunks: [['äta frukost', 'eat breakfast'], ['äta ute', 'eat out']] },
    dricka: { present: 'dricker', chunks: [['dricka te', 'drink tea'], ['dricka långsamt', 'drink slowly']] },
    fylla: { present: 'fyller', chunks: [['fylla i ett formulär', 'fill in a form'], ['fylla en hink', 'fill a bucket']] },
    öppna: { present: 'öppnar', chunks: [['öppna ett paket', 'open a package'], ['öppna en app', 'open an app']] },
    läsa: { present: 'läser', chunks: [['läsa högt', 'read aloud'], ['läsa ett meddelande', 'read a message']] },
    gå: { present: 'går', chunks: [['gå hem', 'go home'], ['gå till jobbet', 'go to work']] },
    ta: { present: 'tar', chunks: [['ta ett foto', 'take a photo'], ['ta med', 'take along']] },
    vara: { present: 'är', chunks: [['vara redo', 'be ready'], ['vara nära', 'be nearby']] },
  },
}
