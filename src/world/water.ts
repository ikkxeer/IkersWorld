import * as T from 'three'
import { noiseGLSL } from './shaderBits'

type Uniform = { value: number }

/**
 * The stream as a dedicated strip whose `flow` attribute carries
 * (across 0…1, distance downstream). The shader drags painted ribbons,
 * lapping foam and little glints along it, so the river visibly flows.
 */
export function createRiver(
  center: (z: number) => number,
  width: (z: number) => number,
  clock: Uniform,
  light: Uniform,
) {
  const reach = 12.8
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }
  // Water level along the stream: level through the island, then a short
  // cascade over the cliff lip, across the beach shelf and down into the sea.
  const level = (z: number) => {
    const d = Math.abs(z)
    return (
      -0.13 -
      0.34 * smooth(10.3, 10.95, d) -
      0.21 * smooth(11.45, 12.0, d) -
      0.18 * smooth(12.0, 12.6, d)
    )
  }
  const rows = 180,
    cols = 10
  const positions: number[] = [],
    flow: number[] = [],
    shape: number[] = [],
    index: number[] = []
  for (let i = 0; i <= rows; i++) {
    const z = -reach + (2 * reach * i) / rows
    const d = Math.abs(z)
    const spread = 1 + 1.3 * smooth(10.8, 12.7, d)
    const y = level(z)
    const rapids = Math.min(1, Math.abs(level(z + 0.05) - level(z - 0.05)) * 9)
    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      positions.push(center(z) + (u * 2 - 1) * (width(z) + 0.17) * spread, y, z)
      // Water runs outwards from beneath the first bridge to both estuaries.
      flow.push(u, Math.abs(z - 1))
      shape.push(rapids, smooth(12.25, reach, d))
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j,
        b = a + cols + 1
      index.push(a, b, a + 1, a + 1, b, b + 1)
    }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('flow', new T.Float32BufferAttribute(flow, 2))
  geometry.setAttribute('shape', new T.Float32BufferAttribute(shape, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()

  const material = new T.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.3,
    metalness: 0.04,
    transparent: true,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = clock
    shader.uniforms.riverLight = light
    shader.vertexShader =
      'uniform float riverTime;\nattribute vec2 flow;\nattribute vec2 shape;\nvarying vec2 vFlow;\nvarying vec2 vShape;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFlow = flow;
        vShape = shape;
        transformed.y += sin(flow.y * 2.3 - riverTime * 2. + flow.x * 3.) * .006;`,
      )
    shader.fragmentShader =
      'uniform float riverTime;\nuniform float riverLight;\nvarying vec2 vFlow;\nvarying vec2 vShape;\n' +
      noiseGLSL +
      shader.fragmentShader
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          float t = riverTime;
          float across = vFlow.x;
          float along = vFlow.y;
          float side = min(across, 1. - across);
          float depth = smoothstep(.03, .42, side);
          vec3 water = mix(vec3(.5, .87, .8), vec3(.19, .57, .66), depth);
          // Flowing ribbons: warped noise dragged downstream.
          vec2 q = vec2(across * 5.5, along * .75 - t * .7);
          q.x += islandNoise(vec2(along * .5 - t * .3, across * 2.)) * 1.1;
          float ribbon = islandFbm(q);
          float streak = smoothstep(.6, .64, ribbon) * (1. - smoothstep(.66, .72, ribbon)) * step(.1, side);
          water = mix(water, vec3(.76, .96, .92), streak * .6);
          // Bright foam lapping at both banks.
          float lap = side + (islandNoise(vec2(along * 3. - t * 1.7, across * 5.)) - .5) * .07;
          float foam = 1. - smoothstep(.03, .065, lap);
          water = mix(water, vec3(.95, 1., .97), foam * .8);
          // Glints that wink in and out as they drift.
          vec2 cell = floor(vec2(across * 14., along * 4. - t * 1.15));
          float glint = step(.962, islandHash(cell)) *
            pow(max(0., sin(t * 3. + islandHash(cell + 3.) * 6.28)), 6.) * step(.12, side);
          // White water where it tumbles down to the beach, then it melts
          // into the sea shallows.
          float churn = vShape.x * smoothstep(.35, .7, islandNoise(vec2(across * 7., along * 3. - t * 3.2)));
          water = mix(water, vec3(.96, 1., .98), clamp(churn * 1.2 + vShape.x * .25, 0., .9));
          water = mix(water, vec3(.56, .88, .82), vShape.y * .6);
          diffuseColor.rgb = water;
          diffuseColor.a *= 1. - vShape.y;
          float riverGlow = (streak * .16 + foam * .14 + glint * .9) * riverLight;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(riverGlow);`,
        )
  }
  material.customProgramCacheKey = () => 'island-river'
  const mesh = new T.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.name = 'river'
  return mesh
}

/** Painted shallows, wavelets and foam bands rolling in towards the beach. */
export function paintSea(material: T.MeshStandardMaterial, clock: Uniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.seaTime = clock
    shader.vertexShader =
      'varying vec3 vSeaWorld;\n' +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vSeaWorld = (modelMatrix * vec4(transformed, 1.)).xyz;`,
      )
    shader.fragmentShader =
      'uniform float seaTime;\nvarying vec3 vSeaWorld;\n' +
      noiseGLSL +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec2 p = vSeaWorld.xz;
        float r = length(p / vec2(17.1, 12.3));
        float dist = (r - 1.) * mix(12.3, 17.1, abs(p.x) / (abs(p.x) + abs(p.y) * 1.39 + .001));
        float wobble = islandNoise(p * .35 + seaTime * .08);
        float shore = 1. - smoothstep(0., 10., dist);
        vec3 base = diffuseColor.rgb;
        vec3 col = mix(base, base * vec3(1.16, 1.2, 1.06) + vec3(.07, .09, .06), shore * shore);
        // Foam bands roll in towards the sand.
        float band = sin(dist * 3.4 + wobble * 2.6 + seaTime * 1.3);
        float foamBand = smoothstep(.84, .96, band) * (1. - smoothstep(.3, 1.6, dist)) * step(0., dist)
          * smoothstep(.3, .6, islandNoise(p * .9 + seaTime * .15));
        float edge = 1. - smoothstep(.05, .7, dist + (wobble - .5) * .6 + .15 * sin(seaTime * 1.1));
        // Painterly wavelets further out.
        vec2 w = p * vec2(1.1, 2.3) + vec2(seaTime * .3, seaTime * .08);
        float wav = islandNoise(w) * islandNoise(w * 1.9 + 4.);
        float wavelet = smoothstep(.5, .55, wav) * (1. - smoothstep(.57, .66, wav));
        col = mix(col, vec3(.94, 1., .97), clamp(foamBand * .65 + edge * .9 + wavelet * .28 * (1. - shore * .5), 0., 1.));
        diffuseColor.rgb = col;`,
      )
  }
  material.customProgramCacheKey = () => 'island-sea'
}
