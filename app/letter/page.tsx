import type { Metadata } from "next";
import { Suspense } from "react";
import { NewsletterExperience } from "@/components/letter/NewsletterExperience";

export const metadata: Metadata = {
  title: "A note from the team · Oxformals",
  robots: { index: false, follow: false },
};

export default function LetterPage() {
  return (
    <Suspense fallback={null}>
      <NewsletterExperience />
    </Suspense>
  );
}
