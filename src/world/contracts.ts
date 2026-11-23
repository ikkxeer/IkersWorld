import type { Place, Zone } from '../data/village'
import type { AnglerUpdate } from './fishing'
export type { AnglerUpdate }
export type Interior = 'about' | 'tech' | false
/** 'campfire' is handled in-world (the visitor sits down), never as a panel. */
export type Target = Place | 'exit' | 'campfire' | 'fishing'
export interface VillageEvents {
  open: (place: Place, project?: number) => void
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
}
export interface VillageController {
  pause: (value: boolean) => void
  zoom: (delta: number) => void
  travel: (place: Zone, arrived?: () => void) => void
  transitioning: () => boolean
  touch: (x: number, y: number) => void
  leave: () => void
  interact: () => void
  dispose: () => void
}

export interface VillageView {
  signs: (HTMLElement | null)[]
  exhibit: HTMLElement | null
  iris: HTMLElement | null
}
