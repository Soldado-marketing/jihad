import Link from 'next/link';
import { EmptyState } from '../states/empty-state';
import { ChatScopeBadge, type ChatScope } from './chat-scope-badge';

export type ChatChannelListItem = {
  id: string;
  name: string;
  scope: ChatScope;
  lastActivity: string;
};

export function ChatChannelList({ channels }: { channels: ChatChannelListItem[] }) {
  if (channels.length === 0) {
    return (
      <EmptyState
        title="No chat channels"
        description="Internal channels will appear here when the workspace has active conversations."
      />
    );
  }

  return (
    <section aria-label="Chat channels" className="grid gap-3">
      {channels.map((channel) => (
        <Link
          className="block rounded-md border border-line bg-panel p-4 hover:bg-slate-50 focus-visible:bg-slate-50"
          href="/chat"
          key={channel.id}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-ink">{channel.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{channel.lastActivity}</p>
            </div>
            <ChatScopeBadge scope={channel.scope} />
          </div>
        </Link>
      ))}
    </section>
  );
}
