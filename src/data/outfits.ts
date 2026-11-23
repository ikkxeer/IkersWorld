import type { Lang } from './village'

/**
 * Outfits for the wardrobe in Iker's house. Each is an original look built
 * on a classic anime archetype (ninja, shōnen hero, sailor uniform, mage,
 * samurai, idol): colours, hairstyle and accessories, no borrowed characters.
 */
export interface Outfit {
  id: string
  name: Record<Lang, string>
  blurb: Record<Lang, string>
  hair: string
  hairLight: string
  hairStyle: 'swoop' | 'spiky' | 'long' | 'topknot' | 'twintails'
  /** Jumper / jacket / robe colour, with optional stripes. */
  top: string
  stripe: string | null
  /** What sits at the neck. */
  collar: 'scarf' | 'sailor' | 'kimono' | 'none'
  /** Scarf, ribbon, obi or trim colour. */
  accent: string
  bottom: string
  bottomLight: string
  /** Dungaree bib over the top (the explorer's look). */
  bib: boolean
  sock: string
  boot: string
  bootLight: string
  sole: string
  hat: 'none' | 'headband' | 'wizard' | 'bow'
  hatColor: string
  back: 'none' | 'katana' | 'cape'
  backColor: string
}

export const outfits: Outfit[] = [
  {
    id: 'explorer',
    name: { es: 'Explorador', ca: 'Explorador', en: 'Explorer' },
    blurb: {
      es: 'Jersey de rayas, peto vaquero y botas de agua. El de siempre.',
      ca: 'Jersei de ratlles, pitet texà i botes d’aigua. El de sempre.',
      en: 'Striped jumper, denim dungarees and rain boots. The classic.',
    },
    hair: '#7a4630',
    hairLight: '#99603f',
    hairStyle: 'swoop',
    top: '#83cdb0',
    stripe: '#fdf3dc',
    collar: 'scarf',
    accent: '#ef6c5c',
    bottom: '#5479b0',
    bottomLight: '#6e93c6',
    bib: true,
    sock: '#fdf3dc',
    boot: '#f3b840',
    bootLight: '#f8cf6d',
    sole: '#8a5440',
    hat: 'none',
    hatColor: '#000000',
    back: 'none',
    backColor: '#000000',
  },
  {
    id: 'ninja',
    name: { es: 'Ninja del crepúsculo', ca: 'Ninja del capvespre', en: 'Twilight Ninja' },
    blurb: {
      es: 'Ropa oscura, bufanda carmesí, cinta en la frente y una katana a la espalda.',
      ca: 'Roba fosca, bufanda carmesí, cinta al front i una katana a l’esquena.',
      en: 'Dark gear, a crimson scarf, a headband and a katana on the back.',
    },
    hair: '#23252e',
    hairLight: '#3a3e4c',
    hairStyle: 'spiky',
    top: '#2f3b54',
    stripe: null,
    collar: 'scarf',
    accent: '#d8443c',
    bottom: '#283246',
    bottomLight: '#384560',
    bib: false,
    sock: '#e8e2d6',
    boot: '#3a3f4a',
    bootLight: '#525866',
    sole: '#24262c',
    hat: 'headband',
    hatColor: '#d8443c',
    back: 'katana',
    backColor: '#3a2a2a',
  },
  {
    id: 'hero',
    name: { es: 'Héroe shōnen', ca: 'Heroi shōnen', en: 'Shōnen Hero' },
    blurb: {
      es: 'Pelo de punta, chaqueta blanca y roja y zapatillas listas para entrenar.',
      ca: 'Cabells de punta, jaqueta blanca i vermella i vambes a punt per entrenar.',
      en: 'Spiky hair, a white-and-red jacket and trainers ready for training.',
    },
    hair: '#2f6fe0',
    hairLight: '#5c95f2',
    hairStyle: 'spiky',
    top: '#f6f3ec',
    stripe: '#e0473b',
    collar: 'none',
    accent: '#e0473b',
    bottom: '#2a2f3a',
    bottomLight: '#3b4150',
    bib: false,
    sock: '#f6f3ec',
    boot: '#e0473b',
    bootLight: '#f26a5a',
    sole: '#f6f3ec',
    hat: 'none',
    hatColor: '#000000',
    back: 'cape',
    backColor: '#e0473b',
  },
  {
    id: 'sailor',
    name: { es: 'Uniforme marinero', ca: 'Uniforme mariner', en: 'Sailor Uniform' },
    blurb: {
      es: 'Cuello marinero, lazo rojo y melena larga: listo para el primer día de clase.',
      ca: 'Coll mariner, llaç vermell i cabellera llarga: a punt per al primer dia de classe.',
      en: 'Sailor collar, red bow and long hair: ready for the first day of school.',
    },
    hair: '#3b2b3f',
    hairLight: '#5a4560',
    hairStyle: 'long',
    top: '#fbfaf6',
    stripe: null,
    collar: 'sailor',
    accent: '#e0505a',
    bottom: '#27407a',
    bottomLight: '#34528f',
    bib: false,
    sock: '#fbfaf6',
    boot: '#5a3a2e',
    bootLight: '#76503e',
    sole: '#3a2620',
    hat: 'none',
    hatColor: '#000000',
    back: 'none',
    backColor: '#000000',
  },
  {
    id: 'mage',
    name: { es: 'Mago arcano', ca: 'Mag arcà', en: 'Arcane Mage' },
    blurb: {
      es: 'Túnica violeta con ribetes dorados, capa de medianoche y sombrero de estrella.',
      ca: 'Túnica violeta amb ribets daurats, capa de mitjanit i barret d’estrella.',
      en: 'Violet robe with gold trim, a midnight cape and a starry hat.',
    },
    hair: '#d9dbe6',
    hairLight: '#f2f3f8',
    hairStyle: 'long',
    top: '#5b3f8f',
    stripe: '#f2c94c',
    collar: 'none',
    accent: '#f2c94c',
    bottom: '#4a3278',
    bottomLight: '#5b3f8f',
    bib: false,
    sock: '#4a3278',
    boot: '#3a2a52',
    bootLight: '#4c3868',
    sole: '#251a36',
    hat: 'wizard',
    hatColor: '#5b3f8f',
    back: 'cape',
    backColor: '#2c2350',
  },
  {
    id: 'samurai',
    name: { es: 'Samurái errante', ca: 'Samurai errant', en: 'Wandering Samurai' },
    blurb: {
      es: 'Kimono turquesa, hakama oscura, moño alto y katana. Sereno y elegante.',
      ca: 'Quimono turquesa, hakama fosca, monyo alt i katana. Serè i elegant.',
      en: 'Teal kimono, dark hakama, a top knot and a katana. Calm and elegant.',
    },
    hair: '#1f1b1b',
    hairLight: '#3a3333',
    hairStyle: 'topknot',
    top: '#3f8590',
    stripe: null,
    collar: 'kimono',
    accent: '#d8b25a',
    bottom: '#3a3a46',
    bottomLight: '#4a4a58',
    bib: false,
    sock: '#f4efe3',
    boot: '#8a5a3a',
    bootLight: '#a87048',
    sole: '#5a3a26',
    hat: 'none',
    hatColor: '#000000',
    back: 'katana',
    backColor: '#2a2020',
  },
  {
    id: 'idol',
    name: { es: 'Idol estelar', ca: 'Idol estel·lar', en: 'Star Idol' },
    blurb: {
      es: 'Coletas rosas, gran lazo y un conjunto pastel para brillar en el escenario.',
      ca: 'Cuetes roses, un gran llaç i un conjunt pastel per brillar a l’escenari.',
      en: 'Pink twin tails, a big bow and a pastel outfit to shine on stage.',
    },
    hair: '#f58fb6',
    hairLight: '#ffb6d2',
    hairStyle: 'twintails',
    top: '#ffb3cf',
    stripe: '#ffffff',
    collar: 'none',
    accent: '#ff6f9f',
    bottom: '#ffffff',
    bottomLight: '#ffe3ee',
    bib: false,
    sock: '#ffffff',
    boot: '#ff8fb5',
    bootLight: '#ffb3cf',
    sole: '#e0608a',
    hat: 'bow',
    hatColor: '#ff6f9f',
    back: 'none',
    backColor: '#000000',
  },
]

export const outfitById = (id: string | null | undefined) => outfits.find((o) => o.id === id) ?? outfits[0]

const storageKey = 'ikers-world-outfit'
export function loadOutfit() {
  try {
    return outfitById(localStorage.getItem(storageKey)).id
  } catch {
    return outfits[0].id
  }
}
export function saveOutfit(id: string) {
  try {
    localStorage.setItem(storageKey, id)
  } catch {
    /* Private sessions just start in the classic look. */
  }
}
