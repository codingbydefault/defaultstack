import Link from 'next/link';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { getPublicLanguage } from '@/lib/public-request';

export async function generateMetadata() {
  const en = (await getPublicLanguage()) === 'en';
  return { title: en ? 'Cookies and local storage | DefaultStackr' : 'Cookies en lokale opslag | DefaultStackr', alternates: { canonical: '/cookies' } };
}
export default async function CookiesPage() {
  const language = await getPublicLanguage();
  const en = language === 'en';
  const text = (nl: string, english: string) => en ? english : nl;
  const rows = [
    ['better-auth.session_token / __Secure-better-auth.session_token', text('Inloggen op het portaal','Portal sign-in'), text('7 dagen','7 days')],
    ['better-auth.oauth_state / __Secure-better-auth.oauth_state', text('De beveiligde GitHub-aanmeldpoging controleren','Validate the secure GitHub sign-in attempt'), text('10 minuten; vervalt na afronding','10 minutes; expires after completion')],
    ['ds_session', text('Een afzonderlijke beheerderssessie onthouden','Remember a separate administrator session'), text('7 dagen','7 days')],
    ['ds_github / ds_github_state', text('Een door jou gekozen repositorykoppeling en de controle ervan','A repository connection you choose and its security check'), text('30 dagen / 10 minuten','30 days / 10 minutes')],
    ['__Host-ds_github_setup', text('De eenmalige inrichting van de eigen GitHub App beveiligen','Secure the one-time setup of the owner’s GitHub App'), text('10 minuten','10 minutes')],
    ['ds_billing_currency', text('Je gekozen betaalvaluta onthouden','Remember your selected billing currency'), text('1 jaar','1 year')],
    ['defaultstackr-theme (localStorage)', text('Het door jou gekozen lichte of donkere thema onthouden','Remember the light or dark theme you choose'), text('Tot je de voorkeur of browseropslag wist','Until you clear the preference or browser storage')],
  ];
  return <main className="legal-page" lang={language}>
    <a className="skip-link" href="#cookies-title">{text('Naar de inhoud','Skip to content')}</a>
    <header className="legal-header wrap"><Link className="brand" href="/">DefaultStackR</Link><div className="legal-header-actions"><ThemeToggle language={language}/><Link href="/privacy">{text('Privacyverklaring','Privacy policy')}</Link></div></header>
    <article className="legal-content wrap"><h1 id="cookies-title" tabIndex={-1}>{text('Cookies en lokale opslag','Cookies and local storage')}</h1><p className="legal-date">{text('Versie 27 november 2026','Version 27 November 2026')}</p>
      <p>{text('DefaultStackR gebruikt alleen functionele opslag voor de dienst die je kiest en voor beveiliging. De publieke website laadt geen advertentiecookies of scripts om je over websites te volgen. Lettertypen en logo’s worden vanaf onze eigen website geladen. Voor uitsluitend functionele opslag is geen cookietoestemming nodig.','DefaultStackR uses functional storage for the service you choose and for security. The public website does not load advertising cookies or scripts that track you across websites. Fonts and logos are loaded from our own website. Functional storage does not require cookie consent.')}</p>
      <section><h2>{text('Welke opslag gebruiken we?','What storage do we use?')}</h2><p>{text('Aanmeld- en koppelingscookies worden gebruikt wanneer je die functies kiest. De onderstaande termijnen zijn de maximale ingestelde looptijden; uitloggen of afronden kan een cookie eerder wissen.','Sign-in and connection cookies are used when you choose those functions. The periods below are the configured maximum lifetimes; signing out or completing a flow may delete a cookie earlier.')}</p><div className="cookie-table-scroll" role="region" aria-label={text('Cookielijst','Cookie list')} tabIndex={0}><table className="cookie-table"><thead><tr><th>{text('Naam','Name')}</th><th>{text('Doel','Purpose')}</th><th>{text('Bewaartermijn','Lifetime')}</th></tr></thead><tbody>{rows.map(([name,purpose,lifetime]) => <tr key={name}><td><code>{name}</code></td><td>{purpose}</td><td>{lifetime}</td></tr>)}</tbody></table></div></section>
      <section><h2>{text('Beveiliging en externe diensten','Security and external services')}</h2><p>{text('Cloudflare verzorgt verkeer en beveiliging. Wanneer een beveiligingscontrole of Cloudflare Access-aanmelding nodig is, kan Cloudflare daarvoor functionele beveiligingscookies gebruiken. Deze verschillen per controle en zijn geen toestemming voor advertenties. GitHub opent pas wanneer je voor de GitHub-aanmelding of repositorykoppeling kiest. Stripe opent pas wanneer je een betaalfunctie kiest; live afrekenen is nog niet actief. Op de websites van die aanbieders geldt ook hun eigen cookiebeleid.','Cloudflare handles traffic and security. When a security check or Cloudflare Access sign-in is needed, Cloudflare may use functional security cookies. These vary by check and do not authorise advertising. GitHub opens when you choose GitHub sign-in or a repository connection. Stripe opens when you choose a payment function; live checkout is not active yet. Those providers also apply their own cookie policies on their websites.')}</p></section>
      <section><h2>{text('Je voorkeuren beheren','Manage your preferences')}</h2><p>{text('Je kunt uitloggen om je sessie te beëindigen, het thema wijzigen via de themaknop en opslag wissen via je browserinstellingen. Als je noodzakelijke cookies blokkeert, kan inloggen niet werken. Er zijn nu geen optionele trackingcookies om toestemming voor te geven of in te trekken. Voordat we die eventueel toevoegen, vragen we afzonderlijk toestemming, met een gelijkwaardige weigerkeuze en een blijvend vindbare mogelijkheid om die toestemming in te trekken.','You can sign out to end your session, change the theme with the theme button and clear storage in your browser settings. Blocking necessary cookies may prevent sign-in. There are currently no optional tracking cookies to consent to or withdraw. Before adding any, we will request separate consent with an equivalent refusal option and an accessible way to withdraw consent.')}</p><p>{text('Voor informatie over persoonsgegevens en je rechten:','For information about personal data and your rights:')} <Link href="/privacy">{text('privacyverklaring','privacy policy')}</Link>. <a href="mailto:codedbydefault@gmail.com">codedbydefault@gmail.com</a>.</p></section>
    </article><SiteFooter language={language}/>
  </main>;
}
