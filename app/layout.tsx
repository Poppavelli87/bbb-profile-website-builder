import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "BBB Profile Website Builder",
  description:
    "Generate privacy-first, accessibility-first static business websites from BBB profile captures with compliance guardrails."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
