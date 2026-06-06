'use client';

import { useMemo, useState } from 'react';
import type { SupportedLocale } from '@/i18n/direction';

type ApiHealthReference = {
  endpoint: string;
  method: string;
};

type TopbarActionsProps = {
  apiHealth: ApiHealthReference;
  locale: SupportedLocale;
};

const localeOrder: SupportedLocale[] = ['en', 'ar', 'de'];
const localeLabels: Record<SupportedLocale, string> = {
  ar: 'AR',
  de: 'DE',
  en: 'EN',
};

export function TopbarActions({ apiHealth, locale }: TopbarActionsProps) {
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(locale);
  const [apiStatus, setApiStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>(
    'idle',
  );

  const nextLocale = useMemo(() => {
    const currentIndex = localeOrder.indexOf(activeLocale);
    return localeOrder[(currentIndex + 1) % localeOrder.length];
  }, [activeLocale]);

  async function checkApiHealth() {
    setApiStatus('checking');

    try {
      await fetch(apiHealth.endpoint, {
        cache: 'no-store',
        mode: 'no-cors',
      });
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    }
  }

  return (
    <>
      <a
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 focus-visible:bg-amber-100"
        href="/dashboard"
      >
        Local preview
      </a>
      <button
        className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:bg-slate-50"
        onClick={() => setActiveLocale(nextLocale)}
        title="Cycles the local preview language label only. Full translated UI is not active yet."
        type="button"
      >
        Locale: {localeLabels[activeLocale]}
      </button>
      <button
        className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 focus-visible:bg-slate-50"
        onClick={checkApiHealth}
        title="Checks the local API. It will show offline until apps/api and DATABASE_URL are running."
        type="button"
      >
        API: {apiStatus === 'idle' ? `${apiHealth.method} /api/health` : apiStatus === 'offline' ? 'not connected' : apiStatus}
      </button>
    </>
  );
}
