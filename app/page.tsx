import { Suspense } from 'react';
import { BalancesPage } from '@/components/balance/BalancesPage';

export default function Home() {
  return (
    <Suspense fallback={<div />}>
      <BalancesPage />
    </Suspense>
  );
}




