import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  Coffee,
  Music2,
  Droplets,
  Fish,
  Flame,
  FlaskConical,
  Flower2,
  House,
  LocateFixed,
  Mail,
  Maximize,
  Minus,
  Navigation,
  PanelsTopLeft,
  Plus,
  Shirt,
  Swords,
  Telescope,
  TrainFront,
  TreePalm,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  tideOrgan,
  beach,
  bushSites,
  isPine,
  islet,
  pathways,
  pond,
  riverAt,
  riverWidthAt,
  shape,
  shrine,
  treeSites,
  tulipField,
} from '../data/island'
import { kindNames, placeKinds, places, type MapPlace, type PlaceIcon, type PlaceKind } from '../data/places'
import type { Lang } from '../data/village'

type XZ = [number, number]

const placeIcons: Record<PlaceIcon, LucideIcon> = {
  about: House,
  tech: FlaskConical,
  projects: PanelsTopLeft,
  journey: TrainFront,
  skills: Coffee,
  contact: Mail,
  fish: Fish,
  flame: Flame,
  swords: Swords,
  flower: Flower2,
  palm: TreePalm,
  telescope: Telescope,
  droplets: Droplets,
  shirt: Shirt,
  music: Music2,
}

/** The world's extent on the map (x across, z down). */
const WORLD = { x: -31.5, z: -16.5, w: 58, h: 36 }

const pts = (list: XZ[]) => list.map(([x, z]) => `${x.toFixed(2)},${z.toFixed(2)}`).join(' ')

function coastline(cx: number, cz: number, rx: number, rz: number, ripple: (a: number) => number, scale = 1, n = 96): XZ[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = ripple(a) * scale
    return [cx + Math.cos(a) * rx * k, cz + Math.sin(a) * rz * k] as XZ
  })
}
const mainRipple = (a: number) => 1 + 0.018 * Math.sin(a * 7) + 0.012 * Math.cos(a * 11) + 0.008 * Math.sin(a * 19)
const isletRipple = (a: number) => 1 + 0.03 * Math.sin(a * 5 + 1) + 0.02 * Math.cos(a * 7)
const main = (k: number) => coastline(0, 0, shape.coastX, shape.coastZ, mainRipple, k)
const isle = (k: number) => coastline(islet.center[0], islet.center[1], islet.coastX, islet.coastZ, isletRipple, k, 64)

const river: XZ[] = (() => {
  const left: XZ[] = [],
    right: XZ[] = []
  for (let z = -15.4; z <= 15.4; z += 0.4) {
    const flare = 1 + 1.3 * Math.max(0, Math.min(1, (Math.abs(z) - shape.lip - 0.5) / 2))
    const w = (riverWidthAt(z) + 0.12) * flare
    left.push([riverAt(z) - w, z])
    right.push([riverAt(z) + w, z])
  }
  return [...left, ...right.reverse()]
})()

/** Little painted grass triangles scattered over the lawns (world units). */
const grassFlecks = (() => {
  let seed = 9127
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
  const out: string[] = []
  const inside = (x: number, z: number) =>
    (x / (shape.coastX * 0.95)) ** 2 + (z / (shape.coastZ * 0.95)) ** 2 < 1 ||
    ((x - islet.center[0]) / (islet.coastX * 0.92)) ** 2 + ((z - islet.center[1]) / (islet.coastZ * 0.92)) ** 2 < 1
  for (let i = 0; i < 900; i++) {
    const x = WORLD.x + rand() * WORLD.w,
      z = WORLD.z + rand() * WORLD.h
    if (!inside(x, z) || Math.abs(x - riverAt(z)) < riverWidthAt(z) + 0.3) continue
    const s = 0.12 + rand() * 0.1,
      a = rand() * Math.PI * 2
    const p = [0, 1, 2].map((k) => {
      const t = a + (k * Math.PI * 2) / 3
      return `${(x + Math.cos(t) * s).toFixed(2)},${(z + Math.sin(t) * s).toFixed(2)}`
    })
    out.push(`M${p[0]}L${p[1]}L${p[2]}Z`)
  }
  return out.join('')
})()

const plaza: XZ[] = [
  [-8.6, 2.65],
  [-7.99, 2.33],
  [-4.23, 2.42],
  [-3.56, 2.87],
  [-3.56, 5.83],
  [-4.23, 6.27],
  [-7.94, 6.29],
  [-8.54, 5.76],
]

/**
 * The painted map itself: sea, sand, lawns, the stream, paths, trees and
 * buildings, drawn from the same data as the 3D island.
 */
export const AtlasArt = memo(function AtlasArt({ detail = true }: { detail?: boolean }) {
  return (
    <g className="atlas-art">
      <rect x={WORLD.x - 20} y={WORLD.z - 20} width={WORLD.w + 40} height={WORLD.h + 40} fill="url(#atlas-sea)" />
      {detail && <rect x={WORLD.x - 20} y={WORLD.z - 20} width={WORLD.w + 40} height={WORLD.h + 40} fill="url(#atlas-waves)" />}
      {/* Shallows and foam */}
      <polygon points={pts(main(1.16))} fill="#8fd9cf" opacity="0.55" />
      <polygon points={pts(isle(1.2))} fill="#8fd9cf" opacity="0.55" />
      <polygon className="atlas-foam" points={pts(main(1.1))} fill="none" stroke="#f4fffb" strokeWidth="0.12" opacity="0.7" />
      <polygon className="atlas-foam" points={pts(isle(1.12))} fill="none" stroke="#f4fffb" strokeWidth="0.1" opacity="0.7" />
      {/* Sand, cliffs and lawn */}
      <polygon points={pts(main(1.06))} fill="#f3d7a2" />
      <polygon points={pts(isle(1.07))} fill="#f3d7a2" />
      <polygon points={pts(main(1.0))} fill="#d9a96c" />
      <polygon points={pts(isle(1.0))} fill="#d9a96c" />
      <polygon points={pts(main(0.975))} fill="#9cca6e" />
      <polygon points={pts(isle(0.97))} fill="#9cca6e" />
      {detail && <path d={grassFlecks} className="atlas-flecks" />}
      {/* Water */}
      <polygon points={pts(river)} fill="#6cc4c6" />
      {detail && <polyline points={pts(river.slice(0, river.length / 2).map(([x, z]) => [x + riverWidthAt(z) * 0.9, z]))} fill="none" stroke="#bff0e8" strokeWidth="0.07" strokeDasharray="0.6 0.9" className="atlas-flow" />}
      <ellipse cx={pond.center[0]} cy={pond.center[1]} rx={pond.radius} ry={pond.radius} fill="#5fb7b2" stroke="#cfc4b0" strokeWidth="0.22" />
      {/* Fields, beach and plaza */}
      <rect x={tulipField.center[0] - tulipField.width / 2 - 0.3} y={tulipField.center[1] - tulipField.depth / 2 - 0.3} width={tulipField.width + 0.6} height={tulipField.depth + 0.6} rx="0.4" fill="#b98a5e" />
      {detail &&
        ['#f26d6d', '#f6c24d', '#f39ac4', '#fffaf0', '#b49ae6'].map((c, i) => (
          <line key={c} x1={tulipField.center[0] - tulipField.width / 2} x2={tulipField.center[0] + tulipField.width / 2} y1={tulipField.center[1] - tulipField.depth / 2 + (i * tulipField.depth) / 4} y2={tulipField.center[1] - tulipField.depth / 2 + (i * tulipField.depth) / 4} stroke={c} strokeWidth="0.2" strokeDasharray="0.15 0.27" strokeLinecap="round" />
        ))}
      <ellipse cx={beach.center[0]} cy={beach.center[1]} rx={beach.radiusX} ry={beach.radiusZ} fill="#f5e2b6" />
      {pathways.map(({ pts: line, width }, i) => (
        <polyline key={i} points={pts(line)} fill="none" stroke="#ead2a1" strokeWidth={width * 0.9} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      <polygon points={pts(plaza)} fill="#e6d3a6" />
      <circle cx={shrine.center[0]} cy={shrine.center[1]} r={shrine.radius + 0.1} fill="#e6dccb" stroke="#b9ad9c" strokeWidth="0.15" />
      <circle cx={shrine.center[0]} cy={shrine.center[1]} r={0.45} fill="none" stroke="#d9534a" strokeWidth="0.12" />
      {/* Bridges and the pier */}
      {[1, 6.5].map((z) => (
        <rect key={z} x={riverAt(z) - 1.45} y={z - 0.72} width={2.9} height={1.44} rx="0.15" fill="#c99a62" stroke="#8a5a3a" strokeWidth="0.08" />
      ))}
      <path d={`M ${tideOrgan.bridgeStart} ${tideOrgan.center[1]} H ${tideOrgan.center[0]}`} stroke="#bc9364" strokeWidth={tideOrgan.bridgeWidth} />
      <circle cx={tideOrgan.center[0]} cy={tideOrgan.center[1]} r={tideOrgan.radius} fill="#b7895d" stroke="#876648" strokeWidth=".12" />
      {tideOrgan.pads.map(p => <circle key={p.hz} cx={p.x} cy={p.z} r=".42" fill={p.color} />)}
      <rect x={islet.bridgeTo - 0.2} y={islet.bridgeZ - islet.bridgeWidth / 2} width={islet.bridgeFrom - islet.bridgeTo + 0.4} height={islet.bridgeWidth} rx="0.15" fill="#c99a62" stroke="#8a5a3a" strokeWidth="0.08" />
      <rect x={1.6} y={shape.pierFrom} width={1.8} height={shape.pierTo - shape.pierFrom} rx="0.12" fill="#c99a62" stroke="#8a5a3a" strokeWidth="0.08" />
      {/* Trees and shrubs */}
      {detail &&
        bushSites.map(([x, z], i) => <circle key={'b' + i} cx={x} cy={z} r={0.42} fill="#7fb468" stroke="#5f9550" strokeWidth="0.06" />)}
      {treeSites.map(([x, z], i) => (
        <g key={'t' + i}>
          <circle cx={x + 0.12} cy={z + 0.14} r={0.78} fill="#00000018" />
          <circle cx={x} cy={z} r={0.72} fill={isPine(i) ? '#4f8d6d' : i % 7 === 5 ? '#f2a7b8' : '#6fa758'} />
          <circle cx={x - 0.2} cy={z - 0.22} r={0.35} fill={isPine(i) ? '#66a374' : i % 7 === 5 ? '#fbd5dc' : '#9fcb6c'} opacity="0.9" />
        </g>
      ))}
      {shrine.sakura.map(([x, z], i) => (
        <g key={'s' + i}>
          <circle cx={x} cy={z} r={0.7} fill="#f2a7b8" />
          <circle cx={x - 0.2} cy={z - 0.2} r={0.32} fill="#fbd5dc" />
        </g>
      ))}
      {shrine.spires.map(([x, z], i) => (
        <circle key={'r' + i} cx={x} cy={z} r={0.55} fill="#b8aa96" stroke="#8f826f" strokeWidth="0.08" />
      ))}
      {/* Lighthouse */}
      <circle cx={11.5} cy={-5.75} r={0.75} fill="#f3eadb" stroke="#c84a3a" strokeWidth="0.25" />
    </g>
  )
})

export function AtlasDefs() {
  return (
    <defs>
      <linearGradient id="atlas-sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fd0d2" />
        <stop offset="1" stopColor="#5db8c0" />
      </linearGradient>
      <pattern id="atlas-waves" width="3.2" height="2.2" patternUnits="userSpaceOnUse">
        <path d="M0.3 1.1 q0.4 -0.35 0.8 0 t0.8 0" fill="none" stroke="#c8f2ec" strokeWidth="0.07" strokeLinecap="round" opacity="0.55" />
      </pattern>
      <pattern id="atlas-grass" width="2.4" height="2.4" patternUnits="userSpaceOnUse">
        <path d="M0.4 0.6 l0.18 -0.3 l0.18 0.3z" fill="#7fb35d" opacity="0.6" />
        <path d="M1.5 1.6 l0.18 -0.3 l0.18 0.3z" fill="#bfe08a" opacity="0.7" />
        <path d="M1.8 0.4 l0.15 -0.25 l0.15 0.25z" fill="#f2a45e" opacity="0.5" />
      </pattern>
    </defs>
  )
}

/** A small, non-interactive version for the HUD button. */
export function AtlasMini({ position }: { position?: XZ }) {
  return (
    <svg className="atlas-mini" viewBox={`${WORLD.x} ${WORLD.z} ${WORLD.w} ${WORLD.h}`} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <AtlasDefs />
      <AtlasArt detail={false} />
      {places
        .filter((p) => p.kind === 'building')
        .map((p) => (
          <circle key={p.id} cx={p.at[0]} cy={p.at[1]} r={0.9} fill={p.color} stroke="#fff8e7" strokeWidth="0.3" />
        ))}
      {position && <circle className="atlas-me-mini" cx={position[0]} cy={position[1]} r={1.05} />}
    </svg>
  )
}

type View = { x: number; z: number; zoom: number }
const clampView = (v: View): View => ({
  zoom: Math.min(5, Math.max(1, v.zoom)),
  x: Math.min(WORLD.x + WORLD.w, Math.max(WORLD.x, v.x)),
  z: Math.min(WORLD.z + WORLD.h, Math.max(WORLD.z, v.z)),
})
const home: View = { x: WORLD.x + WORLD.w / 2, z: WORLD.z + WORLD.h / 2, zoom: 1 }

export interface AtlasText {
  travel: string
  open: string
  here: string
  all: string
  zoomIn: string
  zoomOut: string
  recenter: string
  reset: string
  hint: string
  close: string
}

/**
 * The full interactive map: pan and zoom the painted island, filter places,
 * pick one for its card and travel there.
 */
export default function Atlas({
  lang,
  position,
  text,
  canTravel,
  onVisit,
}: {
  lang: Lang
  position: XZ
  text: AtlasText
  /** In light mode only buildings can be "visited" (their panel opens). */
  canTravel: boolean
  onVisit: (place: MapPlace) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>(home)
  const target = useRef<View | null>(null)
  const [filter, setFilter] = useState<PlaceKind | 'all'>('all')
  const [selected, setSelected] = useState<MapPlace | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [size, setSize] = useState({ w: 1, h: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ moved: number } | null>(null)
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const observer = new ResizeObserver(() => setSize({ w: el.clientWidth || 1, h: el.clientHeight || 1 }))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // The viewBox keeps the world's aspect and fits the element.
  const box = useMemo(() => {
    const aspect = size.w / size.h
    let w = WORLD.w / view.zoom,
      h = WORLD.h / view.zoom
    if (w / h > aspect) h = w / aspect
    else w = h * aspect
    return { x: view.x - w / 2, z: view.z - h / 2, w, h }
  }, [view, size])
  const unitsPerPixel = box.w / size.w

  // Smoothly glide towards a target view (focus on a place, recentre).
  const animate = useCallback(
    (next: View) => {
      if (reduced) {
        setView(clampView(next))
        return
      }
      target.current = clampView(next)
      let frame = 0
      const step = () => {
        const goal = target.current
        if (!goal) return
        setView((v) => {
          const k = 0.18
          const n = { x: v.x + (goal.x - v.x) * k, z: v.z + (goal.z - v.z) * k, zoom: v.zoom + (goal.zoom - v.zoom) * k }
          if (Math.abs(n.x - goal.x) < 0.02 && Math.abs(n.z - goal.z) < 0.02 && Math.abs(n.zoom - goal.zoom) < 0.005) {
            target.current = null
            return goal
          }
          return n
        })
        if (target.current) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
      return () => cancelAnimationFrame(frame)
    },
    [reduced],
  )

  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      target.current = null
      setView((v) => {
        const zoom = Math.min(5, Math.max(1, v.zoom * factor))
        if (clientX === undefined || clientY === undefined || !svg.current) return clampView({ ...v, zoom })
        // Keep the point under the cursor fixed while zooming.
        const r = svg.current.getBoundingClientRect()
        const px = box.x + ((clientX - r.left) / r.width) * box.w
        const pz = box.z + ((clientY - r.top) / r.height) * box.h
        const k = v.zoom / zoom
        return clampView({ zoom, x: px + (v.x - px) * k, z: pz + (v.z - pz) * k })
      })
    },
    [box],
  )

  useEffect(() => {
    const el = svg.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [zoomAt])

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    drag.current = { moved: 0 }
    target.current = null
  }
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    if (!(e.target as Element).hasPointerCapture?.(e.pointerId) && pointers.current.size === 1 && drag.current && drag.current.moved > 4)
      svg.current?.setPointerCapture(e.pointerId)
    if (pointers.current.size === 2) {
      // Pinch to zoom.
      const [a, b] = [...pointers.current.values()]
      const before = Math.hypot(a.x - b.x, a.y - b.y)
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const [c, d] = [...pointers.current.values()]
      const after = Math.hypot(c.x - d.x, c.y - d.y)
      if (before > 0) zoomAt(after / before, (c.x + d.x) / 2, (c.y + d.y) / 2)
      return
    }
    const dx = e.clientX - prev.x,
      dy = e.clientY - prev.y
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (drag.current) drag.current.moved += Math.abs(dx) + Math.abs(dy)
    setView((v) => clampView({ ...v, x: v.x - dx * unitsPerPixel, z: v.z - dy * unitsPerPixel }))
  }
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
  }

  const pick = (place: MapPlace, fromList = false) => {
    if (!fromList && drag.current && drag.current.moved > 6) return
    setSelected(place)
    animate({ x: place.at[0], z: place.at[1] + 2 / Math.max(view.zoom, 2.2), zoom: Math.max(view.zoom, 2.2) })
  }

  const visible = places.filter((p) => filter === 'all' || p.kind === filter)
  const pinScale = Math.max(0.4, Math.min(1.05, unitsPerPixel * 17))
  const showLabels = view.zoom > 1.45

  return (
    <div className="atlas">
      <div className="atlas-stage">
        <svg
          ref={svg}
          className="atlas-svg"
          viewBox={`${box.x} ${box.z} ${box.w} ${box.h}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onDoubleClick={(e) => zoomAt(1.8, e.clientX, e.clientY)}
          role="application"
          aria-label={text.hint}
        >
          <AtlasDefs />
          <AtlasArt />
          {visible.map((place) => {
            const Icon = placeIcons[place.icon]
            const active = selected?.id === place.id || hovered === place.id
            return (
              <g
                key={place.id}
                className={'atlas-pin' + (active ? ' on' : '') + ' kind-' + place.kind}
                transform={`translate(${place.at[0]} ${place.at[1]}) scale(${pinScale})`}
                onClick={() => pick(place)}
                onPointerEnter={() => setHovered(place.id)}
                onPointerLeave={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={place.name[lang]}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    pick(place)
                  }
                }}
              >
                <ellipse cx="0" cy="0.15" rx="0.9" ry="0.35" fill="#0000002a" />
                <path d="M0 0 C-0.9 -1.2 -1.45 -1.9 -1.45 -2.6 A1.45 1.45 0 1 1 1.45 -2.6 C1.45 -1.9 0.9 -1.2 0 0Z" fill={place.color} stroke="#fffaf0" strokeWidth="0.22" />
                <Icon x={-0.82} y={-3.42} width={1.64} height={1.64} color="#fffaf0" strokeWidth={2.4} />
                {(showLabels || active) && (
                  <text className="atlas-label" x="0" y="1.25" textAnchor="middle">
                    {place.name[lang]}
                  </text>
                )}
              </g>
            )
          })}
          <g className="atlas-me" transform={`translate(${position[0]} ${position[1]}) scale(${pinScale})`}>
            <circle className="atlas-me-pulse" r="1.6" />
            <circle r="0.62" fill="#ef6c5c" stroke="#fffaf0" strokeWidth="0.26" />
            <text className="atlas-label me" x="0" y="-1.1" textAnchor="middle">
              {text.here}
            </text>
          </g>
        </svg>
        <div className="atlas-filters" role="toolbar">
          {(['all', ...placeKinds] as const).map((k) => (
            <button key={k} className={filter === k ? 'on' : ''} aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {k === 'all' ? text.all : kindNames[k][lang]}
            </button>
          ))}
        </div>
        <div className="atlas-tools">
          <button onClick={() => zoomAt(1.4)} aria-label={text.zoomIn} title={text.zoomIn}>
            <Plus size={18} />
          </button>
          <button onClick={() => zoomAt(1 / 1.4)} aria-label={text.zoomOut} title={text.zoomOut}>
            <Minus size={18} />
          </button>
          <button onClick={() => animate({ x: position[0], z: position[1], zoom: 2.6 })} aria-label={text.recenter} title={text.recenter}>
            <LocateFixed size={18} />
          </button>
          <button onClick={() => animate(home)} aria-label={text.reset} title={text.reset}>
            <Maximize size={18} />
          </button>
        </div>
        <div className="atlas-compass" aria-hidden="true">
          <Navigation size={16} />
          <b>N</b>
        </div>
        {selected && (
          <div className="atlas-card" style={{ '--pin': selected.color } as CSSProperties}>
            <span className="atlas-card-icon">
              {(() => {
                const Icon = placeIcons[selected.icon]
                return <Icon size={24} />
              })()}
            </span>
            <div>
              <small>{kindNames[selected.kind][lang]}</small>
              <b>{selected.name[lang]}</b>
              <p>{selected.blurb[lang]}</p>
              {(canTravel || selected.zone) && (
                <button className="primary small" onClick={() => onVisit(selected)}>
                  {canTravel ? text.travel : text.open}
                </button>
              )}
            </div>
            <button className="atlas-card-close" onClick={() => setSelected(null)} aria-label={text.close}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      <aside className="atlas-list">
        {placeKinds.map((kind) => (
          <section key={kind}>
            <h3>{kindNames[kind][lang]}</h3>
            {places
              .filter((p) => p.kind === kind)
              .map((place) => {
                const Icon = placeIcons[place.icon]
                return (
                  <button
                    key={place.id}
                    className={selected?.id === place.id ? 'on' : ''}
                    onClick={() => pick(place, true)}
                    onPointerEnter={() => setHovered(place.id)}
                    onPointerLeave={() => setHovered(null)}
                  >
                    <span style={{ background: place.color }}>
                      <Icon size={16} />
                    </span>
                    {place.name[lang]}
                  </button>
                )
              })}
          </section>
        ))}
      </aside>
    </div>
  )
}
