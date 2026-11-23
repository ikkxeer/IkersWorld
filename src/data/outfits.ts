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
  hat:
    | 'none'
    | 'headband'
    | 'wizard'
    | 'bow'
    | 'cap'
    | 'crown'
    | 'ears'
    | 'beanie'
    | 'tricorn'
    | 'helmet'
    | 'chef'
    | 'straw'
    | 'goggles'
    | 'halo'
  hatColor: string
  back: 'none' | 'katana' | 'cape' | 'wings' | 'backpack' | 'jetpack'
  backColor: string
}

/** Shorthand for new looks: sensible defaults, then the differences. */
function look(
  id: string,
  [es, ca, en]: [string, string, string],
  [bes, bca, ben]: [string, string, string],
  parts: Partial<Outfit>,
): Outfit {
  return {
    id,
    name: { es, ca, en },
    blurb: { es: bes, ca: bca, en: ben },
    hair: '#5a3a2a',
    hairLight: parts.hairLight ?? parts.hair ?? '#7a5a3a',
    hairStyle: 'swoop',
    top: '#83cdb0',
    stripe: null,
    collar: 'none',
    accent: '#ef6c5c',
    bottom: '#5479b0',
    bottomLight: '#6e93c6',
    bib: false,
    sock: '#fdf3dc',
    boot: '#8a5a3a',
    bootLight: '#a87048',
    sole: '#4a3020',
    hat: 'none',
    hatColor: '#000000',
    back: 'none',
    backColor: '#000000',
    ...parts,
  }
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
  ...[
    // id, es, ca, en, blurb es, blurb ca, blurb en, then the look.
    look('karate', ['Karateka', 'Karateka', 'Karate Kid'], [
      'Kimono blanco, cinturón negro y cinta roja. ¡Osu!',
      'Quimono blanc, cinturó negre i cinta vermella. Osu!',
      'White gi, black belt and a red headband. Osu!',
    ], { hair: '#2b2220', hairLight: '#463631', hairStyle: 'spiky', top: '#f7f4ec', collar: 'kimono', accent: '#1f1f1f', bottom: '#f1ede3', bottomLight: '#ffffff', sock: '#f7cba4', boot: '#f7cba4', bootLight: '#f9d6b5', sole: '#e6b08a', hat: 'headband', hatColor: '#d8443c' }),
    look('golden', ['Guerrero dorado', 'Guerrer daurat', 'Golden Warrior'], [
      'Pelo dorado en punta y ropa de entrenamiento: el poder de un héroe al máximo.',
      'Cabells daurats de punta i roba d’entrenament: el poder d’un heroi al màxim.',
      'Spiky golden hair and training gear: a hero at full power.',
    ], { hair: '#f6c63c', hairLight: '#fff09a', hairStyle: 'spiky', top: '#2f8f8a', stripe: '#f6f3ec', collar: 'kimono', accent: '#22343a', bottom: '#f6f3ec', bottomLight: '#ffffff', sock: '#2f8f8a', boot: '#24343a', bootLight: '#3a5058', sole: '#141c20', back: 'cape', backColor: '#f6f3ec' }),
    look('pirate', ['Pirata', 'Pirata', 'Pirate'], [
      'Tricornio, camisa de rayas y chaleco rojo. ¡Al abordaje!',
      'Tricorn, camisa de ratlles i armilla vermella. A l’abordatge!',
      'Tricorn hat, striped shirt and a red vest. All aboard!',
    ], { hair: '#5a3424', hairLight: '#7a4a34', hairStyle: 'long', top: '#f6f1e4', stripe: '#c83a3a', collar: 'none', accent: '#c83a3a', bottom: '#3b3f4f', bottomLight: '#4d5266', boot: '#2e2420', bootLight: '#46362e', sole: '#1c1512', hat: 'tricorn', hatColor: '#2a2626' }),
    look('astronaut', ['Astronauta', 'Astronauta', 'Astronaut'], [
      'Traje blanco, casco de cristal y propulsor a la espalda. Rumbo a las estrellas.',
      'Vestit blanc, casc de vidre i propulsor a l’esquena. Cap a les estrelles.',
      'White suit, glass helmet and a jetpack. Off to the stars.',
    ], { hair: '#6a4a32', hairStyle: 'swoop', top: '#f3f4f7', stripe: '#f08a3c', collar: 'none', accent: '#4f7fd6', bottom: '#e8eaf0', bottomLight: '#ffffff', sock: '#f3f4f7', boot: '#dfe2ea', bootLight: '#f3f4f7', sole: '#8a90a0', hat: 'helmet', hatColor: '#cfe7ff', back: 'jetpack', backColor: '#c9ced9' }),
    look('knight', ['Caballero', 'Cavaller', 'Knight'], [
      'Armadura plateada, yelmo con penacho y capa azul real.',
      'Armadura platejada, elm amb plomall i capa blau reial.',
      'Silver armour, a plumed helm and a royal blue cape.',
    ], { hair: '#b07a3a', hairStyle: 'swoop', top: '#c9d0da', stripe: '#9aa4b2', collar: 'none', accent: '#d9b44a', bottom: '#8d97a6', bottomLight: '#a9b2bf', sock: '#8d97a6', boot: '#6f7888', bootLight: '#8d97a6', sole: '#4a5260', hat: 'helmet', hatColor: '#b8c0cc', back: 'cape', backColor: '#2f56a8' }),
    look('princess', ['Princesa', 'Princesa', 'Princess'], [
      'Corona dorada, vestido rosa y melena larga de cuento.',
      'Corona daurada, vestit rosa i cabellera llarga de conte.',
      'A golden crown, a pink gown and storybook long hair.',
    ], { hair: '#f2c86a', hairLight: '#ffe29a', hairStyle: 'long', top: '#f59ab8', stripe: '#ffd9e6', collar: 'none', accent: '#ffffff', bottom: '#f7a8c2', bottomLight: '#ffc8da', sock: '#ffffff', boot: '#f2c86a', bootLight: '#ffe29a', sole: '#c99a3a', hat: 'crown', hatColor: '#f6c84a' }),
    look('king', ['Rey de la isla', 'Rei de l’illa', 'Island King'], [
      'Corona, capa roja de terciopelo y porte majestuoso.',
      'Corona, capa vermella de vellut i posat majestuós.',
      'A crown, a red velvet cape and a regal air.',
    ], { hair: '#6b4630', hairStyle: 'swoop', top: '#6a3fa0', stripe: '#f6c84a', collar: 'none', accent: '#f6c84a', bottom: '#4a2f78', bottomLight: '#5b3f8f', sock: '#ffffff', boot: '#3a2a52', bootLight: '#4c3868', sole: '#251a36', hat: 'crown', hatColor: '#f6c84a', back: 'cape', backColor: '#c8323a' }),
    look('chef', ['Chef', 'Xef', 'Chef'], [
      'Gorro alto, chaqueta blanca y pañuelo rojo. Hoy toca cocinar.',
      'Barret alt, jaqueta blanca i mocador vermell. Avui toca cuinar.',
      'Tall hat, white jacket and a red neckerchief. Time to cook.',
    ], { hair: '#4a3328', hairStyle: 'swoop', top: '#fbfbf7', collar: 'scarf', accent: '#d8443c', bottom: '#2f3440', bottomLight: '#424858', boot: '#2a2a2e', bootLight: '#404046', sole: '#151517', hat: 'chef', hatColor: '#ffffff' }),
    look('detective', ['Detective', 'Detectiu', 'Detective'], [
      'Gabardina beis, bufanda de cuadros y gorra de detective. Elemental.',
      'Gavardina beix, bufanda de quadres i gorra de detectiu. Elemental.',
      'Beige trench coat, a checked scarf and a deerstalker. Elementary.',
    ], { hair: '#3a2a22', hairStyle: 'swoop', top: '#c8a978', collar: 'scarf', accent: '#7a5a3a', bottom: '#5a4a3a', bottomLight: '#6c5a48', boot: '#4a3226', bootLight: '#5e4232', sole: '#2a1c14', hat: 'cap', hatColor: '#9a7a52' }),
    look('gamer', ['Gamer', 'Gamer', 'Gamer'], [
      'Gorra, sudadera morada y zapatillas fluorescentes. Una partida más.',
      'Gorra, dessuadora morada i vambes fluorescents. Una partida més.',
      'A cap, a purple hoodie and neon trainers. Just one more game.',
    ], { hair: '#2a2a33', hairStyle: 'spiky', top: '#6b4fd8', stripe: '#3be0b0', collar: 'none', accent: '#3be0b0', bottom: '#252833', bottomLight: '#353a48', sock: '#ffffff', boot: '#3be0b0', bootLight: '#8af2d2', sole: '#ffffff', hat: 'cap', hatColor: '#1f2230', back: 'backpack', backColor: '#2a2d3a' }),
    look('kitty', ['Gatito', 'Gatet', 'Kitty'], [
      'Orejas de gato, sudadera crema y patitas rosas. Miau.',
      'Orelles de gat, dessuadora crema i potetes roses. Miau.',
      'Cat ears, a cream hoodie and pink paws. Meow.',
    ], { hair: '#f2b673', hairLight: '#ffd39a', hairStyle: 'swoop', top: '#fff1dc', stripe: '#f2b673', collar: 'none', accent: '#f6a196', bottom: '#f2b673', bottomLight: '#ffd39a', sock: '#fff1dc', boot: '#f6a196', bootLight: '#ffc2b8', sole: '#e07a70', hat: 'ears', hatColor: '#f2b673' }),
    look('vampire', ['Vampiro', 'Vampir', 'Vampire'], [
      'Capa negra y roja, chaleco elegante y pelo engominado. Solo de noche.',
      'Capa negra i vermella, armilla elegant i cabells engominats. Només de nit.',
      'A black-and-red cape, a smart vest and slicked hair. Nights only.',
    ], { hair: '#1c1a22', hairLight: '#34303e', hairStyle: 'topknot', top: '#2a2430', stripe: null, collar: 'kimono', accent: '#c8323a', bottom: '#1f1b24', bottomLight: '#2f2936', sock: '#1f1b24', boot: '#141218', bootLight: '#26222c', sole: '#0a090c', back: 'cape', backColor: '#8a1c26' }),
    look('fairy', ['Hada del bosque', 'Fada del bosc', 'Forest Fairy'], [
      'Alas brillantes, vestido verde hoja y coletas de pétalo.',
      'Ales brillants, vestit verd fulla i cuetes de pètal.',
      'Shimmering wings, a leaf-green dress and petal twin tails.',
    ], { hair: '#8fd6a0', hairLight: '#c6f0cf', hairStyle: 'twintails', top: '#6fbf73', stripe: '#c6f0cf', collar: 'none', accent: '#f39ac4', bottom: '#8fd6a0', bottomLight: '#c6f0cf', sock: '#ffffff', boot: '#6fbf73', bootLight: '#9fdca2', sole: '#3f8a4a', back: 'wings', backColor: '#dff6ff' }),
    look('angel', ['Ángel', 'Àngel', 'Angel'], [
      'Aureola dorada, túnica blanca y alas de plumas suaves.',
      'Aurèola daurada, túnica blanca i ales de plomes suaus.',
      'A golden halo, a white robe and soft feathered wings.',
    ], { hair: '#f2d38a', hairLight: '#fff0c2', hairStyle: 'swoop', top: '#ffffff', stripe: '#f2d38a', collar: 'none', accent: '#f2d38a', bottom: '#f4f1ea', bottomLight: '#ffffff', sock: '#ffffff', boot: '#f2d38a', bootLight: '#fff0c2', sole: '#c9a84a', hat: 'halo', hatColor: '#f6d35a', back: 'wings', backColor: '#ffffff' }),
    look('mecha', ['Piloto de mecha', 'Pilot de mecha', 'Mecha Pilot'], [
      'Traje ajustado blanco y naranja, gafas y propulsor. ¡Sincronización al 100 %!',
      'Vestit cenyit blanc i taronja, ulleres i propulsor. Sincronització al 100 %!',
      'A white-and-orange plugsuit, goggles and a jetpack. 100% sync!',
    ], { hair: '#c84a3a', hairLight: '#e06a52', hairStyle: 'twintails', top: '#f6f3ec', stripe: '#f07a2a', collar: 'none', accent: '#2a2d3a', bottom: '#f07a2a', bottomLight: '#ff9a52', sock: '#f6f3ec', boot: '#f6f3ec', bootLight: '#ffffff', sole: '#2a2d3a', hat: 'goggles', hatColor: '#2a2d3a', back: 'jetpack', backColor: '#f6f3ec' }),
    look('fisher', ['Lobo de mar', 'Llop de mar', 'Old Salt'], [
      'Chubasquero amarillo, gorro de lana y botas de agua. Ideal para pescar.',
      'Impermeable groc, gorra de llana i botes d’aigua. Ideal per pescar.',
      'A yellow raincoat, a wool beanie and rain boots. Perfect for fishing.',
    ], { hair: '#8a5a3a', hairStyle: 'swoop', top: '#f6c32e', collar: 'none', accent: '#2a5d8a', bottom: '#2a5d8a', bottomLight: '#3a73a6', boot: '#f6c32e', bootLight: '#ffd966', sole: '#8a5a1a', hat: 'beanie', hatColor: '#2a5d8a' }),
    look('farmer', ['Granjero', 'Pagès', 'Farmer'], [
      'Sombrero de paja, camisa de cuadros y peto. Las cosechas de la isla, a punto.',
      'Barret de palla, camisa de quadres i pitet. Les collites de l’illa, a punt.',
      'A straw hat, a checked shirt and dungarees. Island harvests, ready.',
    ], { hair: '#a8622a', hairStyle: 'swoop', top: '#d8443c', stripe: '#f6e6d6', collar: 'none', accent: '#f6c84a', bottom: '#4f7aa8', bottomLight: '#6a94c2', bib: true, boot: '#6b4a32', bootLight: '#86603f', sole: '#3a2818', hat: 'straw', hatColor: '#e9c873' }),
    look('rocker', ['Rockera', 'Rockera', 'Rock Star'], [
      'Chupa de cuero, pelo rosa en punta y botas de plataforma.',
      'Jaqueta de cuir, cabells rosa de punta i botes de plataforma.',
      'A leather jacket, spiky pink hair and platform boots.',
    ], { hair: '#ff5fa2', hairLight: '#ff9ac6', hairStyle: 'spiky', top: '#2a2a2e', stripe: '#c8c8d0', collar: 'none', accent: '#ff5fa2', bottom: '#3a3a44', bottomLight: '#4c4c58', sock: '#ff5fa2', boot: '#1c1c20', bootLight: '#34343a', sole: '#ff5fa2' }),
    look('scientist', ['Científico loco', 'Científic boig', 'Mad Scientist'], [
      'Bata blanca, gafas de laboratorio y pelo alborotado. ¡Eureka!',
      'Bata blanca, ulleres de laboratori i cabells esbullats. Eureka!',
      'A lab coat, lab goggles and wild hair. Eureka!',
    ], { hair: '#e8e8ee', hairLight: '#ffffff', hairStyle: 'spiky', top: '#ffffff', stripe: null, collar: 'kimono', accent: '#4fb0d6', bottom: '#3a4a5a', bottomLight: '#4a5c6e', boot: '#3a2a22', bootLight: '#52403a', sole: '#1e1612', hat: 'goggles', hatColor: '#4fb0d6' }),
    look('winter', ['Invierno', 'Hivern', 'Winter'], [
      'Gorro con pompón, abrigo acolchado y bufanda gruesa. A por la nieve.',
      'Gorra amb pompó, abric encoixinat i bufanda gruixuda. A per la neu.',
      'A pompom beanie, a puffy coat and a chunky scarf. Bring on the snow.',
    ], { hair: '#5a3a2a', hairStyle: 'long', top: '#4fb0a8', stripe: '#e8f6f4', collar: 'scarf', accent: '#f6f1e4', bottom: '#3a4a6a', bottomLight: '#4a5c80', boot: '#8a5a3a', bootLight: '#f6f1e4', sole: '#4a3020', hat: 'beanie', hatColor: '#e0473b' }),
  ],
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
