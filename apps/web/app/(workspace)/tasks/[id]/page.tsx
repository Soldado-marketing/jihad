import { TaskDetail } from '@/components/tasks/task-detail';

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;

  return (
    <TaskDetail
      id={id}
      priority="MEDIUM"
      status="TODO"
      title="Sprint 3 Task Placeholder"
      subtasks={[
        {
          id: 'sprint-3-subtask-placeholder',
          status: 'TODO',
          title: 'Sprint 3 Subtask Placeholder',
        },
      ]}
    />
  );
}
