import * as T from 'three'
import { fishKinds, loadCaught, pickFish, saveCaught, type FishKind } from '../data/fish'
import type { Angler, Emote } from './character'

export type AnglerUpdate =
  | { stage: 'waiting' }
  | { stage: 'bite' }
  | { stage: 'caught'; fish: string; size: number; isNew: boolean; count: number; total: number }
  | { stage: 'lost'; reason: 'early' | 'late' }
  | { stage: 'done' }

type Stage = 'idle' | 'cast' | 'flight' | 'wait' | 'bite' | 'show' | 'lost'

/**
 * Fishing off the end of the pier, the way island life sims do it: cast,
 * watch a shadow circle the bobber, ignore the nibbles and strike on the
 * real bite. Catches are tools from Iker's stack and fill a little collection.
 */
export function createFishing(options: {
  angler: Angler
  emote: (kind: Emote) => void
  report: (update: AnglerUpdate) => void
  waterY: number
  random?: () => number
}) {
  const { angler, emote, report, waterY } = options
  const random = options.random ?? Math.random
  const group = new T.Group()
  group.name = 'fishing'
  group.visible = false

  const bobber = new T.Group()
  const red = new T.Mesh(new T.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: '#ec5a4c', roughness: 0.5 }))
  const white = new T.Mesh(new T.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new T.MeshStandardMaterial({ color: '#fdf7ec', roughness: 0.5 }))
  const pin = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.08, 5), new T.MeshStandardMaterial({ color: '#f6c34d' }))
  pin.position.y = 0.1
  bobber.add(red, white, pin)
  group.add(bobber)

  const linePoints = Array.from({ length: 14 }, () => new T.Vector3())
  const lineGeometry = new T.BufferGeometry().setFromPoints(linePoints)
  const line = new T.Line(lineGeometry, new T.LineBasicMaterial({ color: '#fdfaf2', transparent: true, opacity: 0.85 }))
  line.frustumCulled = false
  group.add(line)

  const ringMaterial = new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })
  const rings = Array.from({ length: 3 }, () => {
    const ring = new T.Mesh(new T.RingGeometry(0.8, 1, 28), ringMaterial.clone())
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    group.add(ring)
    return { ring, age: 1, size: 1 }
  })
  let nextRing = 0
  function ripple(x: number, z: number, size: number) {
    const r = rings[nextRing]
    nextRing = (nextRing + 1) % rings.length
    r.ring.position.set(x, waterY + 0.02, z)
    r.age = 0
    r.size = size
    r.ring.visible = true
  }
  const splashDrops = Array.from({ length: 8 }, () => {
    const drop = new T.Mesh(new T.SphereGeometry(0.035, 6, 4), new T.MeshBasicMaterial({ color: '#e8fbff', transparent: true }))
    drop.visible = false
    group.add(drop)
    return { drop, v: new T.Vector3(), age: 1 }
  })
  function splash(x: number, z: number) {
    splashDrops.forEach((d, i) => {
      const a = (i / splashDrops.length) * Math.PI * 2
      d.drop.position.set(x, waterY + 0.05, z)
      d.v.set(Math.cos(a) * 0.9, 2.2 + random() * 0.8, Math.sin(a) * 0.9)
      d.age = 0
      d.drop.visible = true
    })
    ripple(x, z, 0.9)
  }

  const shadow = new T.Mesh(
    new T.CircleGeometry(1, 16),
    new T.MeshBasicMaterial({ color: '#173f4a', transparent: true, opacity: 0, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  group.add(shadow)

  let stage: Stage = 'idle'
  let timer = 0
  const target = new T.Vector3()
  const tip = new T.Vector3()
  const from = new T.Vector3()
  let fish: FishKind = fishKinds[0]
  let fishAngle = 0
  let fishDistance = 2.4
  let nibbles = 0
  let nextNibble = 0
  let dip = 0
  let approachTime = 3
  const caught = loadCaught()

  function finish() {
    stage = 'idle'
    group.visible = false
    angler.hold(false)
    angler.show(null)
    report({ stage: 'done' })
  }

  return {
    group,
    active: () => stage !== 'idle',
    stage: () => stage,
    /** Cast towards `facing` (yaw) from `origin`. */
    begin(origin: T.Vector3, facing: number) {
      if (stage !== 'idle') return
      target.set(
        origin.x + Math.sin(facing) * 3.2 + (random() - 0.5) * 1.2,
        waterY,
        origin.z + Math.cos(facing) * 3.2 + (random() - 0.5) * 0.6,
      )
      angler.show(null)
      angler.hold(true)
      angler.cast()
      stage = 'cast'
      timer = 0
      group.visible = true
      bobber.visible = false
      line.visible = false
      shadow.material.opacity = 0
    },
    /** E / click / tap while fishing. Returns true when it was handled. */
    press() {
      if (stage === 'wait') {
        if (nibbles > 0 || fishDistance < 0.9) {
          // Too eager: the fish darts away.
          stage = 'lost'
          timer = 0
          report({ stage: 'lost', reason: 'early' })
        } else finish()
        return true
      }
      if (stage === 'bite') {
        const size = Math.round(fish.size[0] + random() * (fish.size[1] - fish.size[0]))
        const isNew = !caught.has(fish.id)
        caught.add(fish.id)
        saveCaught(caught)
        splash(bobber.position.x, bobber.position.z)
        angler.tug()
        angler.show(fish.colors, 0.85 + 0.5 * ((size - fish.size[0]) / (fish.size[1] - fish.size[0] || 1)))
        stage = 'show'
        timer = 0
        bobber.visible = false
        line.visible = false
        shadow.material.opacity = 0
        report({ stage: 'caught', fish: fish.id, size, isNew, count: caught.size, total: fishKinds.length })
        return true
      }
      if (stage === 'show') {
        finish()
        return true
      }
      return stage !== 'idle'
    },
    cancel() {
      if (stage !== 'idle') finish()
    },
    update(dt: number, time: number) {
      // Ripples and splash drops live on regardless of stage.
      for (const r of rings) {
        if (!r.ring.visible) continue
        r.age += dt / 1.1
        if (r.age >= 1) r.ring.visible = false
        r.ring.scale.setScalar(0.1 + r.age * 0.5 * r.size)
        r.ring.material.opacity = 0.7 * (1 - r.age)
      }
      for (const d of splashDrops) {
        if (!d.drop.visible) continue
        d.age += dt / 0.6
        d.v.y -= 9 * dt
        d.drop.position.addScaledVector(d.v, dt)
        if (d.age >= 1 || d.drop.position.y < waterY) d.drop.visible = false
      }
      if (stage === 'idle') return
      timer += dt
      angler.tip(tip)

      if (stage === 'cast' && timer > 0.42) {
        stage = 'flight'
        timer = 0
        from.copy(tip)
        bobber.visible = true
        line.visible = true
      }
      if (stage === 'flight') {
        const t = Math.min(1, timer / 0.5)
        bobber.position.lerpVectors(from, target, t)
        bobber.position.y += Math.sin(Math.PI * t) * 1.3
        if (t >= 1) {
          stage = 'wait'
          timer = 0
          ripple(target.x, target.z, 0.6)
          fish = pickFish(random)
          fishAngle = random() * Math.PI * 2
          fishDistance = 2.6
          nibbles = 1 + Math.floor(random() * 3)
          approachTime = 2.2 + random() * 2.5
          nextNibble = 0
          report({ stage: 'waiting' })
        }
      }
      if (stage === 'wait' || stage === 'bite' || stage === 'lost') {
        // The bobber floats, dips on nibbles and plunges on the bite.
        dip = Math.max(0, dip - dt * 1.4)
        const plunge = stage === 'bite' ? 0.13 + 0.03 * Math.sin(time * 30) : 0
        bobber.position.set(target.x, waterY + 0.03 * Math.sin(time * 2.2) - dip - plunge, target.z)
      }
      if (stage === 'wait') {
        const approach = Math.min(1, timer / approachTime)
        fishDistance = 2.6 - 2.1 * approach * approach + (approach >= 1 ? 0 : 0)
        fishAngle += dt * 0.25 * (1 - approach)
        if (approach >= 1) {
          if (timer > nextNibble) {
            if (nibbles > 0) {
              nibbles--
              dip = 0.06
              ripple(target.x, target.z, 0.35)
              nextNibble = timer + 0.75 + random() * 0.9
            } else {
              stage = 'bite'
              timer = 0
              splash(target.x, target.z)
              emote('alert')
              report({ stage: 'bite' })
            }
          }
          fishDistance = 0.4 + 0.08 * Math.sin(time * 5)
        }
      } else if (stage === 'bite' && timer > 0.95) {
        stage = 'lost'
        timer = 0
        report({ stage: 'lost', reason: 'late' })
      }
      if (stage === 'lost') {
        fishDistance += dt * 3.5
        if (timer > 1.1) finish()
      }
      if (stage === 'show' && timer > 3.2) finish()

      // The fish's shadow circles in, nose towards the bobber.
      const showShadow = stage === 'wait' || stage === 'bite' || stage === 'lost'
      const fade = stage === 'lost' ? Math.max(0, 1 - timer) : Math.min(1, timer * 1.5)
      shadow.material.opacity = showShadow ? 0.36 * fade : 0
      if (showShadow) {
        const scale = 0.55 + 0.55 * ((fish.size[0] + fish.size[1]) / 2) / 100
        shadow.position.set(target.x + Math.cos(fishAngle) * fishDistance, waterY + 0.015, target.z + Math.sin(fishAngle) * fishDistance)
        shadow.scale.set(0.16 * scale, 0.42 * scale, 1)
        shadow.rotation.z = -fishAngle + Math.PI / 2 + Math.sin(time * 6) * 0.15
      }

      // A fishing line that sags gently between rod tip and bobber.
      if (line.visible) {
        const end = bobber.position
        const sag = stage === 'flight' ? 0.05 : stage === 'bite' ? 0.02 : 0.35
        linePoints.forEach((p, i) => {
          const t = i / (linePoints.length - 1)
          p.lerpVectors(tip, end, t)
          p.y -= Math.sin(Math.PI * t) * sag
        })
        lineGeometry.setFromPoints(linePoints)
      }
    },
  }
}
