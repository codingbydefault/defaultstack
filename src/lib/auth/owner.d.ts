export function isPlatformOwner(userId: string | null | undefined, configuredId?: string): boolean;

export function canDeployProjects(identity: {kind: string; owner?: boolean} | null): boolean;
