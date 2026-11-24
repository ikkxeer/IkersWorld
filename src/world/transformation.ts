import * as T from 'three'
import { softDot } from './ambience'

export const fistTime = 1.55
export const wideTime = 3
export const vortexTime = 4.65
export const ruptureTime = 8.6
export const transformationEnd = 14.2
const smooth = T.MathUtils.smoothstep
const mix = T.MathUtils.lerp
const tau = Math.PI * 2
const clamp = (n: number) => T.MathUtils.clamp(n, 0, 1)

export function createTransformation(scene: T.Scene, x: number, floor: number, z: number, low: boolean) {
  const group = new T.Group()
  group.position.set(x, floor, z)
  group.name = 'training effects'
  scene.add(group)
  const cloud = softDot('rgba(255,255,255,1)', 'rgba(255,255,255,0.74)')
  const smoke = Array.from({ length: low ? 46 : 68 }, (_, index) => {
    const material = new T.SpriteMaterial({
      map: cloud, color: index % 4 === 0 ? '#88716e' : index % 3 === 0 ? '#bca493' : '#544858',
      depthWrite: false, fog: false,
    })
    const puff = new T.Sprite(material)
    group.add(puff)
    return { puff, angle: index * 2.39996, delay: (index * .618) % 1, speed: .83 + (index % 8) * .074 }
  })
  const flash = new T.Sprite(new T.SpriteMaterial({
    map: cloud, color: '#fff6cf', depthTest: false, blending: T.AdditiveBlending, depthWrite: false, fog: false,
  }))
  flash.position.y = 1.05
  flash.renderOrder = 6
  group.add(flash)

  const waveGeometry = new T.RingGeometry(.89, 1, 72)
  const waves = ['#fff0af', '#ffba57', '#fffaf0'].map(color => {
    const wave = new T.Mesh(waveGeometry, new T.MeshBasicMaterial({
      color, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
    }))
    wave.rotation.x = -Math.PI / 2
    wave.position.y = .05
    group.add(wave)
    return wave
  })
  const light = new T.PointLight('#ffbd56', 0, 10, 1.55)
  light.position.y = 1.14
  group.add(light)

  const arcs = Array.from({ length: low ? 4 : 7 }, () => {
    const positions = new Float32Array(8 * 3)
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3))
    const arc = new T.Line(geometry, new T.LineBasicMaterial({
      color: '#fff4a3', transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    }))
    arc.frustumCulled = false
    group.add(arc)
    return arc
  })
  const flameShape = new T.Shape()
  flameShape.moveTo(-.26, 0)
  flameShape.quadraticCurveTo(-.46, .43, .15, 1.28)
  flameShape.quadraticCurveTo(.04, .92, .24, .61)
  flameShape.quadraticCurveTo(.43, .23, .12, 0)
  flameShape.closePath()
  const flameGeometry = new T.ShapeGeometry(flameShape)
  const flames = Array.from({ length: 12 }, (_, i) => {
    const flame = new T.Mesh(flameGeometry, new T.MeshBasicMaterial({
      color: i % 2 ? '#ffc24d' : '#fff4a8', transparent: true, side: T.DoubleSide,
      depthWrite: false, blending: T.AdditiveBlending,
    }))
    const ribbon = new T.Group()
    ribbon.rotation.y = i / 12 * tau
    flame.position.z = .7
    ribbon.add(flame)
    group.add(ribbon)
    return flame
  })
  group.visible = false

  return {
    update(time: number | null, reduced: boolean) {
      group.visible = time !== null
      if (time === null) {
        light.intensity = 0
        return
      }
      const age = time - ruptureTime
      const charge = smooth(time, vortexTime - .35, ruptureTime - .5)
      const reveal = smooth(age, .07, .38) * (1 - smooth(time, 12.55, transformationEnd))
      const cloudOpacity = age < 0 ? charge : 1 - smooth(age, .01, .69)
      light.intensity = reduced ? 3 * reveal : 2.2 * charge * cloudOpacity + 4.8 * reveal + 11 * (1 - smooth(Math.abs(age), 0, .24))
      smoke.forEach(({ puff, angle, delay, speed }, i) => {
        puff.visible = cloudOpacity > .01
        if (!puff.visible) return
        const rise = (time * .56 * speed + delay) % 1
        const scatter = smooth(age, 0, .72) * (3.7 + delay * 3.8)
        const swirl = angle + Math.min(time, ruptureTime) * (reduced ? .48 : 3.1 + charge * .46) + rise
        const radius = .27 + rise * .44 + delay * .42 + scatter
        puff.position.set(Math.cos(swirl) * radius, .14 + rise * (.35 + charge * 1.80) + scatter * (.05 + delay * .11), Math.sin(swirl) * radius)
        puff.scale.setScalar((.77 + rise * .86) * (.55 + charge * .54) * (1 + scatter * .14))
        puff.material.rotation = swirl + i
        puff.material.opacity = cloudOpacity * (.6 + delay * .34) * (reduced ? .68 : 1)
      })
      flash.visible = !reduced && age >= -.035 && age <= .19
      flash.material.opacity = flash.visible ? 1 - smooth(age, .02, .19) : 0
      flash.scale.setScalar(2.5 + clamp(age * 6) * 5)
      waves.forEach((wave, i) => {
        const pulse = age - i * .105
        wave.visible = pulse >= 0 && pulse < 1.22
        wave.material.opacity = wave.visible ? (1 - smooth(pulse, .08, 1.22)) * (reduced ? .28 : .87) : 0
        wave.scale.setScalar(.18 + Math.max(0, pulse) * (8.3 + i))
      })
      flames.forEach((flame, i) => {
        const rise = (time * 1.45 + i / flames.length) % 1
        flame.visible = reveal > .02
        flame.position.y = rise * .76
        flame.rotation.z = Math.sin(time * 12 + i) * .19
        flame.scale.set(.6 + rise * .46, .9 + rise * 1.18, 1)
        flame.material.opacity = reveal * (1 - rise) * (reduced ? .28 : .55)
      })
      arcs.forEach((arc, i) => {
        const beat = Math.floor(time * 12 + i * 1.72)
        arc.visible = !reduced && reveal > .15 && (beat + i) % 5 < 3
        if (!arc.visible) return
        const positions = arc.geometry.getAttribute('position')
        const angle = i * 2.4 + beat * .28
        for (let j = 0; j < positions.count; j++) {
          const offset = j / (positions.count - 1)
          const radius = .58 + Math.sin(j * 2.8 + beat) * .17 + .16 * offset
          positions.setXYZ(j, Math.cos(angle + offset) * radius, .14 + offset * (1.6 + i * .09), Math.sin(angle + offset) * radius)
        }
        positions.needsUpdate = true
        arc.material.opacity = reveal * .9
      })
    },
  }
}

/** The detail shots are cuts. The orbit, punch-in and reveal share a continuous rig. */
export function frameTransformation(
  time: number, reduced: boolean, center: T.Vector3, face: T.Vector3, fists: T.Vector3,
  heading: number, focus: T.Vector3, offset: T.Vector3, aspect: number, span: number,
) {
  const entry = smooth(time, 0, .34)
  const exit = 1 - smooth(time, 12.8, transformationEnd)
  const weight = entry * exit
  const age = time - ruptureTime
  const wide = aspect < .8 ? 2.13 : 1.91
  const angle = heading + (reduced ? 0 : tau * smooth(time, vortexTime, 8.17))
  const zoomIn = smooth(time, 8.22, ruptureTime)
  const pullOut = smooth(age, .055, .63)
  let yaw = angle
  let range = mix(2, 1.16, zoomIn * (1 - pullOut))
  let height = mix(.46, -.38, pullOut)
  let zoom = mix(wide, .57, zoomIn * (1 - pullOut))
  const target = new T.Vector3(center.x, center.y + 1.03, center.z)
  if (!reduced && time < wideTime) {
    // Shot 1–2: extreme close-ups, the face, then the clenched fists.
    const faceShot = time < fistTime
    target.copy(faceShot ? face : fists)
    yaw = heading + (faceShot ? .11 : -.48)
    range = faceShot ? 1.28 : 1.15
    height = faceShot ? .08 : .17
    zoom = faceShot ? (aspect < .8 ? .62 : .43) : (aspect < .8 ? .65 : .39)
  } else if (!reduced && time < vortexTime) {
    // Shot 3: cut far away, a high wide of the islet as the air starts to stir,
    // slowly pushing in.
    const k = smooth(time, wideTime, vortexTime)
    yaw = heading + 2.2 - k * .35
    range = 3
    height = mix(2.6, 2.1, k)
    zoom = mix(wide * 2.15, wide * 1.6, k)
    target.y = center.y + .7
  } else if (reduced) {
    zoom = wide
    range = 2
    height = .55
  } else if (time >= ruptureTime) {
    target.y = center.y + 1.05
    if (age < 1.05) {
      // Shot 6: the explosion from one side, low and wide, drifting.
      yaw = heading + 1.35 + age * .25
      range = 2.2
      height = -.25
      zoom = mix(wide * .9, wide * 1.15, smooth(age, 0, 1.05))
    } else if (age < 2.1) {
      // Shot 7: hard cut to the other side, high, looking down into the blast.
      const k = smooth(age, 1.05, 2.1)
      yaw = heading - 1.6 - k * .3
      range = 2
      height = 2.3
      zoom = mix(wide * 1.25, wide * 1.05, k)
    } else if (age < 3.5) {
      // Shot 8: heroic low angle, close on the transformed visitor.
      const k = smooth(age, 2.1, 3.5)
      yaw = heading + .25 - k * .2
      range = 1.5
      height = -.42
      zoom = mix(wide * .62, wide * .74, k)
      target.y = center.y + 1.12
    } else {
      // Shot 9: crane up and away to a high aerial before handing back.
      const k = smooth(age, 3.5, transformationEnd - ruptureTime)
      yaw = heading + .25 + k * .6
      range = 2.6
      height = mix(.6, 2.6, k)
      zoom = mix(wide * 1.1, wide * 2.3, k)
      target.y = center.y + .8
    }
  }
  focus.lerp(target, weight)
  offset.lerp(target.set(Math.sin(yaw) * range, height, Math.cos(yaw) * range), weight)
  if (!reduced) {
    const strain = .010 + .062 * smooth(time, vortexTime, ruptureTime)
    const shock = age >= 0 ? .113 * (1 - smooth(age, 0, .5)) : 0
    const tremor = (strain * (1 - smooth(age, 0, .5)) + shock) * entry
    offset.x += Math.sin(time * 63) * tremor
    offset.y += Math.cos(time * 51) * tremor * .65
  }
  return mix(span, zoom, weight)
}
