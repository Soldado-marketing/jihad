import { TaskList, type TaskListItem } from '@/components/tasks/task-list';

const sprint3Tasks: TaskListItem[] = [
  {
    id: 'sprint-3-task-placeholder',
    priority: 'MEDIUM',
    status: 'TODO',
    title: 'Sprint 3 Task Placeholder',
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
          Sprint 3 adds task and subtask route foundations with placeholder data.
          Advanced dependencies, workload, recurrence, templates, and approvals remain deferred.
        </p>
      </section>
      <TaskList tasks={sprint3Tasks} />
    </div>
  );
}
