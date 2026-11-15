const BASE = import.meta.env.BASE_URL;

export const resumeUrl = `${BASE}resume.pdf`;

/** Still frame of the machine at a stage, when public/frames/<name>.png exists. */
export function frameUrl(name: string) {
  return __FRAMES__.includes(`${name}.png`) ? `${BASE}frames/${name}.png` : null;
}

/** Optional schematic preview for a project, from public/projects/<id>.<ext>. */
export function projectImageUrl(id: string) {
  const file = __PROJECT_IMAGES__.find((f) => f.replace(/\.[^.]+$/, '') === id);
  return file ? `${BASE}projects/${file}` : null;
}
