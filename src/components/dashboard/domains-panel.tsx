'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ApiError, dashboardApi } from '@/lib/api/client';
import type { DnsRecord, Domain, DomainKind, DomainStatus } from '@/lib/api/types';
import { CopyButton } from '@/components/dashboard/copy-button';
import { chipClass, domainStatusLabel, formatWhen, redirectLabel } from '@/components/dashboard/format';

const steps: DomainStatus[] = ['pending_verification', 'verified', 'ssl_active', 'live'];

function recordTitle(record: DnsRecord): string {
  if (record.type === 'TXT') return 'TXT';
  if (record.flattening) return 'CNAME, Cloudflare flattening';
  if (record.type === 'ALIAS') return 'ALIAS';
  if (record.type === 'A') return 'A';
  return 'CNAME';
}

function Stepper({ status, failed }: { status: DomainStatus; failed: boolean }) {
  const current = steps.indexOf(status);
  return (
    <ol className="stepper" aria-label="DNS-status">
      {steps.map((step, index) => {
        const state = index < current ? 'done' : index === current ? (failed ? 'error' : 'current') : '';
        return <li key={step} className={state}><span>{index + 1}</span>{domainStatusLabel[step]}</li>;
      })}
    </ol>
  );
}

function RegistrarHelp({ domain }: { domain: Domain }) {
  if (domain.routingOptions?.length) return <p className="console-callout">Maak het TXT-record hierboven aan om eigendom te bewijzen. Kies daarnaast één van de routeringsroutes hieronder die jouw DNS-provider ondersteunt. Een www-CNAME alleen laat het hoofddomein nog niet werken; stel daarvoor bij je provider ook een doorverwijzing naar www in.</p>;
  const lines = domain.records.map(record => `${recordTitle(record)}  ${record.host}  →  ${record.value}`).join('\n');
  const hasFlattening = domain.records.some(record => record.flattening);
  const hasAlias = domain.records.some(record => record.type === 'ALIAS');
  const hasA = domain.records.some(record => record.type === 'A');
  const sections = [
    {
      id: 'generic',
      title: 'Algemeen',
      body: `Maak onderstaande records exact aan. Het hostveld is het relatieve label (@, www of het subdomein). Sommige panelen willen de volledige naam uit de kolom FQDN. Verwijder een bestaand A-, AAAA- of CNAME-record op dezelfde host. Sla op en kies daarna Controleer opnieuw.\n\n${lines}`,
    },
    {
      id: 'cloudflare',
      title: 'Cloudflare',
      body: hasFlattening
        ? `Cloudflare vlakt een CNAME op het kale domein af. Zet het apex-record op @ met type CNAME en het getoonde doel, proxy aan (oranje wolk). Een subdomein is een gewone CNAME, proxy aan of uit. Het TXT-record zet je op DNS only. DefaultStackr doet de doorverwijzing tussen apex en www zelf, dus je hebt geen extra redirect rule nodig.\n\n${lines}`
        : hasA
          ? `De API vraagt hier een A-record. Vul het IPv4-adres in bij @ en zet de proxy aan. Subdomeinen blijven een CNAME naar het doel. TXT blijft DNS only, met de token als waarde zonder aanhalingstekens.\n\n${lines}`
          : `De API vraagt een ALIAS/ANAME. In Cloudflare gebruik je daarvoor CNAME-flattening op @ naar hetzelfde doel, proxy aan. Subdomeinen zijn een CNAME. TXT zet je op DNS only.\n\n${lines}`,
    },
    {
      id: 'transip',
      title: 'TransIP',
      body: hasAlias
        ? `Kies bij het kale domein het type ALIAS of ANAME en plak het doel. TransIP weigert een gewone CNAME op @. Een subdomein is type CNAME: naam het label, waarde het doel. Zet er een punt achter als het paneel dat vraagt. TXT: naam _defaultstackr-verify (plus het subdomeinlabel als het geen apex is), waarde het token.\n\n${lines}`
        : hasA
          ? `Kies type A, laat de naam leeg of vul @ in, en plak het IPv4-adres. Voor www of een ander subdomein kies je CNAME. TXT komt op naam _defaultstackr-verify met het token als waarde.\n\n${lines}`
          : `TransIP accepteert meestal geen CNAME op het kale domein. Staat er flattening in de lijst, gebruik dan ALIAS/ANAME naar hetzelfde doel, of vraag een A-record via Controleer opnieuw zodra de API die vorm levert. Subdomeinen blijven CNAME.\n\n${lines}`,
    },
    {
      id: 'mijndomein',
      title: 'Mijndomein',
      body: `Open DNS-beheer en voeg een record toe. Het kale domein ondersteunt geen gewone CNAME: gebruik het A-record of ALIAS dat hier staat, met een lege naam of @. Een subdomein is type CNAME, naam het label, doel exact overnemen. TXT: naam _defaultstackr-verify of de volledige host, waarde het token. Wacht daarna op propagatie voor je opnieuw controleert.\n\n${lines}`,
    },
  ];
  return (
    <div className="registrar-help">
      <h3>Hulp per registrar</h3>
      {sections.map(section => (
        <details key={section.id} name={`dns-${domain.id}`}>
          <summary>{section.title}</summary>
          <p>{section.body}</p>
        </details>
      ))}
    </div>
  );
}

export function DomainsPanel({ projectId, previewHost }: { projectId: string; previewHost: string }) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [hostname, setHostname] = useState('');
  const [kind, setKind] = useState<DomainKind>('apex');
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    dashboardApi.domains(projectId)
      .then(items => { if (active) setDomains(items); })
      .catch(cause => { if (active) setError(cause instanceof ApiError ? cause.message : 'Domeinen laden mislukt.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId]);

  async function add(event: FormEvent) {
    event.preventDefault();
    setBusy('add');
    setError('');
    try {
      const created = await dashboardApi.addDomain(projectId, { hostname, kind, redirect: 'none' });
      setDomains(current => [created, ...current]);
      setHostname('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Domein toevoegen mislukt.');
    } finally {
      setBusy('');
    }
  }

  async function check(id: string) {
    setBusy(id);
    setError('');
    try {
      const updated = await dashboardApi.checkDomain(projectId, id);
      setDomains(current => current.map(item => item.id === id ? updated : item));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Controle mislukt.');
    } finally {
      setBusy('');
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError('');
    try {
      await dashboardApi.removeDomain(projectId, id);
      setDomains(current => current.filter(item => item.id !== id));
      setRemoving(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Verwijderen mislukt.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="stack-gap">
      <section className="preview-banner">
        <div>
          <p className="console-eyebrow">STANDAARD PREVIEW</p>
          <h2>{previewHost}</h2>
          <p>Dit adres werkt zonder eigen DNS, via de wildcard op defaultstackr.cloud. Een eigen domein wijst hiernaartoe en hoort na de TXT-controle bij dit project, bij geen ander team.</p>
        </div>
        <CopyButton value={previewHost} label="Kopieer host" />
      </section>

      <form className="console-section form-grid" onSubmit={add}>
        <div className="section-title">
          <div>
            <h2>Domein koppelen</h2>
            <p>Voeg een hoofddomein of subdomein toe en volg daarna de DNS-instructies van de API.</p>
          </div>
        </div>
        <fieldset>
          <legend>Soort</legend>
          <label><input type="radio" name="kind" checked={kind === 'apex'} onChange={() => setKind('apex')} /> Apex-domein</label>
          <label><input type="radio" name="kind" checked={kind === 'subdomain'} onChange={() => setKind('subdomain')} /> Subdomein</label>
        </fieldset>
        <label>
          Hostnaam
          <input required value={hostname} placeholder={kind === 'apex' ? 'voorbeeld.nl' : 'app.voorbeeld.nl'} onChange={event => setHostname(event.target.value)} autoCapitalize="none" spellCheck={false} />
        </label>
        <p className="field-hint">De API beheert nog geen automatische doorverwijzing tussen het hoofddomein en www. Voor een hoofddomein toont het portaal de beschikbare DNS-routes apart; je kiest er één. Daarnaast is altijd een TXT-record voor eigendomscontrole nodig.</p>
        {error && <p role="alert" className="db-error">{error}</p>}
        <button className="primary" type="submit" disabled={busy === 'add'}>{busy === 'add' ? 'Bezig…' : 'Domein toevoegen'}</button>
      </form>

      {loading ? <div className="console-empty" role="status">Domeinen laden…</div> : domains.length === 0 ? (
        <div className="console-empty">Nog geen eigen domein. Het preview-adres hierboven blijft bereikbaar.</div>
      ) : domains.map(domain => {
        const failed = domain.check.code !== 'ok';
        return (
          <article className="domain-card" key={domain.id} id={`domein-${domain.id}`}>
            <header>
              <div>
                <h2>{domain.hostname}</h2>
                <p>{domain.kind === 'apex' ? 'Hoofddomein' : 'Subdomein'}{domain.redirect !== 'none' ? ` · ${redirectLabel[domain.redirect]}` : ''}</p>
              </div>
              <span className={`status-chip ${chipClass(domain.status, domain.check.code)}`}>{failed ? 'Actie nodig' : domainStatusLabel[domain.status]}</span>
            </header>
            <Stepper status={domain.status} failed={failed} />
            {failed && <p role="alert" className="db-error">{domain.check.message}</p>}
            <p className="check-line">Laatste controle: {formatWhen(domain.check.checkedAt)}</p>
            <div className="table-scroll">
              <table className="record-table">
                <caption>Records voor {domain.hostname}</caption>
                <thead><tr><th>Type</th><th>Host</th><th>Waarde</th><th>Doel</th></tr></thead>
                <tbody>
                  {domain.records.map(record => (
                    <tr key={`${record.type}-${record.fqdn}-${record.purpose}`}>
                      <td>{recordTitle(record)}</td>
                      <td><code>{record.host}</code><small>{record.fqdn}</small><CopyButton value={record.host} label="Kopieer host" /></td>
                      <td><code>{record.value}</code><CopyButton value={record.value} label="Kopieer waarde" /></td>
                      <td>{record.purpose === 'verification' ? 'Eigendom' : record.purpose === 'redirect' ? 'Doorverwijzing' : 'Verkeer'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {Boolean(domain.routingOptions?.length) && <div className="domain-routing-options"><h3>Kies één route voor het hoofddomein</h3><div>{domain.routingOptions?.map(option => <article key={option.id}><strong>{option.id === 'www-cname' ? 'Via www' : option.id === 'ns-cloudflare' ? 'Via Cloudflare' : 'Via CNAME-flattening'}</strong><p>{option.note}</p><code>{option.type} {option.hostname}{option.value ? ` → ${option.value}` : ''}</code></article>)}</div></div>}
            <RegistrarHelp domain={domain} />
            <div className="form-actions">
              <button type="button" onClick={() => void check(domain.id)} disabled={busy === domain.id}>
                {busy === domain.id ? 'Controleren…' : 'Controleer opnieuw'}
              </button>
              {removing === domain.id ? (
                <>
                  <span>Koppeling verwijderen?</span>
                  <button type="button" onClick={() => void remove(domain.id)} disabled={busy === domain.id}>Ja, verwijderen</button>
                  <button type="button" onClick={() => setRemoving(null)}>Annuleren</button>
                </>
              ) : <button type="button" onClick={() => setRemoving(domain.id)}>Verwijderen</button>}
            </div>
          </article>
        );
      })}
    </div>
  );
}
