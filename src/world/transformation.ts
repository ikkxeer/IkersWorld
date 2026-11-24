import * as T from 'three'
import { softDot } from './ambience'

export const ruptureTime = 2.8
export const transformationEnd = 5.9
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
      const charge = smooth(time, .25, 2.5)
      const reveal = smooth(age, .07, .38) * (1 - smooth(time, 4.5, transformationEnd))
      const cloudOpacity = age < 0 ? charge : 1 - smooth(age, .02, .56)
      light.intensity = reduced ? 3 * reveal : 2.2 * charge * cloudOpacity + 6.5 * reveal + 11 * (1 - smooth(Math.abs(age), 0, .24))
      smoke.forEach(({ puff, angle, delay, speed }, i) => {
        puff.visible = cloudOpacity > .01
        if (!puff.visible) return
        const rise = (time * .56 * speed + delay) % 1
        const scatter = smooth(age, 0, .65) * (2.5 + delay * 2.8)
        const swirl = angle + Math.min(time, ruptureTime) * (reduced ? .75 : 3.25) + rise
        const radius = .27 + rise * .44 + delay * .42 + scatter
        puff.position.set(Math.cos(swirl) * radius, .18 + rise * 2.15 + scatter * (.05 + delay * .11), Math.sin(swirl) * radius)
        puff.scale.setScalar((.77 + rise * .86) * (.55 + charge * .54) * (1 + scatter * .14))
        puff.material.rotation = swirl + i
        puff.material.opacity = cloudOpacity * (.6 + delay * .34) * (reduced ? .68 : 1)
      })
      flash.visible = !reduced && age >= -.035 && age <= .19
      flash.material.opacity = flash.visible ? 1 - smooth(age, .02, .19) : 0
      flash.scale.setScalar(2.5 + clamp(age * 6) * 5)
      waves.forEach((wave, i) => {
        const pulse = age - i * .105
        wave.visible = pulse >= 0 && pulse < .94
        wave.material.opacity = wave.visible ? (1 - smooth(pulse, .05, .94)) * (reduced ? .28 : .87) : 0
        wave.scale.setScalar(.18 + Math.max(0, pulse) * (6.7 + i))
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

export function frameTransformation(time: number, reduced: boolean, x: number, y: number, z: number, focus: T.Vector3, offset: T.Vector3, aspect: number, span: number) {
  const weight = smooth(time, 0, .58) * (1 - smooth(time, 5, transformationEnd))
  const push = smooth(time, 2.41, ruptureTime)
  const orbit = smooth(time, 2.94, 4.78)
  const yaw = Math.atan2(8, 27) + (reduced ? 0 : orbit * tau * .82)
  const shot = new T.Vector3(Math.sin(yaw) * 2.0, mix(-.56, .36, orbit), Math.cos(yaw) * 2.0)
  offset.lerp(shot, weight)
  focus.lerp(shot.set(x, y + mix(1.05, 1.12, push), z), weight)
  if (!reduced) {
    const tremor = .031 * smooth(time, .4, 2.55) * (1 - smooth(time, ruptureTime, 3.2))
    offset.x += Math.sin(time * 73) * tremor
    offset.y += Math.cos(time * 58) * tremor * .67
  }
  const wide = aspect < .8 ? 2.05 : 1.63
  const zoom = reduced ? wide : mix(wide, wide * .66, push * (1 - orbit))
  return mix(span, zoom, weight)
}
