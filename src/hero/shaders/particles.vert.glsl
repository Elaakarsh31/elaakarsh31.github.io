// Particle portrait. Interpolates each point between its place on the bust and a dispersed
// target, lights it from its surface normal, and sizes it with depth.

uniform float uTime;
uniform float uProgress;   // 0 = assembled bust, 1 = dispersed cloud
uniform float uSize;       // point diameter in world units
uniform float uScale;      // drawing-buffer height / (2 * tan(fov / 2))
uniform vec3 uLightDir;    // key light, view space
uniform float uOccScale;   // occluder pass: sprite size multiplier

attribute vec3 aDispersed;
attribute float aSeed;
attribute float aLum;

varying vec3 vColor;
varying float vAlpha;

const vec3 WARM = vec3(1.0, 0.93, 0.84);
const vec3 LAVENDER = vec3(0.70, 0.63, 0.96);

void main() {
  // Staggered dissolve: the bust turns first, then points leave at slightly different moments.
  float t = clamp((uProgress - 0.12 - aSeed * 0.38) / 0.5, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);

  vec3 p = mix(position, aDispersed, t);
  float drift = 0.0035 + 0.06 * t;
  p += drift * vec3(
    sin(uTime * 0.55 + aSeed * 41.0),
    cos(uTime * 0.47 + aSeed * 29.0),
    sin(uTime * 0.61 + aSeed * 17.0)
  );

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vec3 v = normalize(-mv.xyz);
  float facing = dot(n, v);
  float diff = max(dot(n, uLightDir), 0.0);
  float rim = pow(1.0 - clamp(facing, 0.0, 1.0), 3.0);

  // Key light plus a faint fill; luminance from the model darkens brows, eyes and hair.
  float fill = max(dot(n, normalize(vec3(0.7, 0.05, 0.7))), 0.0);
  float light = aLum * (0.08 + 0.92 * pow(diff, 1.2) + 0.2 * fill) + rim * 0.18 * aLum;

  // Points on the far side fade so the face stays crisp; once dispersed, all points show.
  float front = mix(smoothstep(-0.1, 0.3, facing), 1.0, t);
  // Soften the cut across the chest.
  float base = smoothstep(0.04, 0.6, position.y);

  float shadow = clamp((1.0 - diff) * 0.55 + rim * 0.6, 0.0, 1.0);
  vColor = mix(WARM, LAVENDER, mix(shadow, 0.55, t));
  vAlpha = light * front * mix(base, 1.0, t) * mix(1.0, 0.32, t);

  gl_PointSize = max(1.0, uSize * (0.75 + 0.35 * aLum) * uScale / -mv.z);

#ifdef OCCLUDER
  // Dark silhouette pass drawn first: large soft sprites that hide the greeting behind the bust.
  // The silhouette only exists while the bust is assembled; it never travels with the cloud.
  vAlpha = base * (1.0 - smoothstep(0.0, 0.08, t)) * (1.0 - smoothstep(0.2, 0.5, uProgress));
  gl_PointSize = max(2.0, uSize * uOccScale * uScale / -mv.z);
#endif

  gl_Position = projectionMatrix * mv;
}
