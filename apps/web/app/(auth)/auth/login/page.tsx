import { UnauthorizedState } from '@/components/states/unauthorized-state';

export default function LoginPlaceholderPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <UnauthorizedState
        title="Login placeholder"
        description="Sprint 2 reserves the auth route group only. Full authentication UI is not implemented in this sprint."
      />
    </main>
  );
}
