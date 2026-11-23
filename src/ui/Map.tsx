import { useEffect, useRef } from 'react'
import {
  House,
  FlaskConical,
  PanelsTopLeft,
  TrainFront,
  Coffee,
  Mail,
} from 'lucide-react'
import {
  anchors,
  copy,
  placeKeys,
  zones,
  type Lang,
  type Zone,
} from '../data/village'
const icons = {
  about: House,
  tech: FlaskConical,
  projects: PanelsTopLeft,
  journey: TrainFront,
  skills: Coffee,
  contact: Mail,
}
const colors = {
  about: '#d5814a',
  tech: '#418875',
  projects: '#ba7750',
  journey: '#616b99',
  skills: '#a8676b',
  contact: '#548c98',
}
export function ZoneIcon({ id, size = 20 }: { id: Zone; size?: number }) {
  const Icon = icons[id]
  return <Icon size={size} strokeWidth={2.2} />
}
function xy(x: number, z: number) {
  return [100 + x * 4.38, 68 + z * 3.88]
}
/** The strokes below were drawn for the original, smaller island. */
function remap([px, py]: number[]) {
  return xy((px - 100) / 5.45, (py - 68) / 4.9)
}
function cartography(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const c = ctx
  const scale = 3
  canvas.width = 200 * scale
  canvas.height = 136 * scale
  c.scale(scale, scale)
  c.fillStyle = '#a3dcd4'
  c.fillRect(0, 0, 200, 136)
  let seed = 3844
  function rnd() {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  c.lineWidth = 0.9
  c.strokeStyle = '#ceeee1'
  for (let i = 0; i < 140; i++) {
    const x = rnd() * 200,
      y = rnd() * 136
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + 2, y + 0.8, x + 4, y)
    c.stroke()
  }
  function shore(dx: number, dy: number, color: string, factor: number) {
    c.beginPath()
    for (let i = 0; i <= 100; i++) {
      const a = (i / 100) * 2 * Math.PI,
        k = 1 + 0.055 * Math.sin(a * 5) + 0.035 * Math.cos(a * 7)
      const x = 100 + Math.cos(a) * 82 * k * factor + dx,
        y = 65 + Math.sin(a) * 50 * k * factor + dy
      if (!i) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.closePath()
    c.fillStyle = color
    c.fill()
  }
  shore(0, 4, '#6bbcb7', 1.05)
  shore(0, 3, '#e5b97a', 1.01)
  shore(0, 0, '#f0d59b', 1)
  shore(0, -2, '#a3c577', 0.94)
  function line(points: number[][], color: string, width: number) {
    c.beginPath()
    points.map(remap).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.lineCap = 'round'
    c.lineJoin = 'round'
    c.lineWidth = width
    c.strokeStyle = color
    c.stroke()
  }
  // The stream crosses the whole island, coast to coast.
  const stream: number[][] = []
  for (let z = -14.4; z <= 14.4; z += 0.8)
    stream.push(xy(-2.5 + Math.sin(z * 0.64) * 0.14 + Math.sin(z * 0.28) * 0.12, z))
  c.beginPath()
  stream.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.lineCap = 'round'
  c.lineWidth = 6
  c.strokeStyle = '#77c5c4'
  c.stroke()
  line(
    [
      [52, 55],
      [70, 72],
      [98, 71],
      [115, 85],
      [148, 85],
    ],
    '#e9d397',
    4,
  )
  line(
    [
      [105, 42],
      [100, 68],
      [131, 69],
      [149, 57],
    ],
    '#e9d397',
    4,
  )
  line(
    [
      [60, 82],
      [65, 99],
      [97, 98],
      [111, 86],
      [117, 109],
    ],
    '#e9d397',
    3,
  )
  for (const z of [1, 6.5]) {
    const [bx, by] = xy(-3.7, z)
    c.fillStyle = '#956f40'
    c.fillRect(bx, by - 2, 11, 4)
    c.fillStyle = '#f0cb8e'
    for (let j = 0; j < 4; j++) c.fillRect(bx + 1 + j * 2.5, by - 2, 1.6, 4)
  }
  // The long pier reaching south from the beach.
  const [qx, qy] = xy(2.5, 12.9)
  c.fillStyle = '#b98d59'
  c.fillRect(qx - 2, qy, 4, 18)
  for (let i = 0; i < 54; i++) {
    const a = rnd() * Math.PI * 2,
      r = 0.75 + rnd() * 0.15,
      x = 100 + Math.cos(a) * 77 * r,
      y = 62 + Math.sin(a) * 45 * r
    c.fillStyle = '#5b9a6e'
    c.beginPath()
    c.arc(x, y, 2.2, 0, 7)
    c.fill()
    c.fillStyle = '#83b46d'
    c.beginPath()
    c.arc(x - 0.5, y - 1, 1.7, 0, 7)
    c.fill()
  }
  for (const id of zones) {
    const [x, y] = xy(...anchors[id])
    c.fillStyle = '#fff2cc'
    c.fillRect(x - 4, y - 2, 8, 6)
    c.fillStyle = colors[id]
    c.beginPath()
    c.moveTo(x - 6, y - 1)
    c.lineTo(x, y - 6)
    c.lineTo(x + 6, y - 1)
    c.fill()
  }
}
export default function VillageMap({
  lang,
  position,
  mini = false,
  visit,
}: {
  lang: Lang
  position?: [number, number]
  mini?: boolean
  visit?: (id: Zone) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) cartography(ref.current)
  }, [])
  const p = position ? xy(...position) : null
  return (
    <div className={'chart ' + (mini ? 'mini' : 'atlas')}>
      <canvas aria-hidden="true" ref={ref} />
      {!mini &&
        zones.map((id) => {
          const [x, y] = xy(...anchors[id])
          return (
            <button
              key={id}
              style={{
                left: x / 2 + '%',
                top: y / 1.36 + '%',
                background: colors[id],
              }}
              className="pin"
              onClick={() => visit?.(id)}
              aria-label={copy[lang][placeKeys[id]]}
              title={copy[lang][placeKeys[id]]}
            >
              <ZoneIcon id={id} size={16} />
            </button>
          )
        })}
      {p && (
        <i
          className="player-dot"
          style={{ left: p[0] / 2 + '%', top: p[1] / 1.36 + '%' }}
        />
      )}
    </div>
  )
}
