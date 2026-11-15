import { portfolio } from '../content/portfolio';
import { resumeUrl } from '../lib/assets';
import { DocIcon } from './Icons';
import { Roll } from './Roll';

export function ResumeBand() {
  return (
    <section id="resume" className="resume-band" aria-labelledby="resume-title">
      <h2 id="resume-title" className="resume-band-line" tabIndex={-1}>
        {portfolio.resumeBand.line}
      </h2>
      <a className="band-download roll-host" href={resumeUrl} download="Aakarsh_Arora_Resume.pdf">
        <DocIcon />
        <Roll>{portfolio.resumeBand.button}</Roll>
      </a>
    </section>
  );
}
