import { UnauthorizedState } from '@/components/states/unauthorized-state';

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <UnauthorizedState />
    </main>
  );
}
