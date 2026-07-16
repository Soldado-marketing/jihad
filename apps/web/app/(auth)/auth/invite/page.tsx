import { UnauthorizedState } from '@/components/states/unauthorized-state';

export default function InvitePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <UnauthorizedState
        title="Invalid or expired invite link"
        description="This invite link is not valid. Please contact your administrator for a new invitation."
      />
    </main>
  );
}
