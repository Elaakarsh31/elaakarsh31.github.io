import type { RichNode } from '../content/resume';
import { ExtLink } from './ExtLink';

/** Renders the inline markup produced by scripts/resume-to-json.mjs. */
export function Rich({ nodes }: { nodes: RichNode[] }) {
  return (
    <>
      {nodes.map((n, k) => {
        if (typeof n === 'string') return n;
        const inner = <Rich nodes={n.c} />;
        switch (n.t) {
          case 'b':
            return <strong key={k}>{inner}</strong>;
          case 'i':
            return <em key={k}>{inner}</em>;
          case 'code':
            return <code key={k}>{inner}</code>;
          case 'a':
            return (
              <ExtLink key={k} href={n.href}>
                {inner}
              </ExtLink>
            );
        }
      })}
    </>
  );
}
