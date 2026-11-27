export function projectWebsiteUrl(hostname: string | null | undefined): string | null;
export function projectPreviewUrl(project: {slug: string; previewHostname: string; status: string; hasLiveDeployment?: boolean}): string | null;
