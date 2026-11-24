import * as T from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js'
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js'

/**
 * A painterly colour grade: a touch more saturation, golden highlights and
 * rosy-violet shadows around sunrise and sunset, pastel-lifted blacks, a soft
 * vignette and a whisper of film grain.
 */
const GradeShader = {
  name: 'IslandGrade',
  uniforms: {
    tDiffuse: { value: null as T.Texture | null },
    golden: { value: 0 },
    night: { value: 0 },
    time: { value: 0 },
    resolution: { value: new T.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float golden;
    uniform float night;
    uniform float time;
    uniform vec2 resolution;
    varying vec2 vUv;
    float grain(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 tex = texture2D(tDiffuse, vUv);
      vec3 c = tex.rgb;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, 1.1 + .1 * golden);
      vec3 shadowTint = mix(vec3(1.), vec3(1.05, .94, 1.12), golden * .85 + night * .35);
      vec3 lightTint = mix(vec3(1.), vec3(1.12, .97, .84), golden);
      c *= mix(shadowTint, lightTint, smoothstep(.04, .55, l));
      // A gentle contrast curve deepens the mid-tones.
      c = pow(max(c, 0.), vec3(1.07));
      c = c * .97 + vec3(.011, .009, .015);
      vec2 d = vUv - .5;
      d.x *= resolution.x / resolution.y;
      c *= 1. - smoothstep(.42, 1.12, length(d)) * (.32 + .18 * night);
      c += (grain(vUv * resolution + fract(time) * 91.7) - .5) * .016 * (.6 + l);
      gl_FragColor = vec4(c, tex.a);
    }`,
}

export interface PostLook {
  night: number
  golden: number
  inside: boolean
  time: number
  cinematic?: boolean
}

/**
 * The finishing pass stack: multisampled HDR render, a soft bloom so lamps,
 * fire and windows glow, a tilt-shift blur that sells the miniature diorama,
 * then the grade and tone mapping.
 */
export function createPostFX(renderer: T.WebGLRenderer, scene: T.Scene, camera: T.Camera) {
  // On dense screens the extra pixels already smooth edges: fewer MSAA samples.
  const target = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: devicePixelRatio > 1.4 ? 2 : 4 })
  const composer = new EffectComposer(renderer, target)
  const render = new RenderPass(scene, camera)
  const bloom = new UnrealBloomPass(new T.Vector2(256, 256), 0.3, 0.6, 0.9)
  const tiltH = new ShaderPass(HorizontalTiltShiftShader)
  const tiltV = new ShaderPass(VerticalTiltShiftShader)
  const grade = new ShaderPass(GradeShader)
  composer.addPass(render)
  composer.addPass(bloom)
  composer.addPass(tiltH)
  composer.addPass(tiltV)
  composer.addPass(grade)
  composer.addPass(new OutputPass())
  let width = 1,
    height = 1
  return {
    setSize(w: number, h: number, ratio: number) {
      // The tilt-shift and bloom soften the image anyway: past 1.5× extra
      // resolution costs a lot of fill rate for little visible gain.
      ratio = Math.min(ratio, 1.5)
      composer.setPixelRatio(ratio)
      composer.setSize(w, h)
      width = w * ratio
      height = h * ratio
      grade.uniforms.resolution.value.set(width, height)
    },
    render(current: T.Scene, look: PostLook, dt: number) {
      render.scene = current
      // Outdoors the blur at the top and bottom makes the island feel like a
      // tiny model; rooms keep it subtle.
      const tilt = look.cinematic ? 0 : look.inside ? 1.6 : 3.4
      tiltH.uniforms.h.value = tilt / width
      tiltV.uniforms.v.value = tilt / height
      tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.5
      bloom.strength = (look.cinematic ? 0.16 : 0.26) + 0.5 * look.night + 0.12 * look.golden
      bloom.threshold = 0.9 - 0.25 * look.night
      grade.uniforms.golden.value = look.golden
      grade.uniforms.night.value = look.night
      grade.uniforms.time.value = look.time
      composer.render(dt)
    },
    dispose() {
      composer.dispose()
      target.dispose()
      bloom.dispose()
    },
  }
}
