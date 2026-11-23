import type { Lang, Zone } from './village'
import { anchors, destinations } from './village'
import { beach, campfire, fishingSpot, pond, shrine, tideOrgan, telescopeSite, tulipField } from './island'

type XZ = [number, number]
export type PlaceKind = 'building' | 'activity' | 'nook'
export type PlaceIcon =
  | 'about'
  | 'tech'
  | 'projects'
  | 'journey'
  | 'skills'
  | 'contact'
  | 'fish'
  | 'flame'
  | 'swords'
  | 'flower'
  | 'palm'
  | 'telescope'
  | 'droplets'
  | 'shirt'
  | 'music'

/** Everything the map can show and take you to. */
export interface MapPlace {
  id: string
  kind: PlaceKind
  icon: PlaceIcon
  color: string
  /** Where the pin sits. */
  at: XZ
  /** A walkable spot to arrive at (and face `at` from). */
  stand: XZ
  /** Buildings travel through the regular zone travel (doors, panels). */
  zone?: Zone
  name: Record<Lang, string>
  blurb: Record<Lang, string>
}

const zoneBlurbs: Record<Zone, Record<Lang, string>> = {
  about: {
    es: 'La casa de Iker: su perfil, el álbum y el vestidor con 27 trajes.',
    ca: 'La casa de l’Iker: el perfil, l’àlbum i el vestidor amb 27 vestits.',
    en: 'Iker’s house: his profile, the album and a wardrobe with 27 outfits.',
  },
  tech: {
    es: 'El taller: lenguajes, herramientas y estaciones de trabajo.',
    ca: 'El taller: llenguatges, eines i estacions de treball.',
    en: 'The workshop: languages, tools and workstations.',
  },
  projects: {
    es: 'Seis expositores con los proyectos destacados.',
    ca: 'Sis expositors amb els projectes destacats.',
    en: 'Six exhibits with the featured projects.',
  },
  journey: {
    es: 'La estación de recuerdos: formación y experiencia.',
    ca: 'L’estació dels records: formació i experiència.',
    en: 'The memory station: education and experience.',
  },
  skills: {
    es: 'La cafetería: habilidades y forma de trabajar.',
    ca: 'La cafeteria: habilitats i manera de treballar.',
    en: 'The café: skills and ways of working.',
  },
  contact: {
    es: 'El buzón: escríbele o encuéntralo en GitHub y LinkedIn.',
    ca: 'La bústia: escriu-li o troba’l a GitHub i LinkedIn.',
    en: 'The mailbox: write to him or find him on GitHub and LinkedIn.',
  },
}
const zoneNames: Record<Zone, Record<Lang, string>> = {
  about: { es: 'Casa de Iker', ca: 'Casa de l’Iker', en: 'Iker’s house' },
  tech: { es: 'Taller de Iker', ca: 'Taller de l’Iker', en: 'Iker’s workshop' },
  projects: { es: 'Plaza de proyectos', ca: 'Plaça de projectes', en: 'Project plaza' },
  journey: { es: 'Estación de recuerdos', ca: 'Estació dels records', en: 'Memory station' },
  skills: { es: 'Cafetería', ca: 'Cafeteria', en: 'Café' },
  contact: { es: 'Buzón', ca: 'Bústia', en: 'Mailbox' },
}
const zoneColors: Record<Zone, string> = {
  about: '#d5814a',
  tech: '#418875',
  projects: '#ba7750',
  journey: '#616b99',
  skills: '#a8676b',
  contact: '#548c98',
}

export const places: MapPlace[] = [
  ...(Object.keys(destinations) as Zone[]).map((zone) => ({
    id: zone,
    kind: 'building' as const,
    icon: zone,
    color: zoneColors[zone],
    at: anchors[zone],
    stand: destinations[zone],
    zone,
    name: zoneNames[zone],
    blurb: zoneBlurbs[zone],
  })),
  {
    id: 'fishing',
    kind: 'activity',
    icon: 'fish',
    color: '#3f8ab8',
    at: fishingSpot,
    stand: [fishingSpot[0], fishingSpot[1] - 0.5],
    name: { es: 'Muelle de pesca', ca: 'Moll de pesca', en: 'Fishing pier' },
    blurb: {
      es: 'Lanza la caña y pesca nueve especies con nombre de tecnología.',
      ca: 'Llança la canya i pesca nou espècies amb nom de tecnologia.',
      en: 'Cast a line and catch nine species named after tech.',
    },
  },
  {
    id: 'campfire',
    kind: 'activity',
    icon: 'flame',
    color: '#e0763c',
    at: campfire.fire,
    stand: [campfire.fire[0] + 1.6, campfire.fire[1] - 0.2],
    name: { es: 'Fogata', ca: 'Foguera', en: 'Campfire' },
    blurb: {
      es: 'Siéntate en un tronco a calentarte las manos bajo los farolillos.',
      ca: 'Seu en un tronc a escalfar-te les mans sota els fanalets.',
      en: 'Sit on a log and warm your hands under the lanterns.',
    },
  },
  {
    id: 'shrine',
    kind: 'activity',
    icon: 'swords',
    color: '#c8423a',
    at: shrine.center,
    stand: [shrine.gate[0] - 0.8, shrine.gate[1] + 0.1],
    name: { es: 'Santuario del islote', ca: 'Santuari de l’illot', en: 'Islet shrine' },
    blurb: {
      es: 'Un rincón tranquilo con farolillos y cerezos. Entrena en el ring y toca el gong.',
      ca: 'Un racó tranquil amb fanalets i cirerers. Entrena al ring i toca el gong.',
      en: 'A quiet corner of lanterns and cherry trees. Train in the ring and strike the gong.',
    },
  },
  {
    id: 'tide-organ', kind: 'activity', icon: 'music', color: '#278a89',
    at: tideOrgan.center, stand: [20.9, -2.9],
    name: { es: 'Órgano de las Mareas', ca: 'Orgue de les Marees', en: 'Tide Organ' },
    blurb: {
      es: 'Cruza la pasarela del faro. Pisa las placas de colores o salta sobre ellas para tocar el órgano.',
      ca: 'Travessa la passarel·la del far. Trepitja les plaques de colors o salta-hi per tocar l’orgue.',
      en: 'Cross the lighthouse boardwalk. Step or jump onto the coloured plates to play the organ.',
    },
  },
  {
    id: 'pond',
    kind: 'nook',
    icon: 'droplets',
    color: '#4fa7a0',
    at: pond.center,
    stand: [pond.center[0] - 2.1, pond.center[1]],
    name: { es: 'Estanque de las ranas', ca: 'Estany de les granotes', en: 'Frog pond' },
    blurb: {
      es: 'Nenúfares, una flor de loto y ranas que saltan al agua si te acercas.',
      ca: 'Nenúfars, una flor de lotus i granotes que salten a l’aigua si t’hi acostes.',
      en: 'Lily pads, a lotus and frogs that plop in if you get close.',
    },
  },
  {
    id: 'tulips',
    kind: 'nook',
    icon: 'flower',
    color: '#d9607e',
    at: tulipField.center,
    stand: [tulipField.center[0], tulipField.center[1] + 1.9],
    name: { es: 'Campo de tulipanes', ca: 'Camp de tulipes', en: 'Tulip field' },
    blurb: {
      es: 'Hileras de tulipanes de colores vigiladas por un espantapájaros.',
      ca: 'Fileres de tulipes de colors vigilades per un espantaocells.',
      en: 'Rows of colourful tulips watched over by a scarecrow.',
    },
  },
  {
    id: 'beach',
    kind: 'nook',
    icon: 'palm',
    color: '#d9a441',
    at: beach.center,
    stand: beach.center,
    name: { es: 'Playa de las palmeras', ca: 'Platja de les palmeres', en: 'Palm beach' },
    blurb: {
      es: 'Arena, palmeras, un castillo de arena y una sombrilla junto al mar.',
      ca: 'Sorra, palmeres, un castell de sorra i un para-sol vora el mar.',
      en: 'Sand, palms, a sandcastle and a parasol by the sea.',
    },
  },
  {
    id: 'lookout',
    kind: 'nook',
    icon: 'telescope',
    color: '#7b6bb0',
    at: telescopeSite,
    stand: [telescopeSite[0] + 0.9, telescopeSite[1] + 1.2],
    name: { es: 'Mirador del oeste', ca: 'Mirador de l’oest', en: 'West lookout' },
    blurb: {
      es: 'Un catalejo, un banco con vistas y el puente hacia el islote.',
      ca: 'Un catalejo, un banc amb vistes i el pont cap a l’illot.',
      en: 'A telescope, a bench with a view and the bridge to the islet.',
    },
  },
]

export const placeKinds: PlaceKind[] = ['building', 'activity', 'nook']
export const kindNames: Record<PlaceKind, Record<Lang, string>> = {
  building: { es: 'Edificios', ca: 'Edificis', en: 'Buildings' },
  activity: { es: 'Actividades', ca: 'Activitats', en: 'Activities' },
  nook: { es: 'Rincones', ca: 'Racons', en: 'Nooks' },
}
