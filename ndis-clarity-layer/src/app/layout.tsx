import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NDIS Clarity Layer",
  description:
    "Turn daily support case notes into structured, compliant, NDIS-ready outputs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
