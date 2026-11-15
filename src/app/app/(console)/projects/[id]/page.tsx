import { ProjectScreen, type ProjectTab } from '@/components/dashboard/project-screen';

const tabs: ProjectTab[] = ['deployments', 'domains', 'env', 'settings'];

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tab = tabs.find(item => item === query.tab) ?? 'deployments';
  return <ProjectScreen key={id} projectId={id} tab={tab} />;
}
