import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as Network from 'expo-network';

type OfflineContextValue = {
  isOffline: boolean;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let mounted = true;
    Network.getNetworkStateAsync().then((state) => {
      if (!mounted) return;
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    const subscription = Network.addNetworkStateListener((state) => {
      setIsOffline(!state.isConnected || !state.isInternetReachable);
    });

    return () => {
      mounted = false;
      subscription && subscription.remove();
    };
  }, []);

  const value = useMemo(() => ({ isOffline }), [isOffline]);

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}
