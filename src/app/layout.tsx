import "./globals.css";
import "./brand.css";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  title: "DefaultStackr — Bouw. Beheer. Groei.",
  description:
    "DefaultStackr van CodedByDefault: één werkruimte voor projecten, databases en uitrollen.",
  openGraph: {
    title: "DefaultStackr by CodedByDefault",
    description: "Eén werkruimte voor projecten, databases en uitrollen. Volg de ontwikkeling van DefaultStackr.",
    siteName: "DefaultStackr",
    url: SITE_URL,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
