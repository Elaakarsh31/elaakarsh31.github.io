// Particle portrait. Interpolates each point between its place on the bust and a dispersed
// target, lights it from its surface normal, and sizes it with depth.

uniform float uTime;
uniform float uProgress;   // 0 = assembled bust, 1 = dispersed cloud
uniform float uSize;       // point diameter in world units
uniform float uScale;      // drawing-buffer height / (2 * tan(fov / 2))
uniform vec3 uLightDir;    // key light, view space
uniform float uOccScale;   // occluder pass: sprite size multiplier

// Cursor turbulence: a short trail of recent pointer samples.
#define TRAIL 8
uniform vec4 uTrail[TRAIL]; // xy: pointer in aspect-corrected NDC, z: timestamp, w: strength
uniform float uAspect;
uniform float uRadius;      // influence radius in the same space (screen height = 2)
uniform float uPush;        // displacement scale

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

  // Compare particle and pointer in the same aspect-corrected screen space, then push the
  // particle radially and swirl it tangentially; each trail sample fades over ~1.5 s.
  vec4 clip = projectionMatrix * mv;
  vec2 sp = clip.xy / clip.w;
  sp.x *= uAspect;
  vec2 push = vec2(0.0);
  for (int i = 0; i < TRAIL; i++) {
    vec4 tr = uTrail[i];
    float age = uTime - tr.z;
    if (age < 0.0 || age > 2.0) continue;
    vec2 d = sp - tr.xy;
    float dist = length(d);
    float r = smoothstep(uRadius, 0.0, dist);
    float k = exp(-age * 3.0) * r * r * tr.w * (0.45 + aSeed);
    vec2 dir = d / max(dist, 1e-4);
    push += (dir * 0.65 + vec2(-dir.y, dir.x) * 0.5) * k;
  }
  // Screen offset back to view space at this depth.
  mv.xy += push * uPush * (-mv.z) / projectionMatrix[1][1];
  mv.z += length(push) * uPush * 0.6 * (aSeed - 0.5);

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
