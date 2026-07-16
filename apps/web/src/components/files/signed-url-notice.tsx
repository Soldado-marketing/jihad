export function SignedUrlNotice() {
  // Test marker: signed URL placeholders must remain permission-checked placeholder behavior until storage is integrated.
  return (
    <section
      aria-label="Signed URL notice"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-lift"
    >
      Signed URL generation is permission-checked and short-lived by design. External object storage integration is deferred.
    </section>
  );
}
