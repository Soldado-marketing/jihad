import { UnauthorizedState } from '@/components/states/unauthorized-state';

export default function InvitePlaceholderPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <UnauthorizedState
        title="Invite acceptance placeholder"
        description="Invite-only access is preserved. Full invite acceptance UI remains outside Sprint 2 shell scope."
      />
    </main>
  );
}
