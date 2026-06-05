const lanes = [
  {
    label: 'Delivery flow',
    items: ['Projects scoped', 'Tasks triaged', 'Approvals waiting'],
    value: '18 active tasks',
  },
  {
    label: 'Client boundary',
    items: ['Client dashboard safe', 'Finance hidden', 'Internal notes blocked'],
    value: '3 client-safe views',
  },
  {
    label: 'Launch gates',
    items: ['Railway staging pending', 'UAT evidence pending', '50-user load test pending'],
    value: 'No-Go until evidence',
  },
];

const focusItems = [
  {
    owner: 'Owner',
    task: 'Review staging deployment package and confirm Railway environment values.',
    status: 'Ready',
  },
  {
    owner: 'Manager',
    task: 'Validate projects, CRM, files, approvals, chat, and report placeholders.',
    status: 'In review',
  },
  {
    owner: 'QA',
    task: 'Capture UAT screenshots and load-test evidence before production approval.',
    status: 'Blocked by staging',
  },
];

export function WorkspaceCommandCenter() {
  return (
    <section aria-labelledby="command-center-title" className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-md border border-line bg-panel p-5 shadow-shell">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">
              Command center
            </p>
            <h3 id="command-center-title" className="mt-2 text-2xl font-semibold text-ink">
              MAOS MVP operating view
            </h3>
          </div>
          <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Staging not deployed
          </span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {lanes.map((lane) => (
            <article key={lane.label} className="rounded-md border border-line bg-white p-4">
              <p className="text-sm font-semibold text-ink">{lane.label}</p>
              <p className="mt-2 text-lg font-semibold text-accent">{lane.value}</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {lane.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-line bg-panel p-5 shadow-shell">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">Today</p>
        <h3 className="mt-2 text-xl font-semibold text-ink">Execution focus</h3>
        <div className="mt-4 space-y-3">
          {focusItems.map((item) => (
            <article key={item.task} className="rounded-md border border-line bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">{item.owner}</p>
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.task}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
