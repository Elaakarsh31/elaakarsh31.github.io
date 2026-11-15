import { resumeUrl } from '../lib/assets';
import { DocIcon } from './Icons';
import { Roll } from './Roll';

/** Fixed bottom right: just the word and an icon; on hover the text rolls up into Holo. */
export function ResumeButton() {
  return (
    <a className="resume-fab roll-host" href={resumeUrl} target="_blank" rel="noopener noreferrer">
      <DocIcon />
      <Roll>Resume</Roll>
      <span className="sr-only"> (PDF, opens in a new tab)</span>
    </a>
  );
}
