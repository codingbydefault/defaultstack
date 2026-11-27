'use client';
import Link from 'next/link';
import { useId, useRef } from 'react';

export function CookieSettings({ language = 'nl' }: { language?: 'nl' | 'en' }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const en = language === 'en';
  return <>
    <button className="footer-cookie-settings" type="button" onClick={() => dialog.current?.showModal()}>{en ? 'Cookie settings' : 'Cookie-instellingen'}</button>
    <dialog className="cookie-dialog" ref={dialog} aria-labelledby={title} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <h2 id={title}>{en ? 'Cookies and local storage' : 'Cookies en lokale opslag'}</h2>
      <p>{en ? 'This website uses functional storage for signing in, security and preferences you choose, such as the colour theme. No advertising cookies or visitor-tracking scripts are active on the public website.' : 'Deze website gebruikt functionele opslag voor inloggen, beveiliging en voorkeuren die je zelf kiest, zoals het kleurenthema. Op de publieke website zijn geen advertentiecookies of scripts voor bezoekerstracking actief.'}</p>
      <p>{en ? 'There are currently no optional cookies to enable. If that changes, we will ask for your consent before they start and make withdrawal just as easy.' : 'Er zijn momenteel geen optionele cookies om aan te zetten. Als dat verandert, vragen we vooraf je toestemming en kun je die even eenvoudig intrekken.'}</p>
      <Link href="/cookies" onClick={() => dialog.current?.close()}>{en ? 'Read the cookie list and retention periods' : 'Bekijk de cookielijst en bewaartermijnen'}</Link>
      <form method="dialog"><button className="primary" type="submit">{en ? 'Close' : 'Sluiten'}</button></form>
    </dialog>
  </>;
}
