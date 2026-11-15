import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { Work } from './components/Work';
import { About, Contact, Education, Experience, Publications, Skills } from './components/Sections';
import { portfolio } from './content/portfolio';

export function App() {
  return (
    <>
      <a className="skip" href="#work">
        Skip to projects
      </a>
      <Nav />
      <main>
        <Hero />
        <div className="content">
          <Work />
          <Publications />
          <Experience />
          <Skills />
          <Education />
          <About />
          <Contact />
        </div>
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>{portfolio.site.name}</span>
          <a href="#top">Back to top</a>
        </div>
      </footer>
    </>
  );
}
