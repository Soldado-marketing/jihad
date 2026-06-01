import Link from 'next/link';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-gold">
            404
          </p>
          <CardTitle className="text-3xl">Workflow page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-brand-navy/68">
            The requested SH Investments workflow page does not exist.
          </p>
          <Link
            href="/topics"
            className="inline-flex rounded-xl bg-brand-navy px-4 py-2 text-sm font-semibold text-brand-white transition-colors duration-200 hover:bg-brand-deep"
          >
            Return to topics
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
