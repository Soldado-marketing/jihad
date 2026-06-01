import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agency OS | Marketing Operations',
  description: 'A ClickUp-style operating board for a distributed marketing agency.',
};

const stats = [
  { label: 'Active clients', value: '18', note: '+4 this quarter' },
  { label: 'Open deliverables', value: '126', note: '41 due this week' },
  { label: 'Blocked items', value: '9', note: 'Needs decision' },
  { label: 'On-time delivery', value: '92%', note: 'Last 30 days' },
];

const columns = [
  {
    title: 'Briefing',
    count: 12,
    tone: 'bg-sky-50 text-sky-800 ring-sky-200',
    tasks: [
      {
        title: 'Ramadan campaign master brief',
        client: 'Noura Clinics',
        type: 'Campaign',
        owner: 'Account Lead',
        due: 'May 27',
        priority: 'High',
      },
      {
        title: 'Weekly TikTok content angles',
        client: 'FitLab GCC',
        type: 'Script',
        owner: 'Script Team',
        due: 'May 28',
        priority: 'Medium',
      },
    ],
  },
  {
    title: 'Production',
    count: 37,
    tone: 'bg-amber-50 text-amber-800 ring-amber-200',
    tasks: [
      {
        title: 'Product launch carousel set',
        client: 'Luma Beauty',
        type: 'Design',
        owner: 'Graphic Design',
        due: 'May 26',
        priority: 'High',
      },
      {
        title: 'Founder story reel edit',
        client: 'Apex Real Estate',
        type: 'Video',
        owner: 'Video Editor',
        due: 'May 29',
        priority: 'Medium',
      },
      {
        title: 'YouTube shorts subtitle pack',
        client: 'Mena Finance',
        type: 'Video',
        owner: 'Motion Team',
        due: 'May 30',
        priority: 'Low',
      },
    ],
  },
  {
    title: 'Internal Review',
    count: 18,
    tone: 'bg-violet-50 text-violet-800 ring-violet-200',
    tasks: [
      {
        title: 'Meta ads visual variants',
        client: 'Prime Auto',
        type: 'Ads',
        owner: 'Creative Director',
        due: 'Today',
        priority: 'High',
      },
      {
        title: 'Arabic landing page copy',
        client: 'CloudDesk',
        type: 'Copy',
        owner: 'Content Lead',
        due: 'May 25',
        priority: 'High',
      },
    ],
  },
  {
    title: 'Client Approval',
    count: 22,
    tone: 'bg-rose-50 text-rose-800 ring-rose-200',
    tasks: [
      {
        title: 'Monthly Instagram grid',
        client: 'Vera Home',
        type: 'Social',
        owner: 'Client Manager',
        due: 'May 25',
        priority: 'Medium',
      },
      {
        title: 'Q2 performance report deck',
        client: 'Nova Schools',
        type: 'Report',
        owner: 'Strategy',
        due: 'May 31',
        priority: 'Low',
      },
    ],
  },
  {
    title: 'Scheduled',
    count: 37,
    tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    tasks: [
      {
        title: 'LinkedIn thought leadership batch',
        client: 'B2B Growth Hub',
        type: 'Social',
        owner: 'Publishing',
        due: 'Jun 02',
        priority: 'Medium',
      },
      {
        title: 'Eid offer story sequence',
        client: 'Urban Cafe',
        type: 'Story',
        owner: 'Publishing',
        due: 'Jun 03',
        priority: 'High',
      },
    ],
  },
];

const teamLoad = [
  { team: 'Video Editors', region: 'Turkey / UAE', used: 86, open: 31 },
  { team: 'Graphic Designers', region: 'Syria / Egypt', used: 74, open: 44 },
  { team: 'Script Writers', region: 'Jordan / Remote', used: 61, open: 19 },
  { team: 'Account Managers', region: 'Germany / GCC', used: 92, open: 28 },
];

const automations = [
  'Create subtasks when content type is Video: script, assets, edit, review, export.',
  'Move to Client Approval when internal reviewer marks approved.',
  'Escalate overdue high-priority deliverables to the operations lead.',
  'Generate weekly client status report every Monday morning.',
];

const calendar = [
  { day: 'Mon', items: 18, label: 'Design reviews' },
  { day: 'Tue', items: 24, label: 'Video exports' },
  { day: 'Wed', items: 16, label: 'Client approvals' },
  { day: 'Thu', items: 31, label: 'Publishing' },
  { day: 'Fri', items: 22, label: 'Reports' },
];

export default function AgencyOSPage() {
  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-[2rem] border border-brand-navy/10 bg-brand-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-brand-navy p-6 text-brand-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-sand">
              Marketing agency command center
            </p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
              One operating board for clients, content, approvals, and delivery.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-brand-white/72 sm:text-base">
              Built for distributed teams handling video editing, graphic design,
              scripts, campaigns, reviews, and publishing across multiple markets.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/6 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-brand-sand/85">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                  <p className="mt-1 text-xs text-brand-white/58">{stat.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-cream/55 p-6 sm:p-8">
            <div className="grid h-full content-between gap-5">
              <div>
                <p className="text-sm font-semibold text-brand-navy">
                  Intake control
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    'Client request',
                    'Creative brief',
                    'Production assignment',
                    'Internal QA',
                    'Client approval',
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex items-center gap-3 rounded-2xl border border-brand-navy/10 bg-white/78 px-4 py-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-sm font-semibold text-brand-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-brand-navy">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-brand-navy/10 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-gold">
                  Operating rule
                </p>
                <p className="mt-2 text-sm leading-6 text-brand-navy/72">
                  No task enters production without a client, owner, channel,
                  due date, asset link, and approval path.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-[2rem] border border-brand-navy/10 bg-white/88 p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-navy">
                Production board
              </h2>
              <p className="mt-1 text-sm text-brand-navy/62">
                ClickUp-style workflow grouped by delivery stage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {['All markets', 'This week', 'High priority'].map((filter) => (
                <span
                  key={filter}
                  className="rounded-full border border-brand-navy/10 bg-brand-cream/60 px-3 py-2 text-brand-navy"
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-4 overflow-x-auto pb-2 xl:grid-cols-5">
            {columns.map((column) => (
              <div
                key={column.title}
                className="min-w-[260px] rounded-2xl border border-brand-navy/10 bg-surface-50 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${column.tone}`}
                  >
                    {column.title}
                  </span>
                  <span className="text-sm font-semibold text-brand-navy/58">
                    {column.count}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {column.tasks.map((task) => (
                    <article
                      key={`${column.title}-${task.title}`}
                      className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-[0_18px_40px_-34px_rgba(7,15,38,0.55)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold leading-5 text-brand-navy">
                          {task.title}
                        </h3>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-brand-navy/56">
                        {task.client}
                      </p>
                      <div className="mt-4 grid gap-2 text-xs text-brand-navy/68">
                        <Row label="Type" value={task.type} />
                        <Row label="Owner" value={task.owner} />
                        <Row label="Due" value={task.due} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Team workload" subtitle="Capacity by function">
            <div className="space-y-4">
              {teamLoad.map((item) => (
                <div key={item.team}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {item.team}
                      </p>
                      <p className="text-xs text-brand-navy/54">{item.region}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-navy">
                      {item.open}
                    </p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-brand-cream">
                    <div
                      className="h-2 rounded-full bg-brand-gold"
                      style={{ width: `${item.used}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Weekly delivery map" subtitle="Operational volume">
            <div className="grid grid-cols-5 gap-2">
              {calendar.map((item) => (
                <div
                  key={item.day}
                  className="rounded-2xl border border-brand-navy/10 bg-brand-cream/45 p-3 text-center"
                >
                  <p className="text-xs font-semibold text-brand-navy/58">
                    {item.day}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-brand-navy">
                    {item.items}
                  </p>
                  <p className="mt-2 min-h-8 text-[11px] leading-4 text-brand-navy/58">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Automations" subtitle="Rules to reduce manual follow-up">
            <ul className="space-y-3">
              {automations.map((automation) => (
                <li
                  key={automation}
                  className="rounded-2xl border border-brand-navy/10 bg-white px-4 py-3 text-sm leading-6 text-brand-navy/72"
                >
                  {automation}
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-brand-navy/10 bg-white/88 p-5 shadow-soft">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-brand-navy">{title}</h2>
        <p className="mt-1 text-sm text-brand-navy/60">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="font-semibold text-brand-navy">{value}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const classes =
    priority === 'High'
      ? 'bg-danger-50 text-danger-700'
      : priority === 'Medium'
        ? 'bg-warning-50 text-warning-700'
        : 'bg-success-50 text-success-700';

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${classes}`}>
      {priority}
    </span>
  );
}
