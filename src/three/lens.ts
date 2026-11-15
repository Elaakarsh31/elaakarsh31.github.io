// Keeps compositions steady across window shapes. The camera's vertical field of view is set for a
// 16:10 window; on narrower windows (4:3 laptops, a tablet held sideways) the vertical angle opens
// up just enough to hold the same horizontal view, so the machine and the bot stay clear of the
// copy on the left instead of sliding under it.
const FIT_ASPECT = 1.6;

export function fitFov(fov: number, aspect: number) {
  if (aspect >= FIT_ASPECT) return fov;
  const t = Math.tan((fov * Math.PI) / 360) * (FIT_ASPECT / aspect);
  return (Math.atan(t) * 360) / Math.PI;
}
