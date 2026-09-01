/**
 * Explains how file access actually works now that object storage is live.
 *
 * Phase 3 replaced the pre-signed-URL placeholder with server-side streaming:
 * the API authorises the request and pipes the bytes, so the browser never
 * receives a storage key, a bucket name or a pre-signed link. This notice
 * exists so the UI states that accurately rather than implying a capability
 * that is not there.
 */
export function SignedUrlNotice() {
  return (
    <section
      aria-label="File access notice"
      className="rounded-2xl border border-line bg-slate-50 p-5 text-sm leading-6 text-slate-700"
    >
      Downloads and previews are permission-checked on every request and streamed
      through the API. Storage keys and bucket details are never exposed to the
      browser. Client access additionally requires the file to be client-visible
      and approved.
    </section>
  );
}
