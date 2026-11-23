import * as T from 'three'

/**
 * The "rolling log" look: everything bends gently away from the point the
 * camera looks at, so the island reads like a tiny curved planet and the sea
 * falls away to a soft horizon. The bend happens only in the final vertex
 * projection, so lighting, shadows and gameplay all stay in flat world space.
 */
export const worldCurve = { value: 0 }
export const worldCurveFocus = { value: 34 }

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
    shader.vertexShader =
      'uniform float worldCurve;\nuniform float worldCurveFocus;\n' +
      shader.vertexShader
        .replace('#include <project_vertex>', T.ShaderChunk.project_vertex)
        .replace(
          /gl_Position = projectionMatrix \* mvPosition;/g,
          BEND + 'gl_Position = projectionMatrix * mvPosition;',
        )
  }
  const key = material.customProgramCacheKey
  material.customProgramCacheKey = () => key.call(material) + '|bent'
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
