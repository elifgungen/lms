import React from 'react';

import { AuthProvider } from './AuthProvider';
import { LocalizationProvider } from './LocalizationProvider';
import { NotificationProvider } from './NotificationProvider';
import { OfflineProvider } from './OfflineProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <LocalizationProvider>
      <OfflineProvider>
        <NotificationProvider>
          <AuthProvider>{children}</AuthProvider>
        </NotificationProvider>
      </OfflineProvider>
    </LocalizationProvider>
  );
}
