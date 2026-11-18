import { createHmac, timingSafeEqual } from 'node:crypto';
import { sessionSecret } from '@/lib/auth/session';

export const CURRENCY_COOKIE = 'ds_billing_currency';
export const allowedCurrencies = ['EUR', 'USD', 'GBP'] as const;
export type BillingCurrency = typeof allowedCurrencies[number];

export function isBillingCurrency(value: unknown): value is BillingCurrency {
  return typeof value === 'string' && allowedCurrencies.some(currency => currency === value);
}

export function sealCurrency(currency: BillingCurrency): string {
  const secret = sessionSecret();
  if (!secret) throw new Error('Sessiesleutel ontbreekt.');
  const signature = createHmac('sha256', secret).update(`billing-currency:${currency}`).digest('hex');
  return `${currency}.${signature}`;
}

export function openCurrency(cookie: string | undefined): BillingCurrency {
  const secret = sessionSecret();
  if (!secret || !cookie) return 'EUR';
  const [currency, signature] = cookie.split('.');
  if (!isBillingCurrency(currency) || !signature || !/^[0-9a-f]{64}$/.test(signature)) return 'EUR';
  const expected = createHmac('sha256', secret).update(`billing-currency:${currency}`).digest();
  const actual = Buffer.from(signature, 'hex');
  return timingSafeEqual(expected, actual) ? currency : 'EUR';
}

export const currencyCookieOptions = {
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production',
  path: '/', maxAge: 60 * 60 * 24 * 365,
};
