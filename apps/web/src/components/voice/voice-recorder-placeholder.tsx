export function VoiceRecorderPlaceholder() {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-lift" aria-label="Voice recorder">
      <h2 className="text-sm font-semibold text-ink">Voice recorder</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Voice note recording and transcription is available when the API and database are connected.
      </p>
    </section>
  );
}
