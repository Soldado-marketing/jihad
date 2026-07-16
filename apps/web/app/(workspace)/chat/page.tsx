'use client';
import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/fetch';
import { PageHeader } from '@/components/ui/page-header';

type Channel = { id: string; name: string; type?: string };
type Message = { id: string; body: string; createdAt: string; sender?: { displayName: string } };

export default function ChatPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showChannelForm, setShowChannelForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChannels(); }, []);
  useEffect(() => { if (activeChannel) loadMessages(activeChannel.id); }, [activeChannel]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadChannels() {
    try { const c = await apiFetch<Channel[]>('/chat/channels'); setChannels(c); if (c.length && !activeChannel) setActiveChannel(c[0]); }
    catch { /* ignore */ }
  }

  async function loadMessages(channelId: string) {
    try { setMessages(await apiFetch<Message[]>(`/chat/channels/${channelId}/messages`)); }
    catch { /* ignore */ }
  }

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/chat/channels', { method: 'POST', body: JSON.stringify({ name: newChannelName }) });
      setNewChannelName(''); setShowChannelForm(false); loadChannels();
    } catch (e: any) { alert(e.message); }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeChannel) return;
    try {
      await apiFetch(`/chat/channels/${activeChannel.id}/messages`, { method: 'POST', body: JSON.stringify({ body: newMsg }) });
      setNewMsg(''); loadMessages(activeChannel.id);
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Workspace" title="Chat" description="Team channels and messaging." />
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-56 flex-shrink-0 rounded-xl border border-line bg-white overflow-y-auto">
          <div className="p-3 border-b border-line flex items-center justify-between">
            <p className="text-xs font-semibold text-muted uppercase">Channels</p>
            <button onClick={() => setShowChannelForm(v => !v)} className="text-xs text-brand">+</button>
          </div>
          {showChannelForm && (
            <form onSubmit={createChannel} className="p-2 border-b border-line">
              <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                placeholder="Channel name" className="w-full text-xs rounded border border-line px-2 py-1 mb-1" />
              <button type="submit" className="w-full text-xs rounded bg-brand text-white py-1">Create</button>
            </form>
          )}
          {channels.map(c => (
            <button key={c.id} onClick={() => setActiveChannel(c)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 ${activeChannel?.id===c.id ? 'bg-brand/5 font-medium text-brand' : 'text-ink'}`}>
              # {c.name}
            </button>
          ))}
          {channels.length === 0 && <p className="p-3 text-xs text-muted">No channels yet.</p>}
        </div>
        <div className="flex-1 flex flex-col rounded-xl border border-line bg-white overflow-hidden">
          {activeChannel ? (
            <>
              <div className="px-4 py-3 border-b border-line">
                <p className="font-semibold text-ink"># {activeChannel.name}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                      {(m.sender?.displayName ?? '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink">{m.sender?.displayName ?? 'Unknown'} <span className="font-normal text-muted">{new Date(m.createdAt).toLocaleTimeString()}</span></p>
                      <p className="text-sm text-ink mt-0.5">{m.body}</p>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-sm text-muted py-8">No messages yet.</p>}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="border-t border-line p-3 flex gap-3">
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  placeholder={`Message #${activeChannel.name}`}
                  className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand" />
                <button type="submit" disabled={!newMsg.trim()}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Send</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted">Select or create a channel.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}