import { portfolio } from '../content/portfolio';
import { resumeUrl } from '../lib/assets';
import { isMac } from '../lib/env';
import { DocIcon } from './Icons';
import { openPalette } from './CommandPalette';

export const NAV_ITEMS = [
  { id: 'data', label: 'Data' },
  { id: 'model', label: 'Model' },
  { id: 'system', label: 'System' },
  { id: 'projects', label: 'Projects' },
  { id: 'career', label: 'Career' },
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
      <div className="nav-end">
        {/* On compact screens the floating resume button moves up here. */}
        <a className="nav-resume" href={resumeUrl} target="_blank" rel="noopener noreferrer">
          <DocIcon />
          Resume
          <span className="sr-only"> (PDF, opens in a new tab)</span>
        </a>
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
      </div>
    </header>
  );
}
