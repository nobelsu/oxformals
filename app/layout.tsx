import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Space_Grotesk, Schoolbell } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DataProvider } from "@/components/data/DataProvider";
import { Nav } from "@/components/Nav";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";

const schoolbell = Schoolbell({
  variable: "--font-schoolbell",
  subsets: ["latin"],
  weight: "400",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

/** Self-hosted Schoolbell; Inter / DM Sans / Lora load via stylesheet so `font-family: "Inter"` etc. always resolve. */
const googleUiFontsHref =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${schoolbell.variable} ${spaceGrotesk.variable} h-full antialiased`}
      >
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link rel="stylesheet" href={googleUiFontsHref} />
        </head>
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <AuthProvider>
              <DataProvider>
                <Nav />
                <div className="flex-1 flex flex-col">{children}</div>
                <OnboardingOverlay />
              </DataProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
