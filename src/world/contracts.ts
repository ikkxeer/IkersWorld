import type { Place, Zone } from '../data/village'
import type { AnglerUpdate } from './fishing'
export type { AnglerUpdate }
export type Interior = 'about' | 'tech' | false
/** 'campfire' is handled in-world (the visitor sits down), never as a panel. */
export type Target = Place | 'radio' | 'exit' | 'campfire' | 'fishing' | 'wardrobe' | 'bench' | 'lookout' | 'rise' | 'dojo' | 'gong'
export interface VillageEvents {
  open: (place: Place | 'radio', project?: number) => void
  position: (
    x: number,
    z: number,
    near: Target | null,
    project?: number,
  ) => void
  hover: (place: Target | null, project?: number) => void
  inside: (value: Interior) => void
  fail: () => void
  /** Progress of the fishing activity, for the HUD. */
  angler?: (update: AnglerUpdate) => void
  /** A popped gift balloon reveals one of the projects. */
  gift?: (project: number) => void
  /** The visitor has touched down on the island (end of the arrival). */
  landed?: () => void
  /** The visitor opened the wardrobe in Iker's house. */
  wardrobe?: () => void
}
export interface VillageController {
  pause: (value: boolean) => void
  zoom: (delta: number) => void
  travel: (place: Zone, arrived?: () => void) => void
  /** Travel to any walkable spot, facing `look` (map places and activities). */
  goTo: (stand: [number, number], look: [number, number], arrived?: () => void) => void
  transitioning: () => boolean
  touch: (x: number, y: number) => void
  leave: () => void
  interact: () => void
  /** Leave the title screen: wipe to the arrival through the clouds. */
  start: () => void
  /** Change outfit (with a twirl, or instantly when restoring a saved look). */
  wear: (outfit: string, instant?: boolean) => void
  dispose: () => void
}

export interface VillageView {
  signs: (HTMLElement | null)[]
  exhibit: HTMLElement | null
  iris: HTMLElement | null
  /** Begin on the title screen: the camera circles the island and waits. */
  title?: boolean
  /** Outfit to start in. */
  outfit?: string
}
