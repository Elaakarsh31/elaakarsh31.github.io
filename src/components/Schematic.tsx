import { createContext, useContext, useState, type ReactNode } from 'react';
import { Hint, PointerIcon } from './Hint';

// Exploded mini-diagrams for the spec sheets, drawn in code like a technical drawing. Every label
// and caption comes from the project's own summary, key result or resume entry.
//
// Interactive: pointing at a part lifts it out of the drawing, dims the rest, and explains it in
// the caption under the drawing. While the sheet is hovered, the wires carry a flow.

const W = 480;
const H = 300;

type Active = { id: string; group?: string; caption: string } | null;
const Ctx = createContext<{ active: Active; set: (a: Active) => void }>({ active: null, set: () => {} });

/** A hoverable part of a drawing. Parts in the same group light up together. */
function Part({ id, group, caption, children }: { id: string; group?: string; caption: string; children: ReactNode }) {
  const { active, set } = useContext(Ctx);
  const on = !!active && (active.id === id || (!!group && active.group === group));
  return (
    <g
      className={on ? 'sch-part is-on' : 'sch-part'}
      onPointerEnter={() => set({ id, group, caption })}
      onPointerLeave={() => set(null)}
    >
      {children}
    </g>
  );
}

/** A box in oblique projection: front face plus a thin top and side, for the exploded look. */
function Slab({ x, y, w, h, d = 8, hot = false, label, sub }: { x: number; y: number; w: number; h: number; d?: number; hot?: boolean; label?: string; sub?: string }) {
  const cls = hot ? 'sch-slab sch-hot' : 'sch-slab';
  return (
    <g className={cls}>
      <path className="sch-face" d={`M${x},${y} h${w} v${h} h${-w} Z`} />
      <path className="sch-top" d={`M${x},${y} l${d},${-d * 0.75} h${w} l${-d},${d * 0.75} Z`} />
      <path className="sch-side" d={`M${x + w},${y} l${d},${-d * 0.75} v${h} l${-d},${d * 0.75} Z`} />
      {label && (
        <text x={x + w / 2} y={y + h / 2 + (sub ? -3 : 4)} textAnchor="middle" className="sch-label">
          {label}
        </text>
      )}
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 11} textAnchor="middle" className="sch-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({ d, dashed = false }: { d: string; dashed?: boolean }) {
  return <path className={dashed ? 'sch-wire sch-dashed' : 'sch-wire'} d={d} markerEnd="url(#sch-arrow)" />;
}

function Note({ x, y, children, anchor = 'start', hot = false }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; hot?: boolean }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={hot ? 'sch-note sch-note-hot' : 'sch-note'}>
      {children}
    </text>
  );
}

/** Dimension line with end ticks, as on a blueprint. */
function Dim({ x1, y1, x2, y2, label, vertical = false }: { x1: number; y1: number; x2: number; y2: number; label: string; vertical?: boolean }) {
  const t = 5;
  return (
    <g className="sch-dim">
      <path d={`M${x1},${y1} L${x2},${y2}`} />
      {vertical ? <path d={`M${x1 - t},${y1} h${2 * t} M${x2 - t},${y2} h${2 * t}`} /> : <path d={`M${x1},${y1 - t} v${2 * t} M${x2},${y2 - t} v${2 * t}`} />}
      <text x={vertical ? x1 + 9 : (x1 + x2) / 2} y={vertical ? (y1 + y2) / 2 + 4 : y1 - 8} textAnchor={vertical ? 'start' : 'middle'} className="sch-note sch-note-dim">
        {label}
      </text>
      {/* A wider invisible stroke so the thin line is easy to point at. */}
      <path className="sch-hit" d={`M${x1},${y1} L${x2},${y2}`} />
    </g>
  );
}

function Gate({ x, y }: { x: number; y: number }) {
  return <path className="sch-gate" d={`M${x},${y - 8} l8,8 l-8,8 l-8,-8 Z`} />;
}

const GATE_CAPTION = 'A gate in plain Python: the model cannot talk its way past a check.';

function Sop() {
  const phases = [
    ['Verify ID', '', 'Phase 1 of 4: verify the caller’s identity.'],
    ['Resolve', 'intent', 'Phase 2 of 4: resolve what the caller needs.'],
    ['Process', 'case', 'Phase 3 of 4: process the case.'],
    ['Post-', 'process', 'Phase 4 of 4: post-process and follow up.'],
  ];
  return (
    <>
      <Part id="llm" caption="The LLM only extracts details and writes replies. It never decides the procedure.">
        <Slab x={170} y={36} w={130} h={34} label="LLM" sub="extract · reply" />
      </Part>
      {phases.map(([a, b, caption], i) => {
        const x = 22 + i * 114;
        return (
          <g key={a}>
            <Arrow d={`M${235},${76} C${235},${110} ${x + 43},${110} ${x + 43},${140}`} dashed />
            <Part id={`phase-${i}`} caption={caption}>
              <Slab x={x} y={150} w={86} h={52} label={a} sub={b || undefined} />
            </Part>
            {i < 3 && (
              <Part id={`gate-${i}`} group="gates" caption={GATE_CAPTION}>
                <path className="sch-wire" d={`M${x + 94},${176} H${x + 112}`} />
                <Gate x={x + 103} y={176} />
              </Part>
            )}
          </g>
        );
      })}
      <Part id="gate-list" group="gates" caption="Gates: identity match, representative consent, and which guidance can be shared.">
        <Note x={22} y={232}>
          gates: identity match, consent, shareable guidance
        </Note>
      </Part>
      <Part id="python" group="gates" caption={GATE_CAPTION}>
        <Note x={22} y={248} hot>
          every gate runs in plain Python
        </Note>
      </Part>
      <Part id="tests" caption="31 unit tests cover the gate logic.">
        <Dim x1={125} y1={268} x2={353} y2={268} label="31 unit tests" />
      </Part>
    </>
  );
}

function StoryWeaver() {
  return (
    <>
      <Part id="book" caption="In: a book, as unstructured text.">
        <Slab x={16} y={118} w={62} h={70} label="book" />
      </Part>
      <path className="sch-wire" d="M84,150 H110" />
      <Part id="split" caption="A LangGraph pipeline splits the story into scenes.">
        <circle className="sch-node" cx={118} cy={150} r={7} />
        <Note x={118} y={176} anchor="middle">
          split
        </Note>
      </Part>
      {[0, 1, 2, 3].map((i) => {
        const y = 52 + i * 52;
        return (
          <Part key={i} id={`scene-${i}`} group="scenes" caption="Scenes are generated in parallel.">
            <Arrow d={`M125,150 C150,150 150,${y + 16} 168,${y + 16}`} />
            <Slab x={176} y={y} w={74} h={32} label={i === 3 ? 'scene n' : `scene ${i + 1}`} />
            <path className="sch-wire" d={`M260,${y + 16} H300`} />
          </Part>
        );
      })}
      <Part id="parallel" group="scenes" caption="Scenes are generated in parallel.">
        <Note x={213} y={276} anchor="middle">
          generated in parallel
        </Note>
      </Part>
      <Part id="persona" caption="A locked persona schema keeps characters consistent from scene to scene.">
        <Slab x={170} y={18} w={86} h={22} d={6} label="persona schema" />
        <path className="sch-wire sch-dashed" d="M262,29 H282 V200" />
        <Note x={288} y={40}>
          locked
        </Note>
      </Part>
      <path className="sch-wire" d="M300,68 V224 M300,150 H318" />
      <Part id="approval" caption="The pipeline pauses for human approval before anything is rendered.">
        <path className="sch-stop" d="M330,138 l12,0 l8,12 l-8,12 l-12,0 l-8,-12 Z" />
        <Note x={336} y={182} anchor="middle" hot>
          human approval
        </Note>
      </Part>
      <Arrow d="M352,150 H376" />
      <Part id="render" caption="Video and ElevenLabs narration are generated in parallel for each scene and joined with MoviePy.">
        <Slab x={384} y={124} w={76} h={52} label="render" sub="MoviePy" />
        <Note x={384} y={204}>
          + narration per scene
        </Note>
      </Part>
    </>
  );
}

function EcoSurve() {
  const frames = Array.from({ length: 13 }, (_, i) => i);
  return (
    <>
      <Part id="footage" caption="Long surveillance footage: the point is that nobody has to watch all of it.">
        <g className="sch-film">
          <path className="sch-face" d="M20,30 h440 v40 h-440 Z" />
          {frames.map((i) => (
            <rect key={i} x={26 + i * 33.4} y={38} width={27} height={24} rx={2} className={i === 9 ? 'sch-frame sch-frame-hot' : 'sch-frame'} style={{ ['--i' as string]: i }} />
          ))}
        </g>
        <Note x={20} y={20}>
          long surveillance footage
        </Note>
      </Part>
      <Arrow d="M150,74 V108" />
      <Part id="univtg" caption="A UniVTG video-language model condenses the footage.">
        <Slab x={96} y={116} w={110} h={40} label="UniVTG" sub="video-language" />
      </Part>
      <Arrow d="M151,160 V190" />
      <Part id="segments" caption="The footage becomes timestamped event segments.">
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x={60 + i * 66} y={198} width={56} height={18} rx={3} className="sch-seg" />
            <path className="sch-tick" d={`M${60 + i * 66},${222} v6`} />
          </g>
        ))}
        <Note x={60} y={244}>
          timestamped event segments
        </Note>
      </Part>
      <Arrow d="M258,207 H300" />
      <Part id="bert" caption="BERT-based retrieval answers questions over those segments.">
        <Slab x={306} y={186} w={120} h={42} label="BERT retrieval" />
        <Note x={366} y={252} anchor="middle">
          answer
        </Note>
      </Part>
      <Part id="source" caption="Each answer points back to the source clip.">
        <path className="sch-wire sch-dashed sch-hot-line" d="M366,184 C366,120 344,100 344,76" markerEnd="url(#sch-arrow-hot)" />
        <Note x={372} y={110} hot>
          pointer to source clip
        </Note>
      </Part>
    </>
  );
}

function Gpt2() {
  const blocks = [0, 1, 2, 3];
  return (
    <>
      <Part id="tokens" caption="Character-level tokens from the Tiny Shakespeare corpus.">
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={120 + i * 22} y={256} width={16} height={16} rx={2} className="sch-token" style={{ ['--i' as string]: i }} />
        ))}
        <Note x={120} y={290}>
          characters (Tiny Shakespeare)
        </Note>
      </Part>
      <Part id="embed" caption="Token and learned positional embeddings.">
        <Slab x={116} y={214} w={216} h={22} label="token + positional embeddings" />
      </Part>
      {blocks.map((i) => (
        <Part key={i} id={`block-${i}`} caption={`Decoder block ${i + 1} of 4: masked causal self-attention, written from scratch in PyTorch.`}>
          <Slab x={116} y={170 - i * 38} w={216} h={24} label="decoder block" />
        </Part>
      ))}
      <path className="sch-wire sch-dashed" d="M108,40 V246 M340,40 V246" />
      <Part id="next" caption="The model predicts the next character.">
        <Slab x={150} y={22} w={148} h={20} hot label="next character" />
      </Part>
      <Part id="params" caption="7.24M parameters. Perplexity fell from 12.07 to 4.56 against a bigram baseline.">
        <Dim x1={372} y1={30} x2={372} y2={240} vertical label="7.24M params" />
      </Part>
      <Part id="attention" caption="Each block applies masked causal self-attention, so a character only sees what came before it.">
        <Note x={20} y={110}>
          masked causal
        </Note>
        <Note x={20} y={124}>
          self-attention
        </Note>
        <path className="sch-wire sch-dashed" d="M96,116 H112" />
      </Part>
    </>
  );
}

const DIAGRAMS: Record<string, { body: () => ReactNode; label: string }> = {
  sop: { body: Sop, label: 'Four procedure phases in a row with a Python gate between each, an LLM above them that extracts and replies, and a bracket marking 31 unit tests.' },
  storyweaver: { body: StoryWeaver, label: 'A book split into scenes generated in parallel under a locked persona schema, a human approval stop, then render with MoviePy.' },
  ecosurve: { body: EcoSurve, label: 'Long footage condensed by UniVTG into timestamped segments, searched by BERT retrieval, with the answer pointing back to its source clip.' },
  gpt2: { body: Gpt2, label: 'An exploded decoder-only Transformer: character tokens, embeddings, a stack of decoder blocks, and a next-character output, dimensioned at 7.24M parameters.' },
};

const HINT = 'Point at any part of the drawing.';

/** Exploded mini-diagram drawn in code for a project's spec sheet. */
export function Schematic({ id }: { id: string }) {
  const [active, set] = useState<Active>(null);
  const d = DIAGRAMS[id];
  if (!d) return null;
  const Body = d.body;
  return (
    <Ctx.Provider value={{ active, set }}>
      <div className="schematic-wrap" data-schematic={id}>
        <svg className={active ? 'schematic has-active' : 'schematic'} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={d.label} preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="sch-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" className="sch-arrowhead" />
            </marker>
            <marker id="sch-arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L8,4 L0,8 Z" className="sch-arrowhead-hot" />
            </marker>
            <pattern id="sch-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M16,0 H0 V16" className="sch-gridline" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#sch-grid)" />
          <Body />
        </svg>
        <div className="sch-caption" aria-hidden="true">
          {active ? (
            <p className="sch-explain">
              <span className="sch-explain-mark" />
              {active.caption}
            </p>
          ) : (
            <Hint icon={<PointerIcon />}>{HINT}</Hint>
          )}
        </div>
      </div>
    </Ctx.Provider>
  );
}
