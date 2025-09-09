'use client';

import { ReactNode } from 'react';
import { OfflineProvider } from './offline-provider';
import { AuthProvider } from '@/contexts/auth-context';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <OfflineProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </OfflineProvider>
  );
}