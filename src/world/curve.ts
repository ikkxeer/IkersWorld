import * as T from 'three'

/**
 * The "rolling log" look: everything bends gently away from the point the
 * camera looks at, so the island reads like a tiny curved planet and the sea
 * falls away to a soft horizon. The bend happens only in the final vertex
 * projection, so lighting, shadows and gameplay all stay in flat world space.
 */
export const worldCurve = { value: 0 }
export const worldCurveFocus = { value: 34 }

/**
 * Cinematic cutaway: while the shrine transformation films the visitor from a
 * couple of metres away, solid props (rocks, trees, posts) dissolve with a
 * dither as they near the camera or pass in front of the visitor, instead of
 * being sliced open by the near clipping plane and blinking the sea through.
 * The ground and the visitor at the centre of the ring are never touched.
 */
export const cutaway = {
  on: { value: 0 },
  /** The visitor's centre, in view space. */
  target: { value: new T.Vector3() },
  /** Camera world matrix, to recover world positions in the vertex shader. */
  viewToWorld: { value: new T.Matrix4() },
  /** Ring centre (x, z) and floor height (y), in world space. */
  ring: { value: new T.Vector3() },
}

const CUT_VERTEX = /* glsl */ `
  vCutView = mvPosition.xyz;
  vCutWorld = (cutViewToWorld * vec4(mvPosition.xyz, 1.)).xyz;
`
const CUT_FRAGMENT = /* glsl */ `
  if (cutOn > 0.) {
    vec3 w = vCutWorld;
    float prop = step(cutRing.y + .1, w.y) * step(.8, length(w.xz - cutRing.xz));
    float nearFade = 1. - smoothstep(.45, 1.9, -vCutView.z);
    float ahead = vCutView.z - cutTarget.z;
    vec2 off = (vCutView.xy - cutTarget.xy) / vec2(.85, 1.3);
    float occlude = smoothstep(.35, 1.1, ahead) * (1. - smoothstep(.8, 1.15, length(off)));
    float fade = max(nearFade, occlude) * prop * cutOn;
    float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(.06711056, .00583715))));
    if (fade > dither) discard;
  }
`

const BEND = /* glsl */ `{
  float bendDepth = -mvPosition.z - worldCurveFocus;
  mvPosition.y -= worldCurve * bendDepth * bendDepth;
}
`

export function bendMaterial(material: T.Material) {
  if (material.userData.bent || material.userData.noBend) return
  material.userData.bent = true
  const previous = material.onBeforeCompile
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer)
    shader.uniforms.worldCurve = worldCurve
    shader.uniforms.worldCurveFocus = worldCurveFocus
    // Only solid surfaces dissolve; glows, smoke and water stay whole.
    const cut = !material.transparent && shader.vertexShader.includes('#include <project_vertex>') && shader.fragmentShader.includes('void main() {')
    shader.vertexShader =
      'uniform float worldCurve;\nuniform float worldCurveFocus;\n' +
      (cut ? 'uniform mat4 cutViewToWorld;\nvarying vec3 vCutView;\nvarying vec3 vCutWorld;\n' : '') +
      shader.vertexShader
        .replace('#include <project_vertex>', T.ShaderChunk.project_vertex)
        .replace(
          /gl_Position = projectionMatrix \* mvPosition;/g,
          (cut ? CUT_VERTEX : '') + BEND + 'gl_Position = projectionMatrix * mvPosition;',
        )
    if (cut) {
      shader.uniforms.cutOn = cutaway.on
      shader.uniforms.cutTarget = cutaway.target
      shader.uniforms.cutViewToWorld = cutaway.viewToWorld
      shader.uniforms.cutRing = cutaway.ring
      shader.fragmentShader =
        'uniform float cutOn;\nuniform vec3 cutTarget;\nuniform vec3 cutRing;\nvarying vec3 vCutView;\nvarying vec3 vCutWorld;\n' +
        shader.fragmentShader.replace('void main() {', 'void main() {' + CUT_FRAGMENT)
    }
  }
  const key = material.customProgramCacheKey
  material.customProgramCacheKey = () => key.call(material) + '|bent' + (material.transparent ? '' : '|cut')
  material.needsUpdate = true
}

export function bendScene(root: T.Object3D) {
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Points || o instanceof T.Sprite || o instanceof T.Line)
      for (const m of [o.material].flat()) bendMaterial(m)
  })
}

const scratch = new T.Vector3()
/** Like `Vector3.project`, but lands where the bent world actually draws it. */
export function projectCurved(v: T.Vector3, camera: T.Camera) {
  v.applyMatrix4(camera.matrixWorldInverse)
  const depth = -v.z - worldCurveFocus.value
  v.y -= worldCurve.value * depth * depth
  return v.applyMatrix4(camera.projectionMatrix)
}

/**
 * Pointer rays are cast in flat space, so shift the ray up by the bend at the
 * depth it hits the ground; two passes converge well enough for picking.
 */
export function unbendRay(ray: T.Ray, camera: T.Camera, groundY = 0.1) {
  if (!worldCurve.value) return
  const up = scratch.set(0, 1, 0).applyQuaternion(camera.quaternion)
  const origin = ray.origin.clone()
  for (let pass = 0; pass < 2; pass++) {
    if (Math.abs(ray.direction.y) < 1e-4) return
    const t = (groundY - ray.origin.y) / ray.direction.y
    const hit = ray.at(t, new T.Vector3()).applyMatrix4(camera.matrixWorldInverse)
    const depth = -hit.z - worldCurveFocus.value
    ray.origin.copy(origin).addScaledVector(up, worldCurve.value * depth * depth)
  }
}
