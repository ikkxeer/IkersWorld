import { memo } from 'react'
import {
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
import { places, WORLD } from '../data/places'

type XZ = [number, number]

/** The world's extent on the map (x across, z down). */

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

