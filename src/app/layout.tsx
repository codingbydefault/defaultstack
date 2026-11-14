import "./globals.css";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "./" },
  title: "DefaultStack — Build. Deploy. Scale.",
  description:
    "DefaultStack by CodedByDefault is developing a unified application and database platform.",
  openGraph: {
    title: "DefaultStack by CodedByDefault",
    description: "Building an integrated cloud development platform. Follow our progress.",
    siteName: "DefaultStack",
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
