'use client';

import { useState } from 'react';

type View = 'code' | 'data' | 'deploy';

const views: { id: View; label: string }[] = [
  { id: 'code', label: 'Code' },
  { id: 'data', label: 'Database' },
  { id: 'deploy', label: 'Uitrollen' },
];

export function LandingWorkbench() {
  const [view, setView] = useState<View>('code');

  return <div className="landing-workbench" aria-label="Interactieve voorbeeldweergave van de werkruimte">
    <div className="workbench-header">
      <div><span className="workbench-mark" aria-hidden="true">◈</span><strong>Jouw werkruimte</strong><small>Interactief voorbeeld</small></div>
      <span className="workbench-project">studio-project</span>
    </div>
    <div className="workbench-tabs" role="tablist" aria-label="Voorbeeldonderdelen">
      {views.map(item => <button key={item.id} type="button" role="tab" aria-selected={view === item.id} aria-controls="workbench-panel" id={`workbench-${item.id}`} onClick={() => setView(item.id)}>{item.label}</button>)}
    </div>
    <div className="workbench-panel" id="workbench-panel" role="tabpanel" aria-labelledby={`workbench-${view}`} key={view}>
      {view === 'code' && <><div className="workbench-toolbar"><span>app / page.tsx</span><span>GitHub repository</span></div><pre><code><span className="code-keyword">export default function</span> Home() {'{'}{'\n'}  <span className="code-keyword">return</span> ({'\n'}    &lt;main&gt;{'\n'}      &lt;h1&gt;Jouw volgende idee&lt;/h1&gt;{'\n'}    &lt;/main&gt;{'\n'}  );{'\n'}{'}'}</code></pre><p>Open en bewerk tekstbestanden van je gekoppelde repository.</p></>}
      {view === 'data' && <><div className="workbench-toolbar"><span>migraties / 001_start.sql</span><span>PostgreSQL</span></div><pre><code><span className="code-keyword">CREATE TABLE</span> projecten ({'\n'}  id <span className="code-keyword">BIGSERIAL PRIMARY KEY</span>,{'\n'}  naam <span className="code-keyword">TEXT NOT NULL</span>,{'\n'}  aangemaakt_op <span className="code-keyword">TIMESTAMPTZ</span>{'\n'});</code></pre><p>Beheer SQL-migraties naast je project.</p></>}
      {view === 'deploy' && <><div className="workbench-toolbar"><span>Uitrollen</span><span>Projectoverzicht</span></div><div className="workbench-deploy"><strong>Van repository naar projectadres</strong><ol><li>Repository koppelen</li><li>Build en logboeken volgen</li><li>Domein instellen</li></ol></div><p>Klantbuilds worden beschikbaar zodra ze veilig geïsoleerd draaien.</p></>}
    </div>
  </div>;
}
