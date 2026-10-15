import { CardReview } from "./CardReview";

// No page title: everyone but the admin sees the not-found page.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AdminCardsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <CardReview />
    </main>
  );
}
