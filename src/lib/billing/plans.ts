import catalog from './catalog.json';

export const plans = catalog;

export function businessMonthlyUsageCents(activeProjects: number, databaseGb: number): number {
  const projectCount = Math.max(0, Math.ceil(activeProjects) - plans.business.includedProjects);
  const databaseCount = Math.max(0, Math.ceil(databaseGb) - plans.business.includedDatabaseGb);
  return projectCount * plans.business.extraProjectMonthlyCents
    + databaseCount * plans.business.extraDatabaseGbMonthlyCents;
}

export function euro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(cents / 100);
}
