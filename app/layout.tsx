import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DataProvider } from "@/components/data/DataProvider";
import { Nav } from "@/components/Nav";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { BadgeCelebration } from "@/components/badges/BadgeCelebration";
import { InviteClaimer } from "@/components/invites/InviteClaimer";

// Self-hosted (Latin subset, from Google Fonts, both under the SIL Open Font
// Licence) so builds never depend on reaching fonts.gstatic.com.
const schoolbell = localFont({
  src: "./fonts/Schoolbell-latin.woff2",
  variable: "--font-schoolbell",
  weight: "400",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/SpaceGrotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

// Optional fonts from the UI font picker (globals.css, html[data-ui-font]).
// Variable Latin subsets, not preloaded: most people never pick them.
const inter = localFont({
  src: [
    { path: "./fonts/Inter-latin.woff2", style: "normal" },
    { path: "./fonts/Inter-Italic-latin.woff2", style: "italic" },
  ],
  variable: "--font-inter",
  weight: "400 700",
  display: "swap",
  preload: false,
});

const dmSans = localFont({
  src: [
    { path: "./fonts/DMSans-latin.woff2", style: "normal" },
    { path: "./fonts/DMSans-Italic-latin.woff2", style: "italic" },
  ],
  variable: "--font-dm-sans",
  weight: "400 700",
  display: "swap",
  preload: false,
});

const lora = localFont({
  src: [
    { path: "./fonts/Lora-latin.woff2", style: "normal" },
    { path: "./fonts/Lora-Italic-latin.woff2", style: "italic" },
  ],
  variable: "--font-lora",
  weight: "400 700",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://oxformals.com",
  ),
  title: "Oxformals",
  description: "Find your next formal.",
  icons: {
    icon: { url: "/logo.JPG", type: "image/jpeg" },
    apple: { url: "/logo.JPG", type: "image/jpeg" },
  },
  openGraph: {
    title: "Oxformals",
    description: "Find your next formal.",
    images: [{ url: "/logo.JPG" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${schoolbell.variable} ${spaceGrotesk.variable} ${inter.variable} ${dmSans.variable} ${lora.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <AuthProvider>
              <DataProvider>
                <Nav />
                <div className="flex-1 flex flex-col">{children}</div>
                <OnboardingOverlay />
                <BadgeCelebration />
                <InviteClaimer />
              </DataProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
