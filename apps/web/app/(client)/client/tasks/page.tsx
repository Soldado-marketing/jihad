import {
  ClientTaskList,
  type ClientTaskListItem,
} from '@/components/client-portal/client-task-list';

const clientTasks: ClientTaskListItem[] = [
  {
    id: 'sprint-4-client-task-placeholder',
    status: 'TODO',
    title: 'Client Task Placeholder',
  },
];

export default function ClientTasksPage() {
  return (
    <div className="space-y-6">
      <section aria-labelledby="client-tasks-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Client tasks
        </p>
        <h2 id="client-tasks-title" className="mt-2 text-3xl font-semibold text-ink">
          Tasks
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Approved task placeholders for your account.
        </p>
      </section>
      <ClientTaskList tasks={clientTasks} />
    </div>
  );
}
