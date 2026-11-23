import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js'
import { noiseGLSL } from './shaderBits'

export type XYZ = [number, number, number]
export type XZ = [number, number]
const zero: XYZ = [0, 0, 0]

/**
 * Soft "storybook" shading on top of the standard PBR model: a gentle warm rim
 * light and lifted shadows keep colours pastel and silhouettes readable, the
 * way cosy life-sim games look, without flattening into hard cel bands.
 */
export function cartoon(material: T.MeshStandardMaterial, rim = 0.2, lift = 0.07) {
  const previous = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0., 1.);
        float rimLight = pow(1. - facing, 2.6);
        outgoingLight += rimLight * ${rim.toFixed(3)} * mix(vec3(1., .95, .84), diffuseColor.rgb, .35);
        outgoingLight += diffuseColor.rgb * vec3(${lift.toFixed(3)}, ${(lift * 0.85).toFixed(3)}, ${(lift * 0.95).toFixed(3)});
      }
      #include <opaque_fragment>`,
    )
  }
  const key = material.customProgramCacheKey
  material.customProgramCacheKey = () =>
    key.call(material) + `|cartoon${rim}:${lift}`
  return material
}
const unit: XYZ = [1, 1, 1]

/** Small parts are baked with vertex colours into one mesh per animated or pickable object. */
export class ModelKit {
  private templates = new Map<string, T.BufferGeometry>()
  readonly matte = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
  })
  readonly leaf = this.matte.clone()
  readonly petals = this.matte.clone()
  /** Lawn painted with soft sunny patches, flecks and clover dots. */
  readonly grass = this.matte.clone()
  /** Earth paths with mottled tones and scattered pebbles. */
  readonly soil = this.matte.clone()
  readonly glass = new T.MeshStandardMaterial({
    vertexColors: true,
    emissive: '#ffd275',
    emissiveIntensity: 0.12,
  })
  readonly water = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.38,
    metalness: 0.06,
  })
  readonly clock = { value: 0 }
  readonly walker = { value: new T.Vector2(100, 100) }
  readonly motion = { value: 1 }
  readonly walkerFloor = { value: 0 }
  /** 1 by day, 0 at night: drives the drifting cloud shadows. */
  readonly daylight = { value: 1 }
  /** (x, z, strength) of the tree currently being shaken. */
  readonly shake = { value: new T.Vector3(0, 0, 0) }
  constructor() {
    for (const [material, flower] of [
      [this.leaf, false],
      [this.petals, true],
    ] as const) {
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, {
          islandTime: this.clock,
          walker: this.walker,
          motion: this.motion,
          walkerFloor: this.walkerFloor,
          shake: this.shake,
        })
        shader.vertexShader =
          'uniform float islandTime; uniform float motion; uniform vec2 walker; uniform vec3 shake;\nvarying float leafUp;\nvarying vec3 leafWorld;\n' +
          (flower ? '' : 'varying vec3 leafViewPosition;\n') +
          shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          leafUp = normalize(mat3(modelMatrix) * objectNormal).y;
          leafWorld = (modelMatrix * vec4(position, 1.)).xyz;
          vec2 here = (modelMatrix * vec4(position, 1.)).xz;
          // Gusts roll across the island: the breeze swells and settles.
          float gust = .7 + .5 * sin(islandTime * .27 + here.x * .08 - here.y * .05);
          float sway = sin(islandTime * 1.45 + here.x * .9 + here.y * .68) * gust;
          transformed.x += motion * sway * ${flower ? '.023' : '.035'} * clamp(position.y, 0., 3.);
          transformed.z += motion * sin(islandTime * 1.1 + here.y * .7) * gust * ${flower ? '.01' : '.018'} * clamp(position.y, 0., 3.);
          // A shaken tree rattles its crown.
          float shaken = shake.z * (1. - smoothstep(.7, 1.7, length(here - shake.xy))) * clamp(position.y - .9, 0., 2.);
          transformed.x += shaken * sin(islandTime * 41.) * .085;
          transformed.z += shaken * cos(islandTime * 33.) * .06;
          ${flower ? 'vec2 away = here - walker; transformed.xz += motion * away / max(length(away), .1) * (1. - smoothstep(.2, 1.8, length(away))) * .18;' : 'leafViewPosition = (modelViewMatrix * vec4(transformed, 1.)).xyz;'}`,
        )
        // Sunlit crowns, cool undersides: soft painted volume on foliage.
        // Leaf clusters: a soft cellular pattern of brighter clumps with
        // darker hollows between them, like hand-painted foliage.
        const clumps = flower
          ? ''
          : `
            vec2 lp = vec2(leafWorld.x + leafWorld.y * .6, leafWorld.z - leafWorld.y * .45) * 3.1;
            vec2 li = floor(lp), lf = fract(lp);
            float nearest = 1.5;
            for (int y = -1; y <= 1; y++)
              for (int x = -1; x <= 1; x++) {
                vec2 o = vec2(float(x), float(y));
                vec2 centre = o + vec2(islandHash(li + o), islandHash(li + o + 7.)) - lf;
                nearest = min(nearest, length(centre));
              }
            float leafFade = 1. - smoothstep(.35, .9, length(fwidth(lp)));
            diffuseColor.rgb *= mix(1., mix(1.06, .88, smoothstep(.3, .85, nearest)), leafFade);`
        shader.fragmentShader =
          'varying float leafUp;\nvarying vec3 leafWorld;\n' +
          noiseGLSL +
          shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            diffuseColor.rgb *= mix(vec3(.8, .87, .94), vec3(1.13, 1.11, .9), leafUp * .5 + .5);` + clumps,
          )
        if (!flower) {
          // Reveal the player's silhouette through greenery between them and the camera.
          shader.fragmentShader =
            'uniform vec2 walker; uniform float walkerFloor; varying vec3 leafViewPosition;\n' +
            shader.fragmentShader
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <alphatest_fragment>',
            `#include <alphatest_fragment>
            vec3 walkerView = (viewMatrix * vec4(walker.x, walkerFloor + .94, walker.y, 1.)).xyz;
            vec3 fromWalker = leafViewPosition - walkerView;
            float curtain = length(fromWalker.xy / vec2(.74, 1.16));
            if (fromWalker.z > -.48 && curtain < 1.32) {
              float coverage = smoothstep(.83, 1.32, curtain);
              float stipple = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
              if (coverage <= stipple) discard;
            }`,
          )
        }
      }
      material.customProgramCacheKey = () => (flower ? 'flowers' : 'leaves')
    }
    paintGround(this.grass, 'grass', this.clock, this.daylight)
    paintGround(this.soil, 'soil', this.clock, this.daylight)
    cartoon(this.matte, 0.14, 0.05)
    cartoon(this.leaf, 0.2, 0.06)
    cartoon(this.petals, 0.16, 0.06)
  }
  template(id: string, make: () => T.BufferGeometry) {
    let g = this.templates.get(id)
    if (!g) {
      g = make()
      this.templates.set(id, g)
    }
    return g
  }
  clearTemplates() {
    this.templates.forEach((g) => g.dispose())
    this.templates.clear()
  }
}

function paintGround(
  material: T.MeshStandardMaterial,
  kind: 'grass' | 'soil',
  clock: { value: number },
  daylight: { value: number },
) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.groundTime = clock
    shader.uniforms.groundDay = daylight
    shader.vertexShader =
      'varying vec3 vGroundWorld;\n' +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vGroundWorld = (modelMatrix * vec4(transformed, 1.)).xyz;`,
      )
    const paint =
      kind === 'grass'
        ? `vec2 p = vGroundWorld.xz;
          vec3 g = diffuseColor.rgb * mix(.9, 1.09, islandFbm(p * .42));
          g = mix(g, g * vec3(1.07, 1.1, .84) + vec3(.02, .02, 0.), smoothstep(.56, .82, islandNoise(p * .17 + 3.)) * .7);
          // Leafy confetti: two layers of tiny rotated triangles in a few
          // tones (deep green, yellow-green, pale and the odd warm orange).
          vec3 base = g;
          for (int layer = 0; layer < 3; layer++) {
            vec2 uv = p * 2.1 + float(layer) * vec2(.5, .37);
            vec2 cell = floor(uv) + float(layer) * 17.;
            vec2 f = fract(uv) - .5 - (vec2(islandHash(cell + 1.), islandHash(cell + 2.)) - .5) * .42;
            float h = islandHash(cell);
            float a = h * 6.2832;
            vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * f;
            float r = .13 + .07 * islandHash(cell + 5.);
            // Equilateral triangle distance.
            q.x = abs(q.x) - r;
            q.y = q.y + r / 1.7320508;
            if (q.x + 1.7320508 * q.y > 0.) q = vec2(q.x - 1.7320508 * q.y, -1.7320508 * q.x - q.y) / 2.;
            q.x -= clamp(q.x, -2. * r, 0.);
            float d = -length(q) * sign(q.y);
            float fade = 1. - smoothstep(.12, .4, length(fwidth(uv)));
            float mask = (1. - smoothstep(0., .018, d)) * step(.3, h) * fade;
            float tone = islandHash(cell + 9.);
            vec3 col = tone < .45 ? base * vec3(.68, .82, .6)
              : tone < .8 ? base * vec3(1.2, 1.17, .82)
              : tone < .94 ? base * vec3(1.06, 1.2, .98) + .03
              : vec3(.98, .62, .32) * base.g * 1.35;
            g = mix(g, col, mask * .85);
          }
          diffuseColor.rgb = g;`
        : `vec2 p = vGroundWorld.xz;
          vec3 c = diffuseColor.rgb * mix(.93, 1.06, islandFbm(p * 1.4));
          vec2 cell = floor(p * 4.5);
          vec2 local = fract(p * 4.5) - .5 + (vec2(islandHash(cell + 2.), islandHash(cell + 5.)) - .5) * .5;
          float pebble = step(.62, islandHash(cell)) * smoothstep(.13, .08, length(local * vec2(1., 1.4)));
          c = mix(c, c * (islandHash(cell + 9.) > .5 ? 1.12 : .86), pebble);
          diffuseColor.rgb = c;`
    // Soft cloud shadows drift slowly across the island by day.
    const clouds = `
      float cloudShade = smoothstep(.5, .72, islandFbm(vGroundWorld.xz * .055 + vec2(groundTime * .035, groundTime * .012)));
      diffuseColor.rgb *= 1. - cloudShade * .17 * groundDay;`
    shader.fragmentShader =
      'varying vec3 vGroundWorld;\nuniform float groundTime;\nuniform float groundDay;\n' +
      noiseGLSL +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' + paint + clouds,
      )
  }
  material.customProgramCacheKey = () => 'island-' + kind
}

export class Batch {
  private parts = new Map<T.Material, T.BufferGeometry[]>()
  readonly kit: ModelKit
  readonly group = new T.Group()
  constructor(kit: ModelKit) {
    this.kit = kit
  }
  put(
    source: T.BufferGeometry,
    color: string,
    p: XYZ = zero,
    s: XYZ = unit,
    rot: XYZ = zero,
    material: T.Material = this.kit.matte,
    quat?: T.Quaternion,
  ) {
    const geo = source.index ? source.toNonIndexed() : source.clone()
    for (const attr of Object.keys(geo.attributes))
      if (attr !== 'position' && attr !== 'normal') geo.deleteAttribute(attr)
    if (!geo.attributes.normal) geo.computeVertexNormals()
    const size = geo.attributes.position.count
    const colors = new Float32Array(size * 3),
      rgb = new T.Color(color)
    for (let i = 0; i < size; i++) rgb.toArray(colors, i * 3)
    geo.setAttribute('color', new T.BufferAttribute(colors, 3))
    geo.applyMatrix4(
      new T.Matrix4().compose(
        new T.Vector3(...p),
        quat ?? new T.Quaternion().setFromEuler(new T.Euler(...rot)),
        new T.Vector3(...s),
      ),
    )
    const items = this.parts.get(material) ?? []
    items.push(geo)
    this.parts.set(material, items)
  }
  block(
    p: XYZ,
    s: XYZ,
    c: string,
    r: XYZ = zero,
    soft = false,
    mat?: T.Material,
  ) {
    const box = this.kit.template(soft ? 'lozenge' : 'box', () =>
      soft
        ? new RoundedBoxGeometry(1, 1, 1, 1, 0.075)
        : new T.BoxGeometry(1, 1, 1),
    )
    this.put(box, c, p, s, r, mat)
  }
  ball(p: XYZ, s: XYZ, c: string, detail = 0, r: XYZ = zero, mat?: T.Material) {
    this.put(
      this.kit.template(
        'ico' + detail,
        () => new T.IcosahedronGeometry(1, detail),
      ),
      c,
      p,
      s,
      r,
      mat,
    )
  }
  cylinder(
    p: XYZ,
    top: number,
    base: number,
    h: number,
    c: string,
    n = 10,
    r: XYZ = zero,
    mat?: T.Material,
  ) {
    const ratio = base > 0 ? top / base : 1
    this.put(
      this.kit.template(
        'cyl' + n + ':' + ratio.toFixed(3),
        () => new T.CylinderGeometry(ratio, 1, 1, n),
      ),
      c,
      p,
      [base, h, base],
      r,
      mat,
    )
  }
  stick(a: XYZ, b: XYZ, radius: number, c: string, n = 7, top = 1) {
    const start = new T.Vector3(...a),
      finish = new T.Vector3(...b),
      delta = finish.clone().sub(start)
    const q = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.clone().normalize(),
    )
    this.put(
      this.kit.template(
        'pole' + n + ':' + top,
        () => new T.CylinderGeometry(top, 1, 1, n),
      ),
      c,
      start.lerp(finish, 0.5).toArray(),
      [radius, delta.length(), radius],
      zero,
      undefined,
      q,
    )
  }
  prism(
    outline: XZ[],
    depth: number,
    c: string,
    p: XYZ = zero,
    r: XYZ = zero,
    bevel = 0,
    mat?: T.Material,
    bevelSegments = 1,
    tessellate = false,
  ) {
    const sh = new T.Shape()
    outline.forEach(([x, y], i) => {
      if (i) sh.lineTo(x, y)
      else sh.moveTo(x, y)
    })
    sh.closePath()
    const g = new T.ExtrudeGeometry(sh, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments,
      curveSegments: 4,
    })
    // Large flat shapes are split into small triangles so the curved-world
    // bend (applied per vertex) follows the surface instead of cutting chords.
    const fine = tessellate ? new TessellateModifier(1.4, 10).modify(g) : g
    this.put(fine, c, p, unit, r, mat)
    g.dispose()
    if (fine !== g) fine.dispose()
  }
  horizontal(
    points: XZ[],
    y: number,
    depth: number,
    c: string,
    mat?: T.Material,
    bevel = 0,
    bevelSegments = 1,
    tessellate = false,
  ) {
    this.prism(
      points.map(([x, z]) => [x, -z]),
      depth,
      c,
      [0, y - depth, 0],
      [-Math.PI / 2, 0, 0],
      bevel,
      mat,
      bevelSegments,
      tessellate,
    )
  }
  finish() {
    for (const [material, parts] of this.parts) {
      const geometry = mergeGeometries(parts)
      parts.forEach((g) => g.dispose())
      if (geometry) {
        const mesh = new T.Mesh(geometry, material)
        // Ground and tiny flowers only receive shadows: casting them would
        // re-render the whole lawn and hundreds of petals in the shadow pass.
        const k = this.kit
        mesh.castShadow = material !== k.grass && material !== k.soil && material !== k.petals
        mesh.receiveShadow = true
        this.group.add(mesh)
      }
    }
    this.parts.clear()
    return this.group
  }
}

export const wood = '#986744',
  trim = '#eed7a0',
  timber = '#79553d',
  bark = '#805f3c',
  clay = '#cf7650'
export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
}
