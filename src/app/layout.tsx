import "./globals.css";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  title: "DefaultStackr — Build. Deploy. Scale.",
  description:
    "DefaultStackr by CodedByDefault is developing a unified application and database platform.",
  openGraph: {
    title: "DefaultStackr by CodedByDefault",
    description: "Building an integrated cloud development platform. Follow our progress.",
    siteName: "DefaultStackr",
    url: SITE_URL,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
