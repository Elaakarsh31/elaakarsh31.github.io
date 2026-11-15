import { portfolio } from '../content/portfolio';

export function Nav() {
  return (
    <header className="nav">
      <a className="nav-name" href="#top">
        {portfolio.site.name}
      </a>
      <nav aria-label="Primary">
        <ul>
          <li>
            <a href="#work">Work</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
