import { portalIdentity } from '@/lib/auth/portal';
import { canDeployProjects } from '@/lib/auth/owner.mjs';
import { ProjectScreen, type ProjectTab } from '@/components/dashboard/project-screen';

const tabs: ProjectTab[] = ['overview', 'deployments', 'code', 'logs', 'analytics', 'domains', 'env', 'migrations', 'settings'];

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tab = tabs.find(item => item === query.tab) ?? 'overview';
  return <ProjectScreen key={id} projectId={id} tab={tab} canDeploy={canDeployProjects(await portalIdentity())} />;
}
