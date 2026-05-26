"use client";

import { useCallback, useEffect, useState } from "react";
import { LetterEnvironment } from "@/components/letter/LetterEnvironment";
import { NewsletterLetter } from "@/components/letter/NewsletterLetter";

type Phase = "sealed" | "opening" | "letter";

const OPENING_MS = 700;

export function NewsletterExperience() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const prefersReduced = mq.matches;
      setReducedMotion(prefersReduced);
      setPhase((current) => {
        if (prefersReduced) return "letter";
        if (current === "letter" || current === "opening") return current;
        return "sealed";
      });
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const handleOpen = useCallback(() => {
    if (reducedMotion || phase !== "sealed") return;
    setPhase("opening");
    window.setTimeout(() => setPhase("letter"), OPENING_MS);
  }, [reducedMotion, phase]);

  if (phase === null) {
    return <main className="newsletter-page min-h-dvh" aria-busy="true" />;
  }

  const showInvite = phase === "sealed" || phase === "opening";
  const showLetter = phase === "letter";

  return (
    <main
      className={[
        "newsletter-page relative flex min-h-dvh flex-col overflow-x-hidden",
        showLetter
          ? "items-stretch justify-start overflow-y-auto"
          : "items-center justify-center",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showInvite && (
        <div
          className={[
            "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
            showLetter ? "pointer-events-none opacity-0" : "opacity-100",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-hidden={showLetter}
        >
          <LetterEnvironment
            phase={phase === "opening" ? "opening" : "idle"}
            onOpen={handleOpen}
            disabled={phase === "opening"}
          />
        </div>
      )}

      {showLetter && (
        <div className="relative z-10 mx-auto flex w-full max-w-[46rem] flex-col px-4 py-8 sm:py-12">
          <NewsletterLetter animateIn={!reducedMotion} />
        </div>
      )}
    </main>
  );
}
