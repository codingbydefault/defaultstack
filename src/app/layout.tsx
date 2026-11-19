import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/onest/400.css";
import "@fontsource/onest/500.css";
import "@fontsource/onest/600.css";
import "./globals.css";
import "./brand.css";
import "./tokens.css";
import "./light-ui.css";
import "./theme.css";
import type { Metadata } from "next";
import { PUBLIC_SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_URL),
  alternates: { canonical: "./" },
  title: "DefaultStackr — Bouw. Beheer. Groei.",
  description:
    "DefaultStackr van CodedByDefault: één werkruimte voor projecten, databases en uitrollen.",
  openGraph: {
    title: "DefaultStackr by CodedByDefault",
    description: "Eén werkruimte voor projecten, databases en uitrollen. Volg de ontwikkeling van DefaultStackr.",
    siteName: "DefaultStackr",
    url: PUBLIC_SITE_URL,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('defaultstackr-theme')==='dark')document.documentElement.dataset.theme='dark'}catch{}" }} /></head>
      <body>{children}</body>
    </html>
  );
}
