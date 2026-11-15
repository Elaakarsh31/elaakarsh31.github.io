import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { portfolio } from '../content/portfolio';
import { resumeUrl } from '../lib/assets';
import { botName, botPresent, pokeBot } from '../lib/bot-bus';
import { copyText } from '../lib/clipboard';
import { isMac } from '../lib/env';
import { scrollToTarget } from '../lib/scroll';

type Item = {
  id: string;
  group: 'Go to' | 'Actions' | 'Links';
  label: string;
  hint: string;
  keywords?: string;
  /** Return a status message to keep the palette open and show it. */
  run: () => string | void | Promise<string | void>;
};

const openExternal = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

function buildItems(): Item[] {
  const c = portfolio.contact;
  const go = (id: string, label: string, keywords = ''): Item => ({
    id: `go-${id}`,
    group: 'Go to',
    label,
    hint: id === 'top' ? 'top' : `#${id}`,
    keywords,
    // After the dialog closes, so its focus restore doesn't undo the move to the target.
    run: () => {
      requestAnimationFrame(() => scrollToTarget(id));
    },
  });
  return [
    go('top', 'Top', 'hero home start'),
    go('data', 'Data', 'act 1 refine mess'),
    go('model', 'Model', 'act 2 train'),
    go('system', 'System', 'act 3 build agent'),
    go('projects', 'Projects', 'work spec sheets'),
    go('papers', 'Papers', 'publications research'),
    go('log', 'Log', 'experience career release notes'),
    go('toolbench', 'Toolbench', 'skills tools stack'),
    go('contact', 'Contact', 'email hire'),
    {
      id: 'resume',
      group: 'Actions',
      label: 'Open resume',
      hint: 'PDF ↗',
      keywords: 'cv pdf download',
      run: () => openExternal(resumeUrl),
    },
    {
      id: 'copy-email',
      group: 'Actions',
      label: 'Copy email',
      hint: c.email,
      keywords: 'mail contact',
      run: async () => ((await copyText(c.email)) ? 'Copied' : 'Could not copy'),
    },
    {
      id: 'bot',
      group: 'Actions',
      label: 'Talk to the bot',
      hint: 'say something',
      keywords: 'robot poke hello',
      run: () => {
        const line = pokeBot();
        if (!botPresent()) return botName() ? `${botName()}: ${line}` : line;
      },
    },
    { id: 'github', group: 'Links', label: 'Open GitHub', hint: '↗', keywords: 'code repos', run: () => openExternal(c.github) },
    { id: 'linkedin', group: 'Links', label: 'Open LinkedIn', hint: '↗', keywords: 'profile', run: () => openExternal(c.linkedin) },
    {
      id: 'scholar',
      group: 'Links',
      label: 'Open Google Scholar',
      hint: '↗',
      keywords: 'papers citations publications',
      run: () => openExternal(c.scholar),
    },
  ];
}

/** Subsequence match. Returns matched indices in the label, or null; keywords count without highlight. */
function match(item: Item, q: string): { score: number; hits: number[] } | null {
  if (!q) return { score: 0, hits: [] };
  const query = q.toLowerCase().replace(/\s+/g, '');
  const label = item.label.toLowerCase();
  const hits: number[] = [];
  let j = 0;
  let score = 0;
  for (let i = 0; i < label.length && j < query.length; i++) {
    if (label[i] === query[j]) {
      hits.push(i);
      score += i === 0 || label[i - 1] === ' ' ? 3 : hits.length > 1 && hits[hits.length - 2] === i - 1 ? 2 : 1;
      j++;
    }
  }
  if (j === query.length) return { score: score + 5, hits };
  const hay = `${item.keywords ?? ''} ${item.hint}`.toLowerCase();
  return hay.includes(q.toLowerCase().trim()) ? { score: 1, hits: [] } : null;
}

function Highlight({ text, hits }: { text: string; hits: number[] }): ReactNode {
  if (!hits.length) return text;
  const set = new Set(hits);
  return [...text].map((ch, i) => (set.has(i) ? <mark key={i}>{ch}</mark> : ch));
}

export function openPalette() {
  window.dispatchEvent(new Event('palette:open'));
}

/** ⌘K / Ctrl K / "/" command palette on a native modal dialog. */
export function CommandPalette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const items = useMemo(buildItems, []);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<{ id: string; text: string } | null>(null);
  const closeTimer = useRef(0);

  const results = useMemo(
    () =>
      items
        .map((it, order) => ({ it, order, m: match(it, q) }))
        .filter((r) => r.m)
        .sort((a, b) => (q ? b.m!.score - a.m!.score || a.order - b.order : a.order - b.order)),
    [items, q],
  );

  const open = useCallback(() => {
    const d = dialog.current;
    if (!d || d.open) return;
    clearTimeout(closeTimer.current);
    setQ('');
    setActive(0);
    setStatus(null);
    d.showModal();
    input.current?.focus();
  }, []);

  const close = useCallback(() => {
    clearTimeout(closeTimer.current);
    dialog.current?.close();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k === 'k') {
        e.preventDefault();
        if (dialog.current?.open) close();
        else open();
        return;
      }
      if (k === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target instanceof Element ? e.target : null;
        if (t?.closest('input, textarea, select, [contenteditable="true"]') || dialog.current?.open) return;
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('palette:open', open);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('palette:open', open);
    };
  }, [open, close]);

  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  const run = async (item: Item) => {
    const msg = await item.run();
    if (msg) {
      setStatus({ id: item.id, text: msg });
      clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(close, item.id === 'bot' ? 2600 : 1100);
    } else {
      close();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = results.length;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (n ? (a + 1) % n : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (n ? (a - 1 + n) % n : 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(Math.max(0, n - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) void run(r.it);
    }
  };

  const optionId = (id: string) => `palette-opt-${id}`;
  let lastGroup = '';

  return (
    <dialog
      ref={dialog}
      className="palette"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
      onClose={() => clearTimeout(closeTimer.current)}
    >
      <div className="palette-panel hud-panel">
        <div className="palette-field">
          <span className="palette-prompt" aria-hidden="true">
            &gt;
          </span>
          <input
            ref={input}
            className="palette-input"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? optionId(results[active].it.id) : undefined}
            aria-label="Type a command or a section"
            placeholder="Jump to a section or run an action"
            value={q}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
              setStatus(null);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd className="palette-esc">esc</kbd>
        </div>
        <ul id="palette-list" ref={list} className="palette-list" role="listbox" aria-label="Commands">
          {results.map((r, i) => {
            const header = r.it.group !== lastGroup && !q ? r.it.group : null;
            lastGroup = r.it.group;
            return [
              header && (
                <li key={`h-${header}`} className="palette-group" role="presentation">
                  {header}
                </li>
              ),
              <li
                key={r.it.id}
                id={optionId(r.it.id)}
                role="option"
                aria-selected={i === active}
                className="palette-option"
                onMouseMove={() => setActive(i)}
                onClick={() => void run(r.it)}
              >
                <span className="palette-label">
                  <Highlight text={r.it.label} hits={r.m!.hits} />
                </span>
                <span className="palette-hint">{status?.id === r.it.id ? status.text : r.it.hint}</span>
              </li>,
            ];
          })}
          {!results.length && (
            <li className="palette-empty" role="presentation">
              No match. Try “projects” or “email”.
            </li>
          )}
        </ul>
        <p className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>↵</kbd> run
          </span>
          <span>
            <kbd>{isMac() ? '⌘' : 'Ctrl'}</kbd>
            <kbd>K</kbd> toggle
          </span>
          <span className="palette-status" role="status" aria-live="polite">
            {status?.text ?? ''}
          </span>
        </p>
      </div>
    </dialog>
  );
}
