import { portfolio } from '../content/portfolio';

export const NAV_ITEMS = [
  { id: 'data', label: 'Data' },
  { id: 'model', label: 'Model' },
  { id: 'system', label: 'System' },
  { id: 'projects', label: 'Projects' },
  { id: 'log', label: 'Log' },
  { id: 'contact', label: 'Contact' },
];

export function Nav() {
  return (
    <header className="nav">
      <a className="nav-mark" href="#top" aria-label={`${portfolio.site.name}, back to top`}>
        {portfolio.site.monogram}
      </a>
      <nav aria-label="Primary">
        <ul className="nav-list">
          {NAV_ITEMS.map((it) => (
            <li key={it.id}>
              <a href={`#${it.id}`}>{it.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
