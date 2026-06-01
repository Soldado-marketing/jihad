import { EmptyState } from '../states/empty-state';

export type ChatMessageListItem = {
  id: string;
  author: string;
  body: string;
  timestamp: string;
};

export function ChatMessageList({ messages }: { messages: ChatMessageListItem[] }) {
  if (messages.length === 0) {
    return (
      <EmptyState
        title="No messages"
        description="Messages for the selected internal channel will appear here."
      />
    );
  }

  return (
    <section aria-label="Chat messages" className="rounded-md border border-line bg-panel">
      {messages.map((message) => (
        <article className="border-b border-line p-4 last:border-b-0" key={message.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{message.author}</h3>
            <p className="text-xs text-slate-500">{message.timestamp}</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{message.body}</p>
        </article>
      ))}
    </section>
  );
}
