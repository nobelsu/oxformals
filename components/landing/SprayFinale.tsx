import { Reveal } from "@/components/landing/Reveal";

const TAGLINE = "find your next formal";

/**
 * Full-bleed closing panel. It breaks out of the page's max-width column to the
 * full viewport width, and a tall runway lets it pin (`position: sticky`) at the
 * top for most of a viewport of scroll — so as the reader scrolls off the last
 * Sand section, that content is pulled up and the rose page rises to fill the
 * whole screen, recolouring the entire viewport (Studio Marrone style).
 *
 * No canvas, no pointer listeners — the transition is pure scroll + sticky, so
 * it behaves identically on touch and under reduced motion. Only the tagline's
 * fade-in is motion, and `Reveal` already no-ops that when motion is reduced.
 */
export function SprayFinale() {
  return (
    <section
      aria-label="Find your next formal"
      className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-[170svh] w-screen"
    >
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden bg-[var(--accent)] px-6">
        <Reveal distance={28}>
          <p className="max-w-[13ch] text-center font-display text-[clamp(3.5rem,13vw,9rem)] font-bold lowercase leading-[0.88] tracking-tight text-[var(--tag-ink)]">
            {TAGLINE}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
