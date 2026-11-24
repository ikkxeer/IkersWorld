import type { Lang } from './village'

type Line = Record<Lang, string>

/**
 * Pip's guided tour. *Asterisks* mark words Pip stresses (drawn in colour),
 * and each stop has an emoji badge and a tiny title.
 */
export const pipWelcome: Line = {
  es: '¡Ahoy, grumete! Soy *Pip*, capitán de este muelle. ¿Te enseño la isla? ¡Agárrate el sombrero, que zarpamos!',
  ca: 'Ahoy, grumet! Soc en *Pip*, capità d’aquest moll. T’ensenyo l’illa? Agafa’t el barret, que salpem!',
  en: 'Ahoy, deckhand! I’m *Pip*, captain of this pier. Want the grand tour? Hold on to your hat, we’re setting sail!',
}

export const pipControls = {
  es: { pause: 'Pausar', resume: 'Continuar', progress: 'Progreso del recorrido', next: 'Siguiente', back: 'Anterior', skip: 'Toca o pulsa E para seguir', end: '¡Y hasta aquí el recorrido! La isla es toda tuya. Si me necesitas, ya sabes dónde encontrarme: *en el muelle*, como buen capitán.' },
  ca: { pause: 'Pausa', resume: 'Continua', progress: 'Progrés del recorregut', next: 'Següent', back: 'Anterior', skip: 'Toca o prem E per continuar', end: 'I aquí acaba el recorregut! L’illa és tota teva. Si em necessites, ja saps on trobar-me: *al moll*, com un bon capità.' },
  en: { pause: 'Pause', resume: 'Resume', progress: 'Tour progress', next: 'Next', back: 'Back', skip: 'Tap or press E to continue', end: 'And that’s the tour! The island is all yours. Need me? You know where I’ll be: *on the pier*, like any good captain.' },
}

export const pipStops: { id: string; icon: string; mood: 'happy' | 'wow' | 'wink'; es: string; ca: string; en: string }[] = [
  {
    id: 'about',
    icon: '🏡',
    mood: 'happy',
    es: 'Esta es la *casa de Iker*. Dentro está su álbum… ¡y un *vestidor* con 27 trajes! Pruébate uno, que hoy toca ir elegante.',
    ca: 'Aquesta és la *casa de l’Iker*. A dins hi ha el seu àlbum… i un *vestidor* amb 27 vestits! Emprova’t-ne un, que avui toca anar elegant.',
    en: 'This is *Iker’s house*. Inside you’ll find his album… and a *wardrobe* with 27 outfits! Try one on, today we dress to impress.',
  },
  {
    id: 'projects',
    icon: '🗿',
    mood: 'wow',
    es: 'Al cruzar el puente, ¡*seis esculturas*! Cada una guarda un proyecto de Iker. Acércate y pulsa *E* para descubrirlo.',
    ca: 'En travessar el pont, *sis escultures*! Cadascuna amaga un projecte de l’Iker. Acosta’t i prem *E* per descobrir-lo.',
    en: 'Over the bridge, *six sculptures*! Each one hides one of Iker’s projects. Walk up and press *E* to uncover it.',
  },
  {
    id: 'tech',
    icon: '🛠️',
    mood: 'wink',
    es: 'El *taller*: aquí Iker trastea con código. Entra y curiosea sus tres estaciones: *web, datos y automatización*.',
    ca: 'El *taller*: aquí l’Iker remena codi. Entra i xafardeja les tres estacions: *web, dades i automatització*.',
    en: 'The *workshop*: this is where Iker tinkers with code. Pop in and nose around three stations: *web, data and automation*.',
  },
  {
    id: 'campfire',
    icon: '🔥',
    mood: 'happy',
    es: 'Mi rincón favorito… ¡la *fogata*! Siéntate en un tronco, calienta las aletas y escucha cómo crepita.',
    ca: 'El meu racó preferit… la *foguera*! Seu en un tronc, escalfa’t les aletes i escolta com espetega.',
    en: 'My favourite spot… the *campfire*! Sit on a log, warm your flippers and listen to it crackle.',
  },
  {
    id: 'shrine',
    icon: '⛩️',
    mood: 'wow',
    es: 'Cruza la pasarela del oeste hasta el *santuario*. Toca el *gong*… ¡y entrena en el ring hasta que te brille el pelo!',
    ca: 'Travessa la passarel·la de l’oest fins al *santuari*. Toca el *gong*… i entrena al ring fins que et brilli el cabell!',
    en: 'Take the western boardwalk to the *shrine*. Strike the *gong*… and train in the ring until your hair glows!',
  },
  {
    id: 'fishing',
    icon: '🎣',
    mood: 'wink',
    es: 'Al final del muelle se *pesca* de maravilla. Lanza con *E*, espera a que la boya se hunda… y ¡zas! Hay peces con nombre de tecnología.',
    ca: 'Al final del moll s’hi *pesca* de meravella. Llança amb *E*, espera que la boia s’enfonsi… i zas! Hi ha peixos amb nom de tecnologia.',
    en: 'The end of the pier is great for *fishing*. Cast with *E*, wait for the bobber to dip… and yank! Some fish are named after tech.',
  },
  {
    id: 'tide-organ',
    icon: '🎶',
    mood: 'happy',
    es: 'Junto al faro está el *Órgano de las Mareas*. Pisa o salta sobre sus *tres placas* de colores y… ¡música, maestro!',
    ca: 'Al costat del far hi ha l’*Orgue de les Marees*. Trepitja o salta sobre les *tres plaques* de colors i… música, mestre!',
    en: 'By the lighthouse sits the *Tide Organ*. Step or hop on its *three coloured plates* and… hit it, maestro!',
  },
  {
    id: 'radio-cove',
    icon: '📻',
    mood: 'wow',
    es: 'Y para acabar, la *cala de la radio*. Enciende el altavoz y siéntate: de día pasan delfines, y de noche… *estrellas fugaces*.',
    ca: 'I per acabar, la *cala de la ràdio*. Engega l’altaveu i seu: de dia hi passen dofins, i de nit… *estels fugaços*.',
    en: 'And to finish, *Radio Cove*. Switch on the speaker and sit: dolphins pass by day, and at night… *shooting stars*.',
  },
]
