import { portfolio } from '../content/portfolio';
import { resumeUrl } from '../lib/assets';
import { DocIcon } from './Icons';

export function ResumeBand() {
  return (
    <section id="resume" className="resume-band" aria-labelledby="resume-title">
      <h2 id="resume-title" className="resume-band-line" tabIndex={-1}>
        {portfolio.resumeBand.line}
      </h2>
      <a className="btn btn-hot" href={resumeUrl} download="Aakarsh_Arora_Resume.pdf">
        <DocIcon />
        {portfolio.resumeBand.button}
      </a>
    </section>
  );
}
