import { useEffect, useRef, useState } from 'react';
import { botName } from '../lib/bot-bus';

/** The bot's speech tag: a tiny hologram it projects above itself for a few seconds. */
export function BotSpeech() {
  const [line, setLine] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const timer = useRef(0);
  useEffect(() => {
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      if (!text) return;
      setLine(text);
      setKey((k) => k + 1);
      clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setLine(null), 3400);
    };
    window.addEventListener('bot:poke', on);
    return () => {
      window.removeEventListener('bot:poke', on);
      clearTimeout(timer.current);
    };
  }, []);
  const name = botName();
  return (
    <div className="bot-speech-anchor" data-hud-anchor="bot" aria-live="polite">
      {line && (
        <p key={key} className="bot-speech hud-panel">
          {name && <span className="bot-speech-name">{name}</span>}
          {line}
        </p>
      )}
    </div>
  );
}
