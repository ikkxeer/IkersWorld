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
  from: number,
  to: number,
  clock: Uniform,
  light: Uniform,
) {
  const rows = 120,
    cols = 10
  const positions: number[] = [],
    flow: number[] = [],
    index: number[] = []
  for (let i = 0; i <= rows; i++) {
    const z = from + ((to - from) * i) / rows
    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      positions.push(center(z) + (u * 2 - 1) * (width(z) + 0.17), -0.13, z)
      flow.push(u, z - from)
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
  geometry.setIndex(index)
  geometry.computeVertexNormals()

  const material = new T.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.3,
    metalness: 0.04,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.riverTime = clock
    shader.uniforms.riverLight = light
    shader.vertexShader =
      'uniform float riverTime;\nattribute vec2 flow;\nvarying vec2 vFlow;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFlow = flow;
        transformed.y += sin(flow.y * 2.3 - riverTime * 2. + flow.x * 3.) * .006;`,
      )
    shader.fragmentShader =
      'uniform float riverTime;\nuniform float riverLight;\nvarying vec2 vFlow;\n' +
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
          diffuseColor.rgb = water;
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
        float dist = (r - 1.) * 13.;
        float wobble = islandNoise(p * .35 + seaTime * .08);
        float shore = 1. - smoothstep(0., 10., dist);
        vec3 base = diffuseColor.rgb;
        vec3 col = mix(base, base * vec3(1.16, 1.2, 1.06) + vec3(.07, .09, .06), shore * shore);
        // Foam bands roll in towards the sand.
        float band = sin(dist * 3.4 + wobble * 2.6 + seaTime * 1.3);
        float foamBand = smoothstep(.86, .96, band) * (1. - smoothstep(.4, 2.6, dist)) * step(0., dist);
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

/** Waterfalls: bright streaks tumbling downwards. */
export function paintFalls(material: T.MeshStandardMaterial, clock: Uniform) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.fallTime = clock
    shader.vertexShader =
      'varying vec3 vFallWorld;\n' +
      shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vFallWorld = (modelMatrix * vec4(transformed, 1.)).xyz;`,
      )
    shader.fragmentShader =
      'uniform float fallTime;\nvarying vec3 vFallWorld;\n' +
      noiseGLSL +
      shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float fall = fract(vFallWorld.y * 2.6 + fallTime * 1.8 + islandNoise(vFallWorld.xz * 5.) * .9);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.96, 1., .98), smoothstep(.72, .92, fall) * .75);`,
      )
  }
  material.customProgramCacheKey = () => 'island-falls'
}
