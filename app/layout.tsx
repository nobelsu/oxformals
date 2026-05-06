import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Schoolbell } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DataProvider } from "@/components/data/DataProvider";
import { Nav } from "@/components/Nav";

const schoolbell = Schoolbell({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "FormalSwap",
  description: "Find your next formal.",
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
        className={`${schoolbell.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <AuthProvider>
              <DataProvider>
                <Nav />
                <div className="flex-1 flex flex-col">{children}</div>
              </DataProvider>
            </AuthProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
