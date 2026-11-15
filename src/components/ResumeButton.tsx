import { resumeUrl } from '../lib/assets';
import { DocIcon } from './Icons';

/** Fixed bottom right. Opens the one-page PDF in a new tab. */
export function ResumeButton() {
  return (
    <a className="resume-fab" href={resumeUrl} target="_blank" rel="noopener noreferrer">
      <DocIcon />
      Resume
      <span className="sr-only"> (PDF, opens in a new tab)</span>
    </a>
  );
}
