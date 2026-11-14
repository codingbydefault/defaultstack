export type Deployment = {
  name: string; image: string; state: string; health: string; port: number | null; created: string;
};
export type PlatformStatus = { connected: boolean; generatedAt: string | null; stale: boolean; deployments: Deployment[]; message?: string };
