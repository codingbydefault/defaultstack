#!/usr/bin/env node
// Create inactive Stripe catalog entries. This script never opens Checkout.
import catalog from '../../src/lib/billing/catalog.json' with { type: 'json' };

const apply = process.argv.includes('--apply');
const live = process.argv.includes('--live');
const key = process.env.STRIPE_SECRET_KEY || '';
const prefix = `defaultstackr_${catalog.version.replaceAll('-', '_')}`;
const products = [
  { plan: 'pro', name: 'DefaultStackr Pro', description: '10 actieve projecten en 5 GB databaseopslag.' },
  { plan: 'business', name: 'DefaultStackr Business', description: 'Vaste basis met 10 actieve projecten en 5 GB databaseopslag.' },
  { plan: 'extra_project', name: 'DefaultStackr Business extra project', description: 'Extra actief project per maand, alleen na akkoord van de klant.' },
  { plan: 'extra_database_gb', name: 'DefaultStackr Business extra databaseopslag', description: 'Extra GB database per maand, alleen na akkoord van de klant.' },
];
const prices = [
  { key: `${prefix}_pro_month`, plan: 'pro', cents: catalog.pro.monthlyCents, interval: 'month' },
  { key: `${prefix}_pro_year`, plan: 'pro', cents: catalog.pro.yearlyCents, interval: 'year' },
  { key: `${prefix}_business_month`, plan: 'business', cents: catalog.business.monthlyCents, interval: 'month' },
  { key: `${prefix}_business_year`, plan: 'business', cents: catalog.business.yearlyCents, interval: 'year' },
  { key: `${prefix}_business_extra_project_month`, plan: 'extra_project', cents: catalog.business.extraProjectMonthlyCents, interval: 'month' },
  { key: `${prefix}_business_extra_database_gb_month`, plan: 'extra_database_gb', cents: catalog.business.extraDatabaseGbMonthlyCents, interval: 'month' },
];

if (!apply) {
  console.log('Voorbeeld. Voeg --apply toe met een Stripe testsleutel om deze inactieve producten en prijzen aan te maken:');
  for (const price of prices) console.log(`${price.key}: EUR ${(price.cents / 100).toFixed(2)} / ${price.interval}`);
  process.exit(0);
}
if (!/^sk_(test|live)_/.test(key)) throw new Error('STRIPE_SECRET_KEY ontbreekt of is ongeldig.');
if (live !== key.startsWith('sk_live_')) throw new Error('Testsleutel vereist; gebruik --live alleen bewust met een livesleutel.');

async function stripe(method, path, params, idempotencyKey) {
  const headers = { Authorization: `Bearer ${key}` };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  if (params) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method, headers, body: params ? new URLSearchParams(params) : undefined,
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Stripe ${path}: ${body.error?.message || response.status}`);
  }
  return body;
}

const account = await stripe('GET', 'account');
console.log(`Stripe-account: ${account.id} (${account.country}, ${live ? 'live' : 'test'})`);
const existingProducts = await stripe('GET', 'products?limit=100');
if (existingProducts.has_more) throw new Error('Meer dan 100 producten: controleer de catalogus handmatig voordat je synchroniseert.');
const productIds = new Map();
for (const product of products) {
  const matches = existingProducts.data.filter(item => item.metadata?.defaultstackr_catalog === catalog.version && item.metadata?.defaultstackr_plan === product.plan);
  if (matches.length > 1) throw new Error(`Meerdere Stripe-producten gevonden voor ${product.plan}.`);
  const existing = matches[0];
  if (!existing) {
    const created = await stripe('POST', 'products', {
      name: product.name, description: product.description, active: 'false',
      'metadata[defaultstackr_catalog]': catalog.version,
      'metadata[defaultstackr_plan]': product.plan,
    }, `defaultstackr-product-${prefix}-${product.plan}`);
    productIds.set(product.plan, created.id);
  } else {
    productIds.set(product.plan, existing.id);
  }
  console.log(`Product gecontroleerd: ${product.name} (${productIds.get(product.plan)})`);
}
for (const price of prices) {
  const productId = productIds.get(price.plan);
  const found = await stripe('GET', `prices?lookup_keys%5B%5D=${encodeURIComponent(price.key)}`);
  const byProduct = await stripe('GET', `prices?product=${encodeURIComponent(productId)}&limit=100`);
  if (byProduct.has_more) throw new Error(`Meer dan 100 prijzen voor ${price.plan}; controleer handmatig.`);
  const matches = byProduct.data.filter(item => item.unit_amount === price.cents && item.currency === catalog.currency && item.recurring?.interval === price.interval);
  if (matches.length > 1) throw new Error(`Meerdere Stripe-prijzen gevonden voor ${price.key}.`);
  const existing = found.data?.[0] || matches[0];
  if (existing && (existing.product !== productId || existing.unit_amount !== price.cents || existing.currency !== catalog.currency || existing.recurring?.interval !== price.interval)) {
    throw new Error(`Prijs ${price.key} wijkt af van de catalogus; maak een nieuwe versie in plaats van de prijs te overschrijven.`);
  }
  if (!existing) {
    await stripe('POST', 'prices', {
      product: productId, currency: catalog.currency, unit_amount: String(price.cents),
      'recurring[interval]': price.interval, lookup_key: price.key, active: 'false',
      'metadata[defaultstackr_catalog]': catalog.version,
    }, `defaultstackr-price-${price.key}`);
  }
  console.log(`Prijs gecontroleerd: ${price.key}`);
}
console.log('Klaar. Nieuwe vermeldingen zijn inactief; dit script maakt geen Checkout-link of abonnement.');
