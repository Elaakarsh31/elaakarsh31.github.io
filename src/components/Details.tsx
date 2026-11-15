import type { Bullet } from '../content/resume';
import { Rich } from './Rich';

/** Native disclosure with the full resume bullets for an entry. */
export function Details({ bullets, label = 'Details' }: { bullets: Bullet[]; label?: string }) {
  if (!bullets.length) return null;
  return (
    <details className="details">
      <summary>
        <span className="details-label">{label}</span>
      </summary>
      <ul className="bullets">
        {bullets.map((b, k) => (
          <li key={k}>
            <Rich nodes={b} />
          </li>
        ))}
      </ul>
    </details>
  );
}
