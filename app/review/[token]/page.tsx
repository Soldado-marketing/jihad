import Image from 'next/image';
import { notFound } from 'next/navigation';

import { requestChangesAction } from '@/app/review/[token]/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getLatestAssetForPost } from '@/lib/repositories/assets';
import { getPostByApprovalToken } from '@/lib/repositories/posts';
import { readAssetBuffer } from '@/lib/services/assets';
import { buildApproveUrl } from '@/lib/services/review';
import { joinHashtags } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { token } = await params;
  const { submitted } = await searchParams;
  const post = getPostByApprovalToken(token);

  if (!post) {
    notFound();
  }

  const arabicAsset = getLatestAssetForPost(post.id, 'generated_ar');
  const germanAsset = getLatestAssetForPost(post.id, 'generated_de');

  const [arabicPreview, germanPreview] = await Promise.all([
    arabicAsset ? assetToDataUri(arabicAsset.id, arabicAsset.mimeType) : Promise.resolve(null),
    germanAsset ? assetToDataUri(germanAsset.id, germanAsset.mimeType) : Promise.resolve(null),
  ]);

  return (
    <main className="min-h-screen bg-brand-deep px-4 py-10 text-brand-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-sand">
            SH Investments review
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-white sm:text-4xl">
            {post.topicTitle}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-brand-white/75">
            Review both language versions below. Approve only if the copy, layout, contact details, and language direction are correct.
          </p>

          {submitted === 'approved' ? (
            <div className="mt-6 rounded-2xl border border-brand-sand/30 bg-brand-sand/12 px-4 py-3 text-sm text-brand-white">
              The post is now approved and marked ready for manual publishing.
            </div>
          ) : null}

          {submitted === 'changes' ? (
            <div className="mt-6 rounded-2xl border border-red-300/30 bg-red-500/12 px-4 py-3 text-sm text-brand-white">
              Your change request was recorded and sent back to the dashboard.
            </div>
          ) : null}

          {post.reviewComment ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-brand-white/80">
              Latest reviewer comment: {post.reviewComment}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={buildApproveUrl(token)}
              className="inline-flex items-center rounded-full bg-brand-sand px-6 py-3 text-sm font-semibold text-brand-deep transition hover:bg-brand-gold"
            >
              APPROVE
            </a>
            <a
              href="#request-changes"
              className="inline-flex items-center rounded-full border border-white/18 px-6 py-3 text-sm font-semibold text-brand-white transition hover:border-brand-sand hover:text-brand-sand"
            >
              REQUEST CHANGES
            </a>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <ReviewCard
            title="Arabic version"
            caption={post.arabicContent?.caption || 'No caption generated yet.'}
            hashtags={joinHashtags(post.arabicContent?.hashtags || [])}
            preview={arabicPreview}
          />
          <ReviewCard
            title="German version"
            caption={post.germanContent?.caption || 'No caption generated yet.'}
            hashtags={joinHashtags(post.germanContent?.hashtags || [])}
            preview={germanPreview}
          />
        </section>

        <Card id="request-changes" className="border-white/10 bg-white/5 text-brand-white">
          <CardHeader>
            <CardTitle className="text-brand-white">Request changes</CardTitle>
            <CardDescription className="text-brand-white/72">
              Describe only what should change. The workflow will keep the approved parts and update only the requested sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={requestChangesAction.bind(null, token)} className="space-y-4">
              <textarea
                name="comment"
                required
                rows={6}
                placeholder="Example: Keep the design, but shorten the German paragraph and use a more conservative Arabic headline."
                className="w-full rounded-[1.75rem] border border-white/12 bg-brand-deep/80 px-4 py-4 text-sm text-brand-white outline-none transition focus:border-brand-sand"
              />
              <button
                type="submit"
                className="inline-flex items-center rounded-full border border-white/18 px-6 py-3 text-sm font-semibold text-brand-white transition hover:border-brand-sand hover:text-brand-sand"
              >
                Submit change request
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function assetToDataUri(assetId: string, mimeType: string) {
  const buffer = await readAssetBuffer(assetId);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function ReviewCard({
  title,
  caption,
  hashtags,
  preview,
}: {
  title: string;
  caption: string;
  hashtags: string;
  preview: string | null;
}) {
  return (
    <Card className="border-white/10 bg-white/5 text-brand-white">
      <CardHeader>
        <CardTitle className="text-brand-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preview ? (
          <Image
            src={preview}
            alt={title}
            width={1080}
            height={1350}
            unoptimized
            className="w-full rounded-[2rem] border border-white/10"
          />
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/16 px-6 py-16 text-center text-sm text-brand-white/68">
            Preview not available yet.
          </div>
        )}
        <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-sand">
            Caption
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-brand-white/82">
            {caption}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-sand">
            Hashtags
          </p>
          <p className="mt-3 text-sm leading-7 text-brand-white/82">{hashtags}</p>
        </div>
      </CardContent>
    </Card>
  );
}
