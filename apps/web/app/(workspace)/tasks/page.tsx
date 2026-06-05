import { TaskList, type TaskListItem } from '@/components/tasks/task-list';

const sprint3Tasks: TaskListItem[] = [
  {
    id: 'publish-main-branch',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    title: 'Publish main branch to GitHub',
  },
  {
    id: 'configure-railway-api',
    priority: 'HIGH',
    status: 'TODO',
    title: 'Configure Railway API service and DATABASE_URL',
  },
  {
    id: 'capture-uat-evidence',
    priority: 'HIGH',
    status: 'BLOCKED',
    title: 'Capture UAT evidence after staging deployment',
  },
  {
    id: 'review-client-boundary',
    priority: 'MEDIUM',
    status: 'IN_REVIEW',
    title: 'Review client-safe navigation and finance boundaries',
  },
];

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="tasks-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Task execution
        </p>
        <h2 id="tasks-title" className="mt-2 text-3xl font-semibold text-ink">
          Tasks
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Operational task queue for the MVP launch path. Advanced dependencies,
          recurrence, workload balancing, and templates remain deferred.
        </p>
      </section>
      <TaskList tasks={sprint3Tasks} />
    </div>
  );
}
