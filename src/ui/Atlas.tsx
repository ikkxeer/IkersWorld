import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  Coffee,
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
import { AtlasArt, AtlasDefs } from './AtlasArt'
import { WORLD, kindNames, placeKinds, places, type MapPlace, type PlaceIcon, type PlaceKind } from '../data/places'
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
