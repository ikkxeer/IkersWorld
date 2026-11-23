import { anchors, type Zone } from '../data/village'
import { exhibitSpots } from '../data/exhibits'
export type Point = [number, number]
// Narrow colliders leave the spaces between the six pedestals walkable.
const ornaments: ([number, number] | [number, number, number])[] = [
  ...exhibitSpots,
  [2, 5.5],
  [0, 2],
  anchors.npc,
  [2.05, 8.72],
  [0.43, 8.3],
  [0.04, -3.17],
  [4.24, -4.02],
  [4.93, 1.98],
  // Campfire, its log seats, the well and the beach parasol (x, z, radius).
  [-0.45, 4.2, 0.55],
  [-1.28, 3.78, 0.24],
  [-1.23, 4.08, 0.24],
  [-1.18, 4.38, 0.24],
  [-0.05, 4.88, 0.24],
  [0.17, 4.68, 0.24],
  [0.39, 4.48, 0.24],
  [-0.87, 5.02, 0.24],
  [-0.57, 5.06, 0.24],
  [-0.27, 5.10, 0.24],
  [5.7, -4.9, 0.62],
  [12.15, 4.1, 0.25],
  [12.83, 4.3, 0.42],
]
const blocks: [Zone, number, number][] = [
  ['about', 2.05, 1.62],
  ['tech', 2.25, 1.7],
  ['journey', 2.05, 1.66],
  ['skills', 2.03, 1.52],
]
export function walkable(x: number, z: number) {
  if (Math.abs(x - 2.5) < 0.63 && z > 9.25 && z < 12.95) return true
  if (ornaments.some(([ox, oz, r = 0.32]) => (x - ox) ** 2 + (z - oz) ** 2 < r ** 2))
    return false
  if ((x / 14.8) ** 2 + (z / 9.8) ** 2 > 1) return false
  if (
    Math.abs(x + 2.5) < 1.05 &&
    Math.abs(z - 1) > 0.84 &&
    Math.abs(z - 6.5) > 0.84
  )
    return false
  return !blocks.some(
    ([id, w, d]) =>
      Math.abs(x - anchors[id][0]) < w && Math.abs(z - anchors[id][1]) < d,
  )
}
/** Short paths on a half-unit grid allow a click across the stream to find a bridge. */
export function route(from: Point, to: Point): Point[] {
  if (!walkable(...to)) return []
  const grid = (p: Point): Point => [Math.round(p[0] * 2), Math.round(p[1] * 2)]
  const key = (p: Point) => p.join(',')
  const origin = grid(from),
    goal = grid(to),
    end = key(goal)
  const queue: Point[] = [origin],
    parents = new Map<string, Point | null>([[key(origin), null]])
  for (let i = 0; i < queue.length; i++) {
    const v = queue[i]
    if (key(v) === end) {
      const result: Point[] = [to]
      let p: Point | null = v
      while (p && key(p) !== key(origin)) {
        result.unshift([p[0] / 2, p[1] / 2])
        p = parents.get(key(p)) ?? null
      }
      return result
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ]) {
      const n: Point = [v[0] + dx, v[1] + dz]
      if (
        parents.has(key(n)) ||
        !walkable(n[0] / 2, n[1] / 2) ||
        !walkable(n[0] / 2, v[1] / 2) ||
        !walkable(v[0] / 2, n[1] / 2)
      )
        continue
      parents.set(key(n), v)
      queue.push(n)
    }
  }
  return []
}
