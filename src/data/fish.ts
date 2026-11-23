import type { Lang } from './village'

/**
 * What bites off the end of the pier. Every catch is a little nod to a tool
 * Iker works with, so fishing doubles as a light-hearted tour of his stack.
 */
export interface FishKind {
  id: string
  /** Body and fin colours of the 3D fish. */
  colors: [string, string]
  /** Typical length in centimetres. */
  size: [number, number]
  /** Relative chance of biting. */
  weight: number
  name: Record<Lang, string>
  quip: Record<Lang, string>
}

export const fishKinds: FishKind[] = [
  {
    id: 'java',
    colors: ['#e0874a', '#f6c98b'],
    size: [24, 48],
    weight: 10,
    name: { es: 'Besugo Java', ca: 'Besuc Java', en: 'Java Bream' },
    quip: {
      es: 'Un clásico: programación orientada a peces.',
      ca: 'Un clàssic: programació orientada a peixos.',
      en: 'A classic: fish-oriented programming.',
    },
  },
  {
    id: 'typescript',
    colors: ['#3d79c7', '#a9cdf2'],
    size: [18, 36],
    weight: 9,
    name: { es: 'Pez TypeScript', ca: 'Peix TypeScript', en: 'TypeScript Fish' },
    quip: {
      es: 'Viene con todos sus tipos bien definidos.',
      ca: 'Ve amb tots els tipus ben definits.',
      en: 'Comes with all its types neatly defined.',
    },
  },
  {
    id: 'react',
    colors: ['#59c6de', '#d9f6ff'],
    size: [10, 22],
    weight: 8,
    name: { es: 'Medusa React', ca: 'Medusa React', en: 'React Jellyfish' },
    quip: {
      es: 'Se vuelve a renderizar cada vez que la miras.',
      ca: 'Es torna a renderitzar cada cop que la mires.',
      en: 'Re-renders every time you look at it.',
    },
  },
  {
    id: 'python',
    colors: ['#3b6fa3', '#f2cf5b'],
    size: [40, 90],
    weight: 7,
    name: { es: 'Anguila Python', ca: 'Anguila Python', en: 'Python Eel' },
    quip: {
      es: 'No muerde, pero automatiza todo lo que toca.',
      ca: 'No mossega, però automatitza tot el que toca.',
      en: "Doesn't bite, but automates everything it touches.",
    },
  },
  {
    id: 'sql',
    colors: ['#ef7f4b', '#fff4e6'],
    size: [8, 14],
    weight: 7,
    name: { es: 'Pez payaso SQL', ca: 'Peix pallasso SQL', en: 'SQL Clownfish' },
    quip: {
      es: 'Siempre hace JOIN con su banco de peces.',
      ca: 'Sempre fa JOIN amb el seu banc de peixos.',
      en: 'Always JOINs its school.',
    },
  },
  {
    id: 'github',
    colors: ['#4a4f5a', '#d8dde6'],
    size: [30, 70],
    weight: 6,
    name: { es: 'Atún GitHub', ca: 'Tonyina GitHub', en: 'GitHub Tuna' },
    quip: {
      es: 'Tiene muchas ramas… y ningún conflicto.',
      ca: 'Té moltes branques… i cap conflicte.',
      en: 'Lots of branches… and zero conflicts.',
    },
  },
  {
    id: 'powershell',
    colors: ['#2b5797', '#bcd3f2'],
    size: [20, 40],
    weight: 5,
    name: { es: 'Pez globo PowerShell', ca: 'Peix globus PowerShell', en: 'PowerShell Pufferfish' },
    quip: {
      es: 'Se infla de scripts en cuanto algo se repite dos veces.',
      ca: "S'infla d'scripts quan alguna cosa es repeteix dues vegades.",
      en: 'Puffs up with scripts the moment anything repeats twice.',
    },
  },
  {
    id: 'android',
    colors: ['#6fbf4f', '#e0f5c8'],
    size: [26, 52],
    weight: 4,
    name: { es: 'Trucha Android', ca: 'Truita Android', en: 'Android Trout' },
    quip: {
      es: 'Se adapta a cualquier tamaño de pecera.',
      ca: "S'adapta a qualsevol mida de peixera.",
      en: 'Adapts to any tank size.',
    },
  },
  {
    id: 'coelacanth',
    colors: ['#4d5e8c', '#c7d3ec'],
    size: [120, 180],
    weight: 1,
    name: { es: 'Celacanto legacy', ca: 'Celacant legacy', en: 'Legacy Coelacanth' },
    quip: {
      es: '¡Rarísimo! Nadie sabe quién lo escribió, pero sigue funcionando.',
      ca: 'Raríssim! Ningú sap qui el va escriure, però continua funcionant.',
      en: "Super rare! Nobody knows who wrote it, but it still runs.",
    },
  },
]

export function pickFish(random: () => number) {
  const total = fishKinds.reduce((sum, f) => sum + f.weight, 0)
  let roll = random() * total
  for (const kind of fishKinds) {
    roll -= kind.weight
    if (roll <= 0) return kind
  }
  return fishKinds[0]
}

const storageKey = 'ikers-world-fish'
export function loadCaught(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]'))
  } catch {
    return new Set()
  }
}
export function saveCaught(caught: Set<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...caught]))
  } catch {
    /* Private sessions simply forget the collection. */
  }
}
