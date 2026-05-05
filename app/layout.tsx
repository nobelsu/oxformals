import type { Metadata } from "next";
import { Schoolbell } from "next/font/google";
import "./globals.css";
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
    <html
      lang="en"
      className={`${schoolbell.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <DataProvider>
            <Nav />
            <div className="flex-1 flex flex-col">{children}</div>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
