'use client';

import { use, useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { HiddenDataNotice } from '@/components/dashboard/hidden-data-notice';
import { apiFetch } from '@/lib/fetch';

type Report = {
  id: string;
  name: string;
  description?: string;
  visibility: 'INTERNAL' | 'CLIENT_VISIBLE';
};

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Report>(`/reports/${id}`)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Permission-filtered reporting"
        title={loading ? 'Report detail' : (report?.name ?? 'Report not found')}
        description="Report output is intentionally filtered by role. Hidden totals stay suppressed for users who should not see them."
      />
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !report ? (
        <p className="text-sm text-red-500">Report not found.</p>
      ) : (
        <section aria-label="Report detail" className="grid gap-4">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-lift">
            <p className="text-sm font-medium text-slate-600">{report.visibility === 'CLIENT_VISIBLE' ? 'Client-visible report' : 'Internal report'}</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">{report.name}</h3>
            {report.description && (
              <p className="mt-2 text-sm leading-6 text-slate-600">{report.description}</p>
            )}
            <p className="mt-2 text-sm text-slate-500">Reference: {report.id}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-lift">
            <h3 className="font-semibold text-ink">Report run preview</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Report runs return permission-filtered rows only. Automated delivery and advanced builders are deferred.
            </p>
          </div>
          <HiddenDataNotice />
        </section>
      )}
    </div>
  );
}
