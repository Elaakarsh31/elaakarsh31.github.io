import { Build } from './components/Build';
import { Contact } from './components/Contact';
import { Log } from './components/Log';
import { Nav } from './components/Nav';
import { Projects } from './components/Projects';
import { ResumeBand } from './components/ResumeBand';
import { Toolbench } from './components/Toolbench';
import { portfolio } from './content/portfolio';

export function App() {
  return (
    <>
      <a className="skip" href="#projects">
        Skip to projects
      </a>
      <Nav />
      <main>
        <Build />
        <div className="after-build">
          <Projects />
          <Log />
          <ResumeBand />
          <Toolbench />
          <Contact />
        </div>
      </main>
      <footer className="footer">
        <span>{portfolio.site.name}</span>
        <a href="#top">Back to top</a>
      </footer>
    </>
  );
}
