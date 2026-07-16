import type { SupportedLocale } from '@/i18n/direction';

type ApiHealthReference = {
  endpoint: string;
  method: string;
};

type TopbarActionsProps = {
  apiHealth: ApiHealthReference;
  locale: SupportedLocale;
};

// Dev-only diagnostic toolbar removed for production.
export function TopbarActions(_props: TopbarActionsProps) {
  return null;
}
