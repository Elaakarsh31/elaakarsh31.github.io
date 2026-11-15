import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/clipboard';

/** Copy button with a short "Copied" confirmation that screen readers hear too. */
export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost copy-email"
        onClick={async () => {
          setState((await copyText(email)) ? 'copied' : 'failed');
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setState('idle'), 2000);
        }}
      >
        {state === 'copied' ? 'Copied' : 'Copy email'}
      </button>
      <span className="sr-only" role="status">
        {state === 'copied' ? 'Email copied' : state === 'failed' ? 'Could not copy' : ''}
      </span>
    </>
  );
}
