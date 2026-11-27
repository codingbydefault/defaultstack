'use client';
import { useState } from 'react';
export function GitHubSetup() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function start() {
    setBusy(true);setError('');
    try {
      const response=await fetch('/api/github/setup',{method:'POST'});
      const data=await response.json();
      if (!response.ok || typeof data.action!=='string' || !data.action.startsWith('https://github.com/settings/apps/new?state=')) throw new Error(data.error||'GitHub-inrichting starten mislukt.');
      const form=document.createElement('form');form.action=data.action;form.method='post';
      const manifest=document.createElement('input');manifest.type='hidden';manifest.name='manifest';manifest.value=JSON.stringify(data.manifest);form.append(manifest);document.body.append(form);form.submit();
    } catch(cause) {setError(cause instanceof Error?cause.message:'Probeer opnieuw.');setBusy(false);}
  }
  return <section className="profile-note"><h2>GitHub voor repositories</h2><p>Maak een eigen GitHub App voor leestoegang tot repositories die je zelf selecteert. Je controleert en bevestigt de app op GitHub. Aanmeldgegevens worden rechtstreeks op je server bewaard.</p><button className="primary" type="button" disabled={busy} onClick={()=>void start()}>{busy?'GitHub openen…':'GitHub App instellen'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
