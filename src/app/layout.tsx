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
import "./operations.css";
import type { Metadata } from "next";
import { headers } from 'next/headers';
import { publicDomain } from '@/lib/public-domain';

export async function generateMetadata(): Promise<Metadata> {
  const request = await headers();
  const domain = publicDomain(request.get('x-forwarded-host') ?? request.get('host'));
  const english = domain.language === 'en';
  return {
    metadataBase: new URL(domain.origin),
    alternates: { canonical: "./" },
    title: english ? 'DefaultStackR — Your stack. Your cloud.' : "DefaultStackr — Bouw. Beheer. Groei.",
    description:
      english ? 'DefaultStackR by CodedByDefault: one workspace for applications, databases and deployments.' : "DefaultStackr van CodedByDefault: één werkruimte voor projecten, databases en uitrollen.",
    openGraph: {
      title: "DefaultStackr by CodedByDefault",
      description: english ? 'Applications, databases and deployments in one workspace. Follow the development of DefaultStackR.' : "Eén werkruimte voor projecten, databases en uitrollen. Volg de ontwikkeling van DefaultStackr.",
      siteName: "DefaultStackr",
      url: domain.origin,
      type: "website",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const request = await headers();
  const domain = publicDomain(request.get('x-forwarded-host') ?? request.get('host'));
  return (
    <html lang={domain.language} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('defaultstackr-theme')==='dark')document.documentElement.dataset.theme='dark'}catch{}" }} /></head>
      <body>{children}</body>
    </html>
  );
}
