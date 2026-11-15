import { useEffect, useState } from 'react';
import { isSoundOn, onSoundChange, setSoundOn } from '../lib/sound';

/** Small speaker toggle in the dock. Sound is off until you turn it on. */
export function SoundToggle() {
  const [on, setOn] = useState(isSoundOn);
  useEffect(() => {
    const off = onSoundChange(setOn);
    return () => {
      off();
    };
  }, []);
  const label = on ? 'Sound on' : 'Sound off';
  return (
    <li>
      <button type="button" className="dock-link" aria-pressed={on} aria-label={`${label}. Plate clicks and weld crackle.`} onClick={() => setSoundOn(!on)}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
          {on ? (
            <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
          ) : (
            <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M16 9.5l5 5M21 9.5l-5 5" />
          )}
        </svg>
        <span className="dock-tip" aria-hidden="true">
          {label}
        </span>
      </button>
    </li>
  );
}
