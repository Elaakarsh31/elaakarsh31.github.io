import { lazy, Suspense, useEffect, useState } from 'react';
import { BotSpeech } from './components/BotSpeech';
import { Build } from './components/Build';
import { CommandPalette } from './components/CommandPalette';
import { Contact } from './components/Contact';
import { Cursor } from './components/Cursor';
import { Log } from './components/Log';
import { Nav } from './components/Nav';
import { PipelineRail } from './components/PipelineRail';
import { Projects } from './components/Projects';
import { ResumeBand } from './components/ResumeBand';
import { ResumeButton } from './components/ResumeButton';
import { SocialDock } from './components/SocialDock';
import { Toolbench } from './components/Toolbench';
import { portfolio } from './content/portfolio';
import { captureFrame, isCapture } from './three/capture';
import { hasFinePointer, useMode } from './lib/env';
import { interceptHashLinks, scrollToTarget, startSmoothScroll } from './lib/scroll';
import { startSpy } from './lib/spy';

const WorkshopCanvas = lazy(() => import('./three/WorkshopCanvas'));

/**
 * Still-frame capture (?frame=…): only the scene, for public/frames/*.png and the OG image.
 * The OG frame adds the name and title over the scene.
 */
function CaptureApp({ frame }: { frame: string }) {
  return (
    <div className="capture" data-frame={frame}>
      <Suspense fallback={null}>
        <WorkshopCanvas mode="live" />
      </Suspense>
      {frame === 'og' && (
        <div className="og-copy">
          <p className="og-name">{portfolio.site.name}</p>
          <p className="og-role">Data Scientist, ML Researcher, AI Engineer</p>
          <p className="og-tagline">{portfolio.hero.tagline}</p>
        </div>
      )}
    </div>
  );
}

export function App() {
  if (isCapture) return <CaptureApp frame={captureFrame!} />;
  return <Site />;
}

function Site() {
  const mode = useMode();
  const [finePointer] = useState(hasFinePointer);

  // Smooth scrolling everywhere except with reduced motion (static mode covers that case,
  // plus no-WebGL, where smooth scrolling is still welcome).
  useEffect(() => {
    if (document.documentElement.dataset.motion === 'reduce') return;
    return startSmoothScroll();
  }, [mode]);

  useEffect(() => {
    const stopLinks = interceptHashLinks();
    const stopSpy = startSpy();
    // Land on a deep link once fonts and layout have settled.
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.fonts.ready.then(() => scrollToTarget(id, { instant: true, focus: false }));
    return () => {
      stopLinks();
      stopSpy();
    };
  }, []);

  return (
    <>
      {mode !== 'static' && (
        <Suspense fallback={null}>
          <WorkshopCanvas mode={mode} />
        </Suspense>
      )}
      <a className="skip" href="#projects">
        Skip to projects
      </a>
      <Nav />
      <PipelineRail />
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
      <SocialDock />
      <ResumeButton />
      <CommandPalette />
      {mode !== 'static' && <BotSpeech />}
      <div className="veil" aria-hidden="true" />
      {finePointer && document.documentElement.dataset.motion !== 'reduce' && <Cursor />}
    </>
  );
}
