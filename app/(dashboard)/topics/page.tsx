import type { Metadata } from 'next';

import { createManualTopicAction, syncInboxAction } from '@/app/(dashboard)/topics/actions';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getReadinessSnapshot } from '@/lib/env';
import { listPosts } from '@/lib/repositories/posts';
import { formatDateTime } from '@/lib/utils';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Topics | SH Investments Workflow',
  description: 'Weekly bilingual social media workflow dashboard for SH Investments.',
};

export const dynamic = 'force-dynamic';

export default function TopicsPage() {
  const posts = listPosts();
  const readiness = getReadinessSnapshot();

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
        <Card className="overflow-hidden border-brand-navy/20 bg-brand-navy text-brand-white">
          <CardHeader className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(249,202,141,0.18),_transparent_30%),linear-gradient(135deg,_rgba(252,252,252,0.08),_transparent)]" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-sand">
                SH Investments internal workflow
              </p>
              <CardTitle className="max-w-2xl text-3xl text-brand-white sm:text-4xl">
                Weekly bilingual social posts from inbox to manual publishing package.
              </CardTitle>
              <CardDescription className="max-w-2xl text-brand-white/72">
                Topics arrive by email, content and designs are generated in Arabic and German,
                reviewers approve by email, and the final output stays locked to manual publishing only.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Topics" value={String(posts.length)} />
            <MetricCard
              label="Ready"
              value={String(posts.filter((post) => post.status === 'ready').length)}
            />
            <MetricCard
              label="In Review"
              value={String(posts.filter((post) => post.status === 'in_review').length)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New topic</CardTitle>
            <CardDescription>
              Create a manual test topic or sync the inbox when IMAP is configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={createManualTopicAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-navy" htmlFor="topicTitle">
                  Topic title
                </label>
                <input
                  id="topicTitle"
                  name="topicTitle"
                  required
                  placeholder="Example: Turbo AFA for solar investments"
                  className="h-12 w-full rounded-2xl border border-brand-navy/15 bg-brand-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-navy" htmlFor="topicNotes">
                  Notes
                </label>
                <textarea
                  id="topicNotes"
                  name="topicNotes"
                  rows={4}
                  placeholder="Optional internal briefing, angle, or constraints."
                  className="w-full rounded-3xl border border-brand-navy/15 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition focus:border-brand-gold"
                />
              </div>
              <Button type="submit" className="w-full">
                Create draft topic
              </Button>
            </form>

            <div className="rounded-3xl border border-brand-navy/10 bg-brand-cream/45 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-brand-navy">Inbox sync</p>
                  <p className="text-sm text-brand-navy/60">
                    SMTP is ready for outgoing review email. IMAP is required for inbox monitoring.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    readiness.imap
                      ? 'bg-brand-sand/20 text-brand-navy'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {readiness.imap ? 'Ready' : 'Needs IMAP'}
                </span>
              </div>
              {readiness.imap ? (
                <form action={syncInboxAction}>
                  <Button type="submit" variant="secondary" className="w-full">
                    Sync inbox now
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-brand-navy/65">
                  Add IMAP credentials to enable automatic topic intake from email.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Incoming topics</CardTitle>
            <CardDescription>
              Every record becomes one bilingual post workflow for SH Investments only.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {posts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-navy/20 bg-brand-cream/30 p-10 text-center text-sm text-brand-navy/65">
                No topics yet. Create a manual draft or sync the inbox.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Topic</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Designs</TableHead>
                    <TableHead>Updated</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <Link
                            href={`/topics/${post.id}`}
                            className="font-semibold text-brand-navy transition hover:text-brand-gold"
                          >
                            {post.topicTitle}
                          </Link>
                          <p className="text-xs text-brand-navy/55">
                            {post.sourceSubject || post.sourceFrom || 'Manual topic'}
                          </p>
                          {post.reviewComment ? (
                            <p className="text-xs text-red-700">{post.reviewComment}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{post.sourceType}</TableCell>
                      <TableCell>
                        <StatusBadge status={post.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-brand-navy/70">
                          AR {post.hasArabicDesign ? 'Yes' : 'No'} / DE {post.hasGermanDesign ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell>{formatDateTime(post.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment readiness</CardTitle>
            <CardDescription>
              External integrations stay in environment variables and are never editable in-app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadinessRow label="SMTP review email" ready={readiness.smtp} />
            <ReadinessRow label="IMAP inbox intake" ready={readiness.imap} />
            <ReadinessRow
              label={`Storage driver: ${readiness.storageDriver}`}
              ready={readiness.storage}
            />
            <ReadinessRow label="Content generation" ready={readiness.content} />
            <ReadinessRow label="Reviewer email" ready={readiness.reviewer} />
            <ReadinessRow label="Scheduler secret" ready={readiness.scheduler} />
            <Link
              href="/settings"
              className="inline-flex text-sm font-semibold text-brand-gold transition hover:text-brand-navy"
            >
              Open settings summary
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sand/90">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-brand-white">{value}</p>
    </div>
  );
}

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-navy/10 bg-brand-cream/28 px-4 py-3">
      <span className="text-sm text-brand-navy">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
          ready ? 'bg-brand-sand/20 text-brand-navy' : 'bg-red-50 text-red-700'
        }`}
      >
        {ready ? 'Ready' : 'Missing'}
      </span>
    </div>
  );
}
