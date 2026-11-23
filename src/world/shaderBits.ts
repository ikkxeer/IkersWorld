/** Tiny GLSL helpers shared by the painted ground, water and foliage shaders. */
export const noiseGLSL = /* glsl */ `
float islandHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float islandNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(
    mix(islandHash(i), islandHash(i + vec2(1., 0.)), u.x),
    mix(islandHash(i + vec2(0., 1.)), islandHash(i + vec2(1., 1.)), u.x),
    u.y
  );
}
float islandFbm(vec2 p) {
  return islandNoise(p) * .6 + islandNoise(p * 2.13 + 17.3) * .28 + islandNoise(p * 4.7 - 5.1) * .12;
}
`
