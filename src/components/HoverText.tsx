/**
 * Heading text whose letters heat up under the pointer: the hovered letter lifts and glows Molten,
 * its neighbours warm a little. Assistive tech reads the whole text once (the letters are hidden
 * from it); the letters stay selectable, and the hidden copy is left out of copied text.
 */
export function HoverText({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      <span className="sr-only htext-sr">{text}</span>
      <span className="htext" aria-hidden="true">
        {words.map((w, i) => (
          <span key={i}>
            <span className="hword">
              {[...w].map((ch, k) => (
                <span key={k} className="hch">
                  {ch}
                </span>
              ))}
            </span>
            {i < words.length - 1 && ' '}
          </span>
        ))}
      </span>
    </>
  );
}
