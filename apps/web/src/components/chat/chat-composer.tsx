export function ChatComposer() {
  return (
    <form aria-label="Chat composer" className="rounded-md border border-line bg-panel p-4">
      <label className="block text-sm font-medium text-ink" htmlFor="chat-message">
        Message
      </label>
      <textarea
        className="mt-2 min-h-24 w-full rounded-md border border-line bg-white p-3 text-sm text-ink focus:border-ink focus:outline-none"
        id="chat-message"
        placeholder="Write an internal message"
      />
      <div className="mt-3 flex justify-end">
        <button
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2"
          type="button"
        >
          Queue message
        </button>
      </div>
    </form>
  );
}
