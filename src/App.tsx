import { lazy, Suspense, useEffect, useState } from 'react';
import { BotSpeech } from './components/BotSpeech';
import { Build } from './components/Build';
import { CommandPalette } from './components/CommandPalette';
import { Contact } from './components/Contact';
import { Cursor } from './components/Cursor';
import { Log } from './components/Log';
import { Nav } from './components/Nav';
import { PipelineRail } from './components/PipelineRail';
import { PowerGate } from './components/PowerGate';
import { Projects } from './components/Projects';
import { ResumeBand } from './components/ResumeBand';
import { ResumeButton } from './components/ResumeButton';
import { SocialDock } from './components/SocialDock';
import { SoundToggle } from './components/SoundToggle';
import { Toolbench } from './components/Toolbench';
import { portfolio } from './content/portfolio';
import { captureFrame, isCapture } from './three/capture';
import { hasFinePointer, useMode } from './lib/env';
import { interceptHashLinks, scrollToTarget, startSmoothScroll } from './lib/scroll';
import { startSpy } from './lib/spy';
import { bootStep } from './lib/boot';

const WorkshopCanvas = lazy(() => import('./three/WorkshopCanvas'));

/**
 * Still-frame capture (?frame=…): only the scene, for public/frames/*.png and the OG image.
 * The OG frame adds the name and title over the scene.
 */
function CaptureApp({ frame }: { frame: string }) {
  return (
    <div className="capture" data-frame={frame}>
      <Suspense fallback={null}>
        <WorkshopCanvas />
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

  // Smooth scrolling drives the scroll-built scene; phones, tablets and reduced motion keep the
  // browser's own scrolling.
  useEffect(() => {
    if (mode !== 'live') return;
    return startSmoothScroll();
  }, [mode]);

  useEffect(() => {
    void document.fonts.ready.then(() => bootStep('fonts'));
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
          <WorkshopCanvas />
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
      <SocialDock extra={mode !== 'static' ? <SoundToggle /> : undefined} />
      <ResumeButton />
      <CommandPalette />
      {mode !== 'static' && <BotSpeech />}
      <div className="veil" aria-hidden="true" />
      {finePointer && document.documentElement.dataset.motion !== 'reduce' && <Cursor />}
      {mode !== 'static' && <PowerGate />}
    </>
  );
}
