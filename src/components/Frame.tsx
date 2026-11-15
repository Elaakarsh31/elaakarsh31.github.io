import { frameUrl } from '../lib/assets';

/** Still frame of the machine. Rendered only when the PNG exists (npm run frames). */
export function Frame({ name, alt, className = '' }: { name: string; alt: string; className?: string }) {
  const src = frameUrl(name);
  if (!src) return null;
  return (
    <figure className={`frame ${className}`}>
      <img src={src} alt={alt} width={1200} height={900} loading={name === 'hero' ? 'eager' : 'lazy'} decoding="async" />
    </figure>
  );
}
