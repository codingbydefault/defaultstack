export const SETUP_COOKIE = '__Host-ds_github_setup';
export function repositoryAppManifest() {
  return {
    name: 'DefaultStackR codingbydefault',
    url: 'https://defaultstackr.cloud',
    redirect_url: 'https://defaultstackr.cloud/api/github/setup/callback',
    callback_urls: ['https://defaultstackr.cloud/api/github/callback'],
    setup_url: 'https://defaultstackr.cloud/app/projects/new',
    public: false,
    hook_attributes: { url: 'https://api.defaultstackr.cloud/api/github/webhook', active: false },
    default_permissions: { contents: 'read', metadata: 'read' },
    default_events: [],
    request_oauth_on_install: false,
  };
}
export function validSetupState(incoming, expected) {
  if (typeof incoming !== 'string' || typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(incoming) || incoming.length !== expected.length) return false;
  let difference = 0;
  for (let i=0;i<incoming.length;i++) difference |= incoming.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
export function privateAppConfig(value) {
  if (!value || value.owner?.login?.toLowerCase() !== 'codingbydefault'
      || typeof value.client_id !== 'string' || !/^[A-Za-z0-9_]+$/.test(value.client_id)
      || typeof value.client_secret !== 'string' || value.client_secret.length < 8
      || typeof value.slug !== 'string' || !/^[a-z0-9-]{1,100}$/.test(value.slug)
      || value.permissions?.contents !== 'read') return null;
  return { clientId:value.client_id, clientSecret:value.client_secret, appSlug:value.slug,
    appId:value.id, privateKey:value.pem, webhookSecret:value.webhook_secret };
}
