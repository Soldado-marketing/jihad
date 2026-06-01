import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  autofillGeneratedCopyAction,
  preparePackageAction,
  regenerateAllAction,
  regenerateDesignsAction,
  saveGeneratedCopyAction,
  selectHeroAssetAction,
  sendForReviewAction,
  updateTopicDetailsAction,
  uploadTopicVisualAssetsAction,
  uploadReferenceAssetsAction,
} from '@/app/(dashboard)/topics/actions';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getLatestAssetForPost, listAssetsForPost } from '@/lib/repositories/assets';
import { listLogsForPost } from '@/lib/repositories/logs';
import { getPostById } from '@/lib/repositories/posts';
import { buildReviewUrl } from '@/lib/services/review';
import { formatDateTime, joinHashtags } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = getPostById(id);

  if (!post) {
    return {
      title: 'Topic not found | SH Investments Workflow',
    };
  }

  return {
    title: `${post.topicTitle} | SH Investments Workflow`,
  };
}

export default async function TopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const post = getPostById(id);

  if (!post) {
    notFound();
  }

  const assets = listAssetsForPost(post.id);
  const logs = listLogsForPost(post.id, 12);
  const generatedArabic = getLatestAssetForPost(post.id, 'generated_ar');
  const generatedGerman = getLatestAssetForPost(post.id, 'generated_de');
  const packageAsset = getLatestAssetForPost(post.id, 'package');
  const referenceAssets = assets.filter((asset) => asset.kind === 'reference');
  const attachmentAssets = assets.filter((asset) => asset.kind === 'attachment');
  const selectableHeroAssets = [...referenceAssets, ...attachmentAssets].filter((asset) =>
    asset.mimeType.startsWith('image/'),
  );
  const hasGeneratedCopy = Boolean(
    post.arabicContent?.headline ||
      post.arabicContent?.paragraph ||
      post.germanContent?.headline ||
      post.germanContent?.paragraph,
  );
  const hasGeneratedDesigns = Boolean(generatedArabic && generatedGerman);
  const canPreparePackage = Boolean(
    post.arabicContent && post.germanContent && generatedArabic && generatedGerman,
  );
  const hasTopicVisuals = attachmentAssets.length > 0;
  const feedbackMessage = getFeedbackMessage(resolvedSearchParams?.error, resolvedSearchParams?.success);

  return (
    <div className="space-y-8">
      {feedbackMessage ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedbackMessage.type === 'error'
              ? 'border border-red-200 bg-red-50 text-red-700'
              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {feedbackMessage.message}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="space-y-3">
          <Link href="/topics" className="text-sm font-semibold text-brand-gold">
            ← Back to topics
          </Link>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-brand-navy sm:text-4xl">
                {post.topicTitle}
              </h1>
              <StatusBadge status={post.status} />
            </div>
            <p className="max-w-3xl text-sm leading-7 text-brand-navy/68">
              Source: {post.sourceType}
              {post.sourceFrom ? ` • ${post.sourceFrom}` : ''}
              {post.sourceSubject ? ` • ${post.sourceSubject}` : ''}
            </p>
            {post.reviewComment ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Reviewer feedback: {post.reviewComment}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Topic briefing</CardTitle>
            <CardDescription>
              Write the topic once. Notes and references are optional, but they improve the result.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateTopicDetailsAction.bind(null, post.id)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-navy" htmlFor="topicTitle">
                  Topic title
                </label>
                <input
                  id="topicTitle"
                  name="topicTitle"
                  defaultValue={post.topicTitle}
                  className="h-12 w-full rounded-2xl border border-brand-navy/15 bg-brand-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-navy" htmlFor="topicNotes">
                  Topic notes
                </label>
                <textarea
                  id="topicNotes"
                  name="topicNotes"
                  defaultValue={post.topicNotes}
                  rows={6}
                  className="w-full rounded-3xl border border-brand-navy/15 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                />
              </div>
              <Button type="submit">Save topic details</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-brand-gold/35 bg-brand-navy text-brand-white">
          <CardHeader>
            <CardTitle className="text-brand-white">Do this only</CardTitle>
            <CardDescription>
              For a professional post without extra effort, follow this short path and ignore the advanced tools below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3">
              <QuickStep
                step="1"
                title="Save the topic title"
                description="Keep the title clear and focused on one investment idea."
                done={Boolean(post.topicTitle.trim())}
              />
              <QuickStep
                step="2"
                title="Upload a real image for this topic"
                description="A current topic image gives the design a much stronger and more professional result."
                done={hasTopicVisuals}
              />
              <QuickStep
                step="3"
                title="Upload old posts only as style references"
                description="Reference posts are optional and help maintain the SH Investments visual direction."
                done={referenceAssets.length > 0}
              />
              <QuickStep
                step="4"
                title="Press the main generation button"
                description="The system writes Arabic and German copy, then builds both post designs."
                done={hasGeneratedDesigns}
              />
              <QuickStep
                step="5"
                title="Review the previews and send for approval"
                description="Use review only after the two previews look acceptable."
                done={post.status === 'in_review' || post.status === 'ready'}
              />
            </div>

            <div className="rounded-[1.75rem] bg-white/10 p-4 text-sm leading-7 text-brand-white/88">
              {hasGeneratedDesigns
                ? 'Your next step: review the Arabic and German previews below. If they look good, send the reviewer email.'
                : 'Your next step: upload a real topic image if available, then press the main button to create the full bilingual post.'}
            </div>

            <div className="grid gap-3">
              <form action={regenerateAllAction.bind(null, post.id)}>
                <Button type="submit" className="h-12 w-full bg-brand-gold text-brand-deep hover:bg-brand-sand">
                  {hasGeneratedCopy ? 'Generate updated post now' : 'Create professional post now'}
                </Button>
              </form>
              <form action={sendForReviewAction.bind(null, post.id)}>
                <Button
                  type="submit"
                  variant="secondary"
                  className="h-12 w-full"
                  disabled={!hasGeneratedDesigns}
                >
                  Send reviewer email
                </Button>
              </form>
              {packageAsset ? (
                <a
                  href={`/api/posts/${post.id}/package`}
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/18 bg-white/8 px-4 text-sm font-semibold text-brand-white transition hover:border-brand-gold hover:text-brand-gold"
                >
                  Download final package
                </a>
              ) : post.status === 'ready' && canPreparePackage ? (
                <form action={preparePackageAction.bind(null, post.id)}>
                  <Button type="submit" variant="ghost" className="h-12 w-full text-brand-white hover:bg-white/8 hover:text-brand-gold">
                    Prepare final package
                  </Button>
                </form>
              ) : post.status === 'ready' ? (
                <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-brand-white/80">
                  The final package becomes available after both language texts and both previews are ready.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Topic visuals</CardTitle>
            <CardDescription>
              Upload the real image you want the design to use. This affects the final post directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={uploadTopicVisualAssetsAction.bind(null, post.id)} className="space-y-3">
              <input
                type="file"
                name="visuals"
                accept="image/*"
                multiple
                className="block w-full rounded-2xl border border-dashed border-brand-navy/18 bg-brand-cream/35 p-4 text-sm text-brand-navy"
              />
              <Button type="submit" variant="secondary">
                Upload topic visuals
              </Button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {attachmentAssets.length === 0 ? (
                <p className="text-sm text-brand-navy/60">
                  No direct topic visuals yet. Without these, the generator uses a text-led branded layout.
                </p>
              ) : (
                attachmentAssets.slice(0, 4).map((asset) => (
                  <PreviewThumb key={asset.id} assetId={asset.id} label={asset.filename} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reference uploads</CardTitle>
            <CardDescription>
              Upload old posts as visual references. They are stored for inspiration, not copied directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form action={uploadReferenceAssetsAction.bind(null, post.id)} className="space-y-3">
              <input
                type="file"
                name="references"
                accept="image/*"
                multiple
                className="block w-full rounded-2xl border border-dashed border-brand-navy/18 bg-brand-cream/35 p-4 text-sm text-brand-navy"
              />
              <Button type="submit" variant="secondary">
                Upload reference files
              </Button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2">
              {referenceAssets.length === 0 ? (
                <p className="text-sm text-brand-navy/60">
                  No reference uploads yet for this topic.
                </p>
              ) : (
                referenceAssets.slice(0, 6).map((asset) => (
                  <PreviewThumb key={asset.id} assetId={asset.id} label={asset.filename} />
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
            <CardDescription>
              The system always prepares files for manual publishing only. It never posts automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-brand-navy/72">
            <p>After generation, you will get one Arabic preview and one German preview.</p>
            <p>A real topic image usually improves the output more than any other single change.</p>
            <p>After reviewer approval, the status changes to ready and the final download package becomes available.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Arabic preview</CardTitle>
            <CardDescription>
              RTL social post PNG preview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedArabic?.id ? (
              <Image
                src={`/api/assets/${generatedArabic.id}`}
                alt="Arabic preview"
                width={1080}
                height={1350}
                unoptimized
                className="w-full rounded-[2rem] border border-brand-navy/10 object-cover shadow-soft"
              />
            ) : (
              <div className="rounded-[2rem] border border-dashed border-brand-navy/18 bg-brand-cream/25 p-12 text-center text-sm text-brand-navy/60">
                Generate the post to render the Arabic preview.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>German preview</CardTitle>
            <CardDescription>
              LTR social post PNG preview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedGerman?.id ? (
              <Image
                src={`/api/assets/${generatedGerman.id}`}
                alt="German preview"
                width={1080}
                height={1350}
                unoptimized
                className="w-full rounded-[2rem] border border-brand-navy/10 object-cover shadow-soft"
              />
            ) : (
              <div className="rounded-[2rem] border border-dashed border-brand-navy/18 bg-brand-cream/25 p-12 text-center text-sm text-brand-navy/60">
                Generate the post to render the German preview.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <details className="group rounded-[2rem] border border-brand-navy/10 bg-white/88 shadow-soft">
        <summary className="cursor-pointer list-none px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Manual text editing
              </h2>
              <p className="text-sm text-brand-navy/68">
                Optional. Open this only when you want to manually rewrite the generated Arabic or German text.
              </p>
            </div>
            <span className="text-sm font-semibold text-brand-gold group-open:hidden">Open</span>
            <span className="hidden text-sm font-semibold text-brand-gold group-open:inline">
              Close
            </span>
          </div>
        </summary>
        <div className="px-6 pb-6">
          <div className="mb-6 rounded-[1.75rem] border border-brand-gold/30 bg-brand-cream/35 p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-brand-navy">
                Quick paste from full text
              </h3>
              <p className="text-sm leading-6 text-brand-navy/68">
                Paste the full Arabic and German text once. The system will auto-fill headline, paragraph, supporting lines, caption, and hashtags for you.
              </p>
            </div>

            <form action={autofillGeneratedCopyAction.bind(null, post.id)} className="mt-4 space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-navy" htmlFor="arFullPost">
                    Arabic full text
                  </label>
                  <textarea
                    id="arFullPost"
                    name="arFullPost"
                    rows={8}
                    placeholder="Paste the full Arabic post here..."
                    className="w-full rounded-2xl border border-brand-navy/12 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-brand-navy" htmlFor="deFullPost">
                    German full text
                  </label>
                  <textarea
                    id="deFullPost"
                    name="deFullPost"
                    rows={8}
                    placeholder="Paste the full German post here..."
                    className="w-full rounded-2xl border border-brand-navy/12 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary">
                Auto-fill fields from pasted text
              </Button>
            </form>
          </div>

          {hasGeneratedCopy ? (
            <form action={saveGeneratedCopyAction.bind(null, post.id)} className="space-y-8">
              <div className="grid gap-6 xl:grid-cols-2">
                <LanguageEditor
                  prefix="ar"
                  title="Arabic content"
                  headline={post.arabicContent?.headline || ''}
                  paragraph={post.arabicContent?.paragraph || ''}
                  supportingLines={post.arabicContent?.supportingLines || []}
                  caption={post.arabicContent?.caption || ''}
                  hashtags={joinHashtags(post.arabicContent?.hashtags || [])}
                />
                <LanguageEditor
                  prefix="de"
                  title="German content"
                  headline={post.germanContent?.headline || ''}
                  paragraph={post.germanContent?.paragraph || ''}
                  supportingLines={post.germanContent?.supportingLines || []}
                  caption={post.germanContent?.caption || ''}
                  hashtags={joinHashtags(post.germanContent?.hashtags || [])}
                />
              </div>
              <Button type="submit">Save edited copy</Button>
            </form>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-brand-navy/18 bg-brand-cream/25 p-8 text-sm text-brand-navy/60">
              Generate the post first. The bilingual text editor will appear here after the first run.
            </div>
          )}
        </div>
      </details>

      <details className="group rounded-[2rem] border border-brand-navy/10 bg-white/88 shadow-soft">
        <summary className="cursor-pointer list-none px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Advanced image and review tools
              </h2>
              <p className="text-sm text-brand-navy/68">
                Optional. Use this when you want to pick a specific hero image or run extra review and packaging actions.
              </p>
            </div>
            <span className="text-sm font-semibold text-brand-gold group-open:hidden">Open</span>
            <span className="hidden text-sm font-semibold text-brand-gold group-open:inline">
              Close
            </span>
          </div>
        </summary>
        <div className="grid gap-6 px-6 pb-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-brand-navy/8 bg-brand-cream/18 shadow-none">
            <CardHeader>
              <CardTitle>Hero image selection</CardTitle>
              <CardDescription>
                Choose which uploaded image anchors the reusable bilingual layout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectableHeroAssets.length === 0 ? (
                <p className="text-sm text-brand-navy/60">
                  Upload a reference image or receive one by email attachment to use a hero image.
                </p>
              ) : (
                <form action={selectHeroAssetAction.bind(null, post.id)} className="space-y-4">
                  <label className="flex items-center gap-3 rounded-2xl border border-brand-navy/10 px-4 py-3">
                    <input
                      type="radio"
                      name="heroAssetId"
                      value=""
                      defaultChecked={!post.heroAssetId}
                    />
                    <span className="text-sm text-brand-navy">Auto-pick the latest image</span>
                  </label>
                  {selectableHeroAssets.map((asset) => (
                    <label
                      key={asset.id}
                      className="flex items-center gap-4 rounded-2xl border border-brand-navy/10 px-4 py-3"
                    >
                      <input
                        type="radio"
                        name="heroAssetId"
                        value={asset.id}
                        defaultChecked={post.heroAssetId === asset.id}
                      />
                      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:items-center">
                        <Image
                          src={`/api/assets/${asset.id}`}
                          alt={asset.filename}
                          width={88}
                          height={80}
                          unoptimized
                          className="h-20 w-full rounded-2xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-navy">
                            {asset.filename}
                          </p>
                          <p className="text-xs text-brand-navy/55">
                            {asset.kind} • {formatDateTime(asset.createdAt)}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                  <Button type="submit" variant="secondary">
                    Save hero image choice
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-brand-navy/8 bg-brand-cream/18 shadow-none">
              <CardHeader>
                <CardTitle>Extra actions</CardTitle>
                <CardDescription>
                  Use these only when you need a specific re-run, package refresh, or direct reviewer link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={regenerateDesignsAction.bind(null, post.id)}>
                  <Button type="submit" variant="secondary" className="w-full">
                    Regenerate designs only
                  </Button>
                </form>
                {canPreparePackage ? (
                  <form action={preparePackageAction.bind(null, post.id)}>
                    <Button type="submit" variant="ghost" className="w-full">
                      Prepare package now
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-xl border border-brand-navy/10 bg-brand-white px-4 py-3 text-sm text-brand-navy/65">
                    Package creation is locked until both texts and both design previews exist.
                  </div>
                )}
                <a
                  href={buildReviewUrl(post.approvalToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-brand-navy/15 px-4 py-3 text-sm font-semibold text-brand-navy transition hover:border-brand-gold hover:text-brand-gold"
                >
                  Open reviewer page
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </details>

      <details className="group rounded-[2rem] border border-brand-navy/10 bg-white/88 shadow-soft">
        <summary className="cursor-pointer list-none px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-brand-navy">
                Workflow log
              </h2>
              <p className="text-sm text-brand-navy/68">
                Optional. Open this when you want to inspect what the system already did.
              </p>
            </div>
            <span className="text-sm font-semibold text-brand-gold group-open:hidden">Open</span>
            <span className="hidden text-sm font-semibold text-brand-gold group-open:inline">
              Close
            </span>
          </div>
        </summary>
        <div className="overflow-x-auto px-6 pb-6">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>When</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Message</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {logs.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell>{entry.scope}</TableCell>
                  <TableCell className="uppercase">{entry.level}</TableCell>
                  <TableCell>{entry.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}

function getFeedbackMessage(error?: string, success?: string) {
  if (error === 'package_incomplete') {
    return {
      type: 'error' as const,
      message:
        'لا يمكن تجهيز الحزمة الآن. يجب أن يكون المحتوى العربي والألماني جاهزًا مع معاينتي التصميم أولًا.',
    };
  }

  if (error === 'paste_empty') {
    return {
      type: 'error' as const,
      message: 'ألصق النص العربي أو الألماني أولًا قبل تشغيل التعبئة التلقائية.',
    };
  }

  if (success === 'package_ready') {
    return {
      type: 'success' as const,
      message: 'تم تجهيز الحزمة النهائية بنجاح. يمكنك تنزيلها الآن.',
    };
  }

  if (success === 'autofill_ready') {
    return {
      type: 'success' as const,
      message: 'تم توزيع النص تلقائيًا على الحقول. راجع المحتوى ثم أعد توليد التصاميم إذا لزم.',
    };
  }

  return null;
}

function QuickStep({
  step,
  title,
  description,
  done,
}: {
  step: string;
  title: string;
  description: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.5rem] border border-white/12 bg-white/6 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold text-sm font-bold text-brand-deep">
        {done ? '✓' : step}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-brand-white">{title}</p>
        <p className="text-sm leading-6 text-brand-white/72">{description}</p>
      </div>
    </div>
  );
}

function LanguageEditor({
  prefix,
  title,
  headline,
  paragraph,
  supportingLines,
  caption,
  hashtags,
}: {
  prefix: 'ar' | 'de';
  title: string;
  headline: string;
  paragraph: string;
  supportingLines: string[];
  caption: string;
  hashtags: string;
}) {
  return (
    <div className="rounded-[2rem] border border-brand-navy/10 bg-brand-cream/18 p-5">
      <h3 className="text-lg font-semibold text-brand-navy">{title}</h3>
      <div className="mt-4 space-y-4">
        <Field label="Headline" name={`${prefix}Headline`} defaultValue={headline} />
        <Field
          label="Paragraph"
          name={`${prefix}Paragraph`}
          defaultValue={paragraph}
          multiline
          rows={4}
        />
        <Field
          label="Supporting line 1"
          name={`${prefix}SupportingLine1`}
          defaultValue={supportingLines[0] || ''}
        />
        <Field
          label="Supporting line 2"
          name={`${prefix}SupportingLine2`}
          defaultValue={supportingLines[1] || ''}
        />
        <Field
          label="Caption"
          name={`${prefix}Caption`}
          defaultValue={caption}
          multiline
          rows={5}
        />
        <Field
          label="Hashtags"
          name={`${prefix}Hashtags`}
          defaultValue={hashtags}
          multiline
          rows={3}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  multiline = false,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-brand-navy">{label}</label>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          className="w-full rounded-2xl border border-brand-navy/12 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="h-11 w-full rounded-2xl border border-brand-navy/12 bg-brand-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
        />
      )}
    </div>
  );
}

function PreviewThumb({ assetId, label }: { assetId: string; label: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-brand-navy/10 bg-brand-white">
      <Image
        src={`/api/assets/${assetId}`}
        alt={label}
        width={320}
        height={160}
        unoptimized
        className="h-40 w-full object-cover"
      />
      <p className="truncate px-4 py-3 text-sm font-medium text-brand-navy">{label}</p>
    </div>
  );
}
