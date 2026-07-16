'use client';

import { useEffect, useState } from 'react';
import { SummaryCard } from './summary-card';
import { StaggerList, StaggerItem } from '@/components/motion';
import { apiFetch } from '@/lib/fetch';

type WorkspaceSummary = {
  projectTasks: { projects: number; tasks: number };
  crm: { leads: number; opportunities: number; meetings: number; pendingFollowUps: number };
  collaboration: { notes: number; files: number; pendingApprovals: number };
  voiceNotes: number;
  invoices: number;
};

export function WorkspaceSummaryGrid() {
  const [data, setData] = useState<WorkspaceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<WorkspaceSummary>('/dashboards/workspace-summary')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const n = (v: number | undefined) => (loading ? '…' : String(v ?? 0));

  const cards = [
    {
      label: 'Projects & Tasks',
      detail: `${n(data?.projectTasks.projects)} projects · ${n(data?.projectTasks.tasks)} tasks`,
      value: n(data?.projectTasks.projects),
    },
    {
      label: 'CRM',
      detail: `${n(data?.crm.leads)} leads · ${n(data?.crm.opportunities)} opps · ${n(data?.crm.meetings)} meetings`,
      value: n(data?.crm.leads),
    },
    {
      label: 'Collaboration',
      detail: `${n(data?.collaboration.notes)} notes · ${n(data?.collaboration.pendingApprovals)} pending approvals`,
      value: n(data?.collaboration.notes),
    },
    {
      label: 'Files & Approvals',
      detail: `${n(data?.collaboration.files)} files · ${n(data?.collaboration.pendingApprovals)} pending`,
      value: n(data?.collaboration.files),
    },
    {
      label: 'Voice Notes',
      detail: 'Voice notes and transcription task drafts.',
      value: n(data?.voiceNotes),
    },
    {
      label: 'Finance',
      detail: `${n(data?.invoices)} invoices. Revenue, costs, and payments.`,
      value: n(data?.invoices),
    },
  ];

  return (
    <StaggerList
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      aria-label="Workspace summary"
    >
      {cards.map((c) => (
        <StaggerItem key={c.label}>
          <SummaryCard label={c.label} detail={c.detail} value={c.value} />
        </StaggerItem>
      ))}
    </StaggerList>
  );
}
