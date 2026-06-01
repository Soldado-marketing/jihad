import { ChatChannelList, type ChatChannelListItem } from '@/components/chat/chat-channel-list';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatMessageList, type ChatMessageListItem } from '@/components/chat/chat-message-list';
import { RealtimeStatusNotice } from '@/components/chat/realtime-status-notice';

const sprint7Channels: ChatChannelListItem[] = [
  {
    id: 'sprint-7-internal-channel',
    lastActivity: 'Latest internal activity placeholder',
    name: 'Internal delivery channel',
    scope: 'INTERNAL',
  },
  {
    id: 'sprint-7-client-safe-channel',
    lastActivity: 'Client-safe channel placeholder remains separated',
    name: 'Client-safe boundary placeholder',
    scope: 'CLIENT',
  },
];

const sprint7Messages: ChatMessageListItem[] = [
  {
    author: 'Manager',
    body: 'Sprint 7 internal chat foundation placeholder.',
    id: 'sprint-7-message',
    timestamp: 'Today',
  },
];

export default function ChatPage() {
  return (
    <div className="grid gap-6">
      <section aria-labelledby="chat-title">
        <p className="text-sm font-medium text-slate-600">Sprint 7</p>
        <h2 id="chat-title" className="mt-2 text-3xl font-semibold text-ink">
          Chat
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Internal channel placeholders with explicit client-safe boundary separation.
        </p>
      </section>
      <RealtimeStatusNotice />
      <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        <ChatChannelList channels={sprint7Channels} />
        <div className="grid gap-4">
          <ChatMessageList messages={sprint7Messages} />
          <ChatComposer />
        </div>
      </div>
    </div>
  );
}
