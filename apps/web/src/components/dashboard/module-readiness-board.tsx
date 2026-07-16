'use client';

import { motion, useReducedMotion } from 'framer-motion';

const modules = [
  { label: 'Identity', owner: 'Backend', status: 'API skeleton', risk: 'No live login flow' },
  { label: 'Projects', owner: 'Delivery', status: 'UI preview', risk: 'Not persisted' },
  { label: 'CRM', owner: 'Sales', status: 'UI preview', risk: 'Not persisted' },
  { label: 'Files', owner: 'Operations', status: 'Metadata UI', risk: 'Storage inactive' },
  { label: 'Chat', owner: 'Team', status: 'UI preview', risk: 'Realtime inactive' },
  { label: 'Finance', owner: 'Owner', status: 'Owner-only UI', risk: 'Payment provider inactive' },
  { label: 'Voice', owner: 'Delivery', status: 'Review UI', risk: 'AI inactive' },
  { label: 'Reports', owner: 'Owner/Manager', status: 'Privacy UI', risk: 'No export engine' },
];

export function ModuleReadinessBoard() {
  const reduced = useReducedMotion();

  return (
    <section aria-labelledby="module-readiness-title" className="rounded-2xl border border-line bg-panel p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            MVP modules
          </p>
          <h3 id="module-readiness-title" className="mt-2 text-xl font-semibold text-ink">
            Readiness and current limits
          </h3>
        </div>
        <p className="text-sm text-slate-600">Current state based on actual code inspection.</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-line">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1fr_0.9fr_1fr_1fr] bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>Module</span>
            <span>Owner</span>
            <span>Status</span>
            <span>Limit</span>
          </div>
          {modules.map((module, i) => (
            <motion.div
              key={module.label}
              className="grid grid-cols-[1fr_0.9fr_1fr_1fr] border-t border-line bg-white px-4 py-3 text-sm transition-colors hover:bg-slate-50"
              initial={reduced ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                ease: [0.0, 0.0, 0.2, 1],
                delay: reduced ? 0 : 0.05 + i * 0.04,
              }}
            >
              <span className="font-semibold text-ink">{module.label}</span>
              <span className="text-slate-600">{module.owner}</span>
              <span className="text-slate-700">{module.status}</span>
              <span className="text-slate-600">{module.risk}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
