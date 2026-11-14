export type Publication = { url: string; status: 'ready' | 'pending-dns' | 'pending-https' | 'pending-route' | 'unhealthy' | 'unverified'; checkedAt: string };
export type Deployment = {
  name: string; image: string; state: string; health: string; port: number | null; created: string;
  publication?: Publication; resources?: { cpu: string; memory: string };
};
export type Analytics = { available: boolean; sampled?: boolean; requests?: number; errors?: number; averageMs?: number; buckets?: { time: string; requests: number }[] };
export type PlatformStatus = { connected: boolean; generatedAt: string | null; stale: boolean; deployments: Deployment[]; analytics?: Analytics; message?: string };
