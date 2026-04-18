import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "The Clarity Hub — AI systems & SOPs for founders",
  description:
    "AI systems and SOPs for founders who are brilliant at what they do — and tired of being the only one who knows how it's done.",
  metadataBase: new URL("https://clarityhub.com.au"),
  openGraph: {
    title: "The Clarity Hub",
    description:
      "Document what's in your head, automate what drains you, and finally hand things off.",
    url: "https://clarityhub.com.au",
    siteName: "The Clarity Hub",
    locale: "en_AU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
