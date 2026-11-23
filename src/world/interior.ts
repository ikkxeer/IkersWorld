import * as T from 'three'
import { Batch, ModelKit, wood, timber, trim } from './modelKit'
import { stations } from '../data/gallery'
import { pickable } from './village'

export function makeInterior() {
  const scene = new T.Scene()
  scene.background = new T.Color('#477f75')
  const kit = new ModelKit()
  const room = new Batch(kit)
  room.block([0, -0.24, 0], [8.5, 0.46, 6.2], timber, [0, 0, 0], true)
  for (let i = 0; i < 14; i++)
    room.block(
      [-3.9 + i * 0.6, -0.03, 0],
      [0.59, 0.08, 6],
      i % 3 ? '#d9aa75' : '#cca06c',
    )
  room.block([0, 1.52, -3], [8.45, 3.1, 0.2], '#d7e4bc', [0, 0, 0], true)
  room.block([-4.15, 1.52, 0], [0.2, 3.1, 6], '#c8d6a6', [0, 0, 0], true)
  for (const x of [-2.65, 0.05, 2.65]) {
    room.block([x, 1.92, -2.85], [1.4, 1.3, 0.18], timber, [0, 0, 0], true)
    room.block(
      [x, 1.92, -2.735],
      [1.23, 1.12, 0.085],
      '#a7d7d7',
      [0, 0, 0],
      false,
      kit.glass,
    )
    room.block([x, 1.92, -2.67], [0.07, 1.2, 0.05], trim)
    room.block([x, 1.92, -2.67], [1.3, 0.07, 0.05], trim)
  }
  room.block([0, 0.045, 0.1], [3.45, 0.055, 2.53], '#438377', [0, 0, 0], true)
  room.block([0, 0.077, 0.1], [3.06, 0.025, 2.13], '#76aa90', [0, 0, 0], true)
  room.block([-2.95, 0.31, -0.45], [1.2, 0.52, 2.3], '#a97660', [0, 0, 0], true)
  room.block(
    [-2.95, 0.66, -0.46],
    [1.06, 0.34, 2.1],
    '#dfaa81',
    [0, 0, 0],
    true,
  )
  room.block(
    [-3.43, 0.92, -0.45],
    [0.25, 1.0, 2.26],
    '#b87564',
    [0, 0, 0],
    true,
  )
  for (const z of [-1.07, 0.04])
    room.block(
      [-2.98, 0.84, z],
      [0.48, 0.35, 0.56],
      '#f7d278',
      [0, -0.24, 0.1],
      true,
    )
  room.block([2.77, 0.67, -2.18], [2, 0.13, 0.8], wood, [0, 0, 0], true)
  for (const x of [1.95, 3.57])
    room.block([x, 0.31, -2.17], [0.14, 0.64, 0.64], timber)
  room.block([2.77, 1.04, -2.4], [0.88, 0.55, 0.12], '#385751', [0, 0, 0], true)
  room.block([2.77, 1.06, -2.33], [0.74, 0.42, 0.032], '#81c4b1')
  room.block([2.77, 0.755, -2.02], [0.61, 0.045, 0.22], '#b7c6aa')
  for (const [x, z] of [
    [-3.5, 2.18],
    [3.5, 1.93],
  ]) {
    room.cylinder([x, 0.29, z], 0.38, 0.23, 0.55, '#bc775f', 12)
    for (let i = 0; i < 6; i++) {
      const theta = (i * Math.PI) / 3
      room.ball(
        [
          x + Math.cos(theta) * 0.25,
          0.85 + (i % 2) * 0.17,
          z + Math.sin(theta) * 0.25,
        ],
        [0.23, 0.46, 0.17],
        i % 2 ? '#91b773' : '#678e63',
        1,
        [0.35, theta, 0.26],
      )
    }
  }
  // Cosy touches: wainscoting, a wall clock, framed pictures and a reading lamp.
  room.block([0, 0.32, -2.885], [8.4, 0.58, 0.03], '#c3d29f')
  room.block([0, 0.62, -2.86], [8.4, 0.07, 0.07], trim, [0, 0, 0], true)
  room.block([-4.035, 0.32, 0], [0.03, 0.58, 5.9], '#b8c893')
  room.block([-4.01, 0.62, 0], [0.07, 0.07, 5.9], trim, [0, 0, 0], true)
  room.cylinder([1.35, 2.28, -2.86], 0.24, 0.24, 0.07, timber, 18, [Math.PI / 2, 0, 0])
  room.cylinder([1.35, 2.28, -2.82], 0.2, 0.2, 0.03, '#fbf1da', 18, [Math.PI / 2, 0, 0])
  room.block([1.35, 2.34, -2.8], [0.025, 0.13, 0.012], '#5b4436')
  room.block([1.4, 2.28, -2.8], [0.1, 0.022, 0.012], '#5b4436')
  for (const [z, w, colour] of [
    [-1.05, 0.56, '#f3b57c'],
    [0.05, 0.42, '#8fc7c1'],
    [-0.5, 0.3, '#e7a1a6'],
  ] as const) {
    const y = z === -0.5 ? 2.55 : 2.05
    room.block([-4.02, y, z], [0.05, w + 0.12, w], timber, [0, 0, 0], true)
    room.block([-3.99, y, z], [0.02, w, w - 0.12], colour)
    room.ball([-3.975, y - w * 0.12, z], [0.01, w * 0.2, w * 0.28], '#fff6df', 0)
  }
  const shade = new T.MeshStandardMaterial({
    vertexColors: true,
    emissive: '#ffcf80',
    emissiveIntensity: 0.85,
  })
  room.cylinder([3.35, 0.04, 0.4], 0.2, 0.22, 0.06, timber, 12)
  room.stick([3.35, 0.05, 0.4], [3.35, 1.5, 0.4], 0.025, '#6b4f3c', 6)
  room.cylinder([3.35, 1.62, 0.4], 0.17, 0.28, 0.32, '#fde8b6', 14, [0, 0, 0], shade)
  const lampLight = new T.PointLight('#ffc77d', 3, 4.5, 1.6)
  lampLight.position.set(3.35, 1.45, 0.4)
  scene.add(lampLight)
  const album = new Batch(kit)
  album.cylinder([0, 0.42, 0], 0.53, 0.53, 0.14, wood, 20)
  album.cylinder([0, 0.2, 0], 0.14, 0.21, 0.4, timber, 12)
  album.block([0, 0.54, 0], [0.49, 0.09, 0.36], '#d48152', [0, -0.25, 0], true)
  album.block(
    [0, 0.56, 0.03],
    [0.46, 0.045, 0.31],
    '#ffffd7',
    [0, -0.25, 0],
    true,
  )
  const profile = pickable(album.finish(), 'about', 0.12, -1.62)
  return finishRoom(scene, room, [profile])
}

function finishRoom(scene: T.Scene, room: Batch, objects: T.Group[]) {
  const kit = room.kit
  const exit = new Batch(kit)
  exit.block([0, 0.04, 0], [1.72, 0.09, 0.52], '#efb864', [0, 0, 0], true)
  for (const side of [-1, 1])
    exit.stick([side * 0.39, 0.1, -0.02], [0, 0.1, 0.22], 0.035, '#835a44')
  const door = pickable(exit.finish(), 'exit', 0, 2.6)
  const sun = new T.DirectionalLight('#ffe4ad', 2.4)
  sun.position.set(3, 8, 5)
  scene.add(
    room.finish(),
    ...objects,
    door,
    sun,
    new T.HemisphereLight('#fff5d6', '#d9a580', 2),
  )
  kit.clearTemplates()
  return { scene, interactives: [...objects, door] }
}

export function makeGallery() {
  const scene = new T.Scene()
  scene.background = new T.Color('#365b64')
  const kit = new ModelKit()
  const shell = new Batch(kit)
  shell.block([0, -0.17, 0], [8.6, 0.34, 6.2], timber, [0, 0, 0], true)
  for (let x = -3; x <= 3; x++)
    for (let z = -2; z <= 2; z++)
      shell.block([x * 1.19, 0, z * 1.18], [1.17, 0.025, 1.16],
        (x + z) % 2 ? '#b4bfb2' : '#c7ccba')
  shell.block([0, 1.48, -2.94], [8.45, 3, 0.2], '#426169')
  shell.block([-4.14, 0.65, 0], [0.17, 1.3, 5.9], '#618381')
  shell.block([0, 2.93, -2.78], [8.48, 0.14, 0.28], wood)
  const objects = stations.map((station, i) => {
    const x = (i - 1) * 2.65
    const bench = new Batch(kit)
    // Each alcove has its own accent, a workbench and a working model.
    shell.block([x, 1.58, -2.79], [2.39, 2.22, 0.1], '#2b454d', [0, 0, 0], true)
    shell.block([x, 2.58, -2.68], [1.98, 0.07, 0.12], station.color)
    for (const dx of [-0.83, 0.83])
      bench.block([dx, 0.36, 0], [0.16, 0.72, 0.73], timber)
    bench.block([0, 0.76, 0], [2.22, 0.16, 1.05], wood, [0, 0, 0], true)
    bench.block([0, 0.74, 0.54], [2.12, 0.1, 0.05], station.color)
    if (i === 0) {
      bench.block([0, 1.05, -0.12], [0.16, 0.45, 0.14], timber)
      bench.block([0, 1.45, -0.15], [1.58, 0.94, 0.15], '#263f49', [0, 0, 0], true)
      bench.block([0, 1.45, -0.05], [1.38, 0.74, 0.04], station.color)
      bench.block([-0.39, 1.44, 0], [0.4, 0.46, 0.05], '#396d75')
      for (const y of [1.33, 1.54]) bench.block([0.22, y, 0], [0.61, 0.085, 0.04], '#f7edbd')
      bench.block([0, 0.86, 0.26], [0.96, 0.05, 0.29], '#43595a')
    } else if (i === 1) {
      for (const y of [1, 1.3, 1.6]) {
        bench.cylinder([-0.48, y, 0], 0.37, 0.37, 0.24, station.color, 24)
        bench.block([0.46, y, 0], [0.82, 0.24, 0.56], '#40545c', [0, 0, 0], true)
        bench.ball([0.66, y, 0.3], [0.06, 0.04, 0.02], '#a0d399')
      }
    } else {
      bench.cylinder([0, 0.96, 0], 0.4, 0.48, 0.23, '#3b5058', 20)
      bench.stick([0, 1.03, 0], [-0.39, 1.65, 0], 0.15, station.color)
      bench.stick([-0.39, 1.65, 0], [0.46, 1.9, 0], 0.12, station.color)
      for (const [dx, y] of [[0, 1.09], [-0.39, 1.65], [0.46, 1.9]])
        bench.ball([dx, y, 0], [0.16, 0.16, 0.17], '#475663', 1)
      for (const side of [-1, 1])
        bench.stick([0.46, 1.85, 0], [0.46 + side * 0.16, 1.58, 0], 0.048, '#efc179')
    }
    const display = pickable(bench.finish(), 'tech', x, -1.78, i)
    const plaque = document.createElement('canvas')
    plaque.width = 384
    plaque.height = 96
    const ink = plaque.getContext('2d')!
    ink.fillStyle = '#20383e'
    ink.fillRect(0, 0, plaque.width, plaque.height)
    ink.font = 'bold 60px monospace'
    ink.textAlign = 'center'
    ink.textBaseline = 'middle'
    ink.fillStyle = station.color
    ink.fillText(['<WEB>', 'API / SQL', '>_ RUN'][i], 192, 50)
    const map = new T.CanvasTexture(plaque)
    map.colorSpace = T.SRGBColorSpace
    const sign = new T.Mesh(new T.PlaneGeometry(2, 0.5), new T.MeshBasicMaterial({map}))
    sign.position.set(0, 2.27, -0.87)
    display.add(sign)
    return display
  })
  return finishRoom(scene, shell, objects)
}
