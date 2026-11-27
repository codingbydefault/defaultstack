'use client';
import { useState } from 'react';

type View = 'code' | 'data' | 'deploy';
export function LandingWorkbench({ language = 'nl' }: { language?: 'nl' | 'en' } = {}) {
  const [view, setView] = useState<View>('code');
  const en = language === 'en';
  const text = (nl: string, english: string) => en ? english : nl;
  const views: { id: View; label: string }[] = [
    { id: 'code', label: 'Code' }, { id: 'data', label: 'Database' }, { id: 'deploy', label: text('Uitrollen','Deployments') },
  ];
  return <div className="landing-workbench" aria-label={text('Interactieve voorbeeldweergave van de werkruimte','Interactive workspace preview')}>
    <div className="workbench-header"><div><span className="workbench-mark" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></svg></span><strong>{text('Jouw werkruimte','Your workspace')}</strong><small>{text('Interactief voorbeeld','Interactive example')}</small></div><span className="workbench-project">studio-project</span></div>
    <div className="workbench-tabs" role="tablist" aria-label={text('Voorbeeldonderdelen','Preview sections')}>
      {views.map((item,index) => <button key={item.id} type="button" role="tab" tabIndex={view === item.id ? 0 : -1} aria-selected={view === item.id} aria-controls="workbench-panel" id={`workbench-${item.id}`} onClick={() => setView(item.id)} onKeyDown={event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % views.length;
        else if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = views.length - 1;
        else return;
        event.preventDefault(); setView(views[next].id); document.getElementById(`workbench-${views[next].id}`)?.focus();
      }}>{item.label}</button>)}
    </div>
    <div className="workbench-panel" id="workbench-panel" role="tabpanel" aria-labelledby={`workbench-${view}`} key={view}>
      {view === 'code' && <><div className="workbench-toolbar"><span>app / page.tsx</span><span>GitHub repository</span></div><pre><code><span className="code-keyword">export default function</span> Home() {'{'}{'\n'}  <span className="code-keyword">return</span> ({'\n'}    &lt;main&gt;{'\n'}      &lt;h1&gt;{text('Jouw volgende idee','Your next idea')}&lt;/h1&gt;{'\n'}    &lt;/main&gt;{'\n'}  );{'\n'}{'}'}</code></pre><p>{text('Open en bewerk tekstbestanden van je gekoppelde repository.','Open and edit text files from your connected repository.')}</p></>}
      {view === 'data' && <><div className="workbench-toolbar"><span>{text('migraties / 001_start.sql','migrations / 001_start.sql')}</span><span>PostgreSQL</span></div><pre><code><span className="code-keyword">CREATE TABLE</span> {text('projecten','projects')} ({'\n'}  id <span className="code-keyword">BIGSERIAL PRIMARY KEY</span>,{'\n'}  {text('naam','name')} <span className="code-keyword">TEXT NOT NULL</span>,{'\n'}  {text('aangemaakt_op','created_at')} <span className="code-keyword">TIMESTAMPTZ</span>{'\n'});</code></pre><p>{text('Beheer SQL-migraties naast je project.','Manage SQL migrations alongside your project.')}</p></>}
      {view === 'deploy' && <><div className="workbench-toolbar"><span>{text('Uitrollen','Deployments')}</span><span>{text('Projectoverzicht','Project overview')}</span></div><div className="workbench-deploy"><strong>{text('Van repository naar projectadres','From repository to project address')}</strong><ol><li>{text('Repository koppelen','Connect a repository')}</li><li>{text('Build en logboeken volgen','Follow builds and logs')}</li><li>{text('Domein instellen','Set up a domain')}</li></ol></div><p>{text('Klantbuilds worden beschikbaar zodra ze veilig geïsoleerd draaien.','Customer builds will become available once they run in safely isolated environments.')}</p></>}
    </div>
  </div>;
}
