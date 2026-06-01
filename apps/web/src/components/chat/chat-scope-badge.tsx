export type ChatScope = 'INTERNAL' | 'CLIENT';

const scopeLabel: Record<ChatScope, string> = {
  CLIENT: 'Client-safe',
  INTERNAL: 'Internal',
};

export function ChatScopeBadge({ scope }: { scope: ChatScope }) {
  return (
    <span className="inline-flex rounded-md border border-line bg-panel px-2 py-1 text-xs font-medium text-slate-700">
      {scopeLabel[scope]}
    </span>
  );
}
