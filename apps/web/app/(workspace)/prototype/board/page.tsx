import { notFound } from 'next/navigation';
import { BoardPrototype } from '@/components/tasks/board-prototype';

/** Development-only preview of custom board lists; absent from production builds. */
export default function BoardPrototypePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <BoardPrototype />;
}
