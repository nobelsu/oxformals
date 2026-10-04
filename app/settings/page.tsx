import { Suspense } from "react";
import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
