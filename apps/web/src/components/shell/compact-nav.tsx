'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { WorkspaceRole } from '@/navigation/roles';
import { cn } from '@/lib/class-names';
import { isNavItemActive, navGlyphs, visibleNavGroups } from './sidebar';

/** UI strings in one place so the translation system can replace them later. */
const labels = {
  bar: 'Quick navigation',
  menu: 'Menu',
  menuTitle: 'All sections',
  close: 'Close menu',
};

/** Bottom bar shortcuts, shown only when the role may open them. Tasks opens on the Kanban board. */
export const QUICK_NAV_IDS = ['dashboard', 'projects', 'tasks'];

const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Below the lg breakpoint (UX R9): a fixed bottom bar with the main shortcuts
 * and a Menu button that opens every permitted section in a dialog. Logical
 * (start/end) classes only, so the layout mirrors under dir="rtl".
 */
export function CompactNav({ role }: { role: WorkspaceRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const titleId = useId();
  const panelId = useId();

  const groups = visibleNavGroups(role);
  const items = groups.flatMap((group) => group.items);
  const quick = QUICK_NAV_IDS.flatMap((id) => items.filter((item) => item.id === id));

  // A followed link closes the menu.
  useEffect(() => setOpen(false), [pathname]);

  // Growing past the breakpoint hides the menu, so drop its state and scroll lock.
  useEffect(() => {
    if (!open) return;
    const onResize = () => window.matchMedia(DESKTOP_QUERY).matches && setOpen(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  useEffect(() => {
    if (open) {
      const overflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      closeButton.current?.focus();
      wasOpen.current = true;
      return () => {
        document.body.style.overflow = overflow;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      menuButton.current?.focus();
    }
  }, [open]);

  function onPanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key !== 'Tab' || !panel.current) return;
    const focusable = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }

  return (
    <>
      <nav
        aria-label={labels.bar}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-14px_34px_-30px_rgba(15,23,42,0.7)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto flex max-w-xl">
          {quick.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <li key={item.id} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-semibold focus-visible:bg-soft',
                    active ? 'text-accent' : 'text-slate-600 hover:text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md text-[0.58rem] font-black',
                      active ? 'bg-accent text-white' : 'bg-soft text-slate-600',
                    )}
                  >
                    {navGlyphs[item.id]}
                  </span>
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              ref={menuButton}
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-controls={panelId}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[0.7rem] font-semibold text-slate-600 hover:text-ink focus-visible:bg-soft"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
              <span className="max-w-full truncate">{labels.menu}</span>
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div
            ref={panel}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={onPanelKeyDown}
            className="absolute inset-y-0 start-0 flex w-[min(20rem,85vw)] flex-col bg-navy text-white shadow-shell"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
              <div aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-black text-navy">
                M
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold tracking-tight">MAOS</p>
                <h2 id={titleId} className="truncate text-xs text-slate-300">{labels.menuTitle}</h2>
              </div>
              <button
                ref={closeButton}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={labels.close}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white focus-visible:bg-white/10"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Workspace" className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
              {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-3 pb-1 text-[0.7rem] font-bold uppercase tracking-[0.22em] text-slate-500">{group.label}</p>
                  {group.items.map((item) => {
                    const active = isNavItemActive(item, pathname);
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setOpen(false)}
                        className={cn(
                          'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold',
                          active ? 'bg-white text-navy' : 'text-slate-300 hover:bg-white/10 hover:text-white focus-visible:bg-white/10',
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[0.62rem] font-black',
                            active ? 'bg-accent text-white' : 'bg-white/10 text-slate-200',
                          )}
                        >
                          {navGlyphs[item.id] ?? item.label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}
