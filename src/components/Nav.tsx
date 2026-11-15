import { portfolio } from '../content/portfolio';
import { isMac } from '../lib/env';
import { openPalette } from './CommandPalette';

export const NAV_ITEMS = [
  { id: 'data', label: 'Data' },
  { id: 'model', label: 'Model' },
  { id: 'system', label: 'System' },
  { id: 'projects', label: 'Projects' },
  { id: 'log', label: 'Log' },
  { id: 'contact', label: 'Contact' },
];

export function Nav() {
  const mac = isMac();
  return (
    <header className="nav">
      <a className="nav-mark" href="#top" aria-label={`${portfolio.site.name}, back to top`}>
        {portfolio.site.monogram}
      </a>
      <nav aria-label="Primary" data-spy>
        <ul className="nav-list">
          {NAV_ITEMS.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`}>{it.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <button
        type="button"
        className="nav-k"
        onClick={openPalette}
        aria-label="Open command palette"
        aria-keyshortcuts={mac ? 'Meta+K /' : 'Control+K /'}
      >
        <span className="nav-k-keys">
          <kbd>{mac ? '⌘' : 'Ctrl'}</kbd>
          <kbd>K</kbd>
        </span>
        <span className="nav-k-label">Menu</span>
      </button>
    </header>
  );
}
