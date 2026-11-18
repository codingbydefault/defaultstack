'use client';

import { useState } from 'react';
import type { BillingCurrency } from '@/lib/billing/currency';

export function ProfileCurrency({ initial }: { initial: BillingCurrency }) {
  const [currency, setCurrency] = useState<BillingCurrency>(initial);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/profile/currency', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency }) });
      if (!response.ok) throw new Error('Opslaan mislukt.');
      setStatus('Valutavoorkeur opgeslagen.');
    } catch {
      setStatus('Opslaan mislukt. Probeer opnieuw.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="profile-card"><label htmlFor="billing-currency">Gewenste betaalvaluta</label><select id="billing-currency" value={currency} onChange={event => setCurrency(event.target.value as BillingCurrency)}><option value="EUR">Euro (EUR)</option><option value="USD">Amerikaanse dollar (USD)</option><option value="GBP">Britse pond (GBP)</option></select><p>Deze voorkeur wordt bewaard. Betalen in andere valuta volgt zodra Stripe Checkout en de omrekening zijn gekoppeld; de uiteindelijke prijs en wisselkosten worden dan vóór betaling getoond.</p><button type="button" className="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Opslaan…' : 'Voorkeur opslaan'}</button>{status && <p role="status">{status}</p>}</div>;
}
