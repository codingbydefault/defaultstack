import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.defaultstack.online"),
  alternates: { canonical: "./" },
  title: "DefaultStack — Build. Deploy. Scale.",
  description:
    "DefaultStack by CodedByDefault is developing a unified application and database platform.",
  openGraph: {
    title: "DefaultStack by CodedByDefault",
    description: "Building an integrated cloud development platform. Follow our progress.",
    siteName: "DefaultStack",
    url: "https://www.defaultstack.online",
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
