// Repository authorization is a separate GitHub App grant. A platform login
// session (and its OAuth token) never substitutes for that grant.
export function repositoryConnection(connection, identity, clientId) {
  if (!connection || !identity || typeof connection.accessToken !== 'string' || connection.accessToken.length === 0) return null;
  const portalId = identity.kind === 'admin' ? 'admin' : identity.kind === 'customer' ? identity.id : null;
  if (!portalId || connection.portalId !== portalId) return null;
  if (connection.appClientId && connection.appClientId !== clientId) return null;
  return connection;
}
