uniform float uOpacity;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft circular sprite with a gaussian falloff.
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
#ifdef OCCLUDER
  gl_FragColor = vec4(0.0, 0.0, 0.0, smoothstep(1.0, 0.3, d) * 0.92 * vAlpha * uOpacity);
#else
  float a = exp(-d * 3.4) * vAlpha * uOpacity * 0.5;
  gl_FragColor = vec4(vColor, a);
#endif
}
