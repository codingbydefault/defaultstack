const RESERVED = new Set(['www','app','api','admin','auth','billing','ssh','edge','status']);
export function projectWebsiteUrl(hostname) {
  if (typeof hostname !== 'string' || hostname.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(hostname)) return null;
  return `https://${hostname.toLowerCase()}`;
}
export function projectPreviewUrl(project) {
  const live = project.hasLiveDeployment ?? project.status === 'ready';
  if (!live || typeof project.slug !== 'string' || RESERVED.has(project.slug)
      || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(project.slug)) return null;
  const hostname = `${project.slug}.defaultstackr.cloud`;
  return project.previewHostname === hostname ? projectWebsiteUrl(hostname) : null;
}
