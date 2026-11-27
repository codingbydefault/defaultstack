export const SETUP_COOKIE: string;
export function repositoryAppManifest(): Record<string, unknown>;
export function validSetupState(incoming: unknown, expected: unknown): boolean;
export function privateAppConfig(value: unknown): {clientId:string;clientSecret:string;appSlug:string;appId?:number;privateKey?:string;webhookSecret?:string}|null;
