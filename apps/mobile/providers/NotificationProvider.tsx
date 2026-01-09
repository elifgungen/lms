import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

type NotificationContextValue = {
  pushToken: string | null;
  status: 'idle' | 'pending' | 'denied' | 'granted' | 'error';
  requestPermissions: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getProjectId() {
  const easId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  return easId ?? null;
}

async function registerForPushNotifications() {
  const projectId = await getProjectId();
  if (!projectId) {
    return { token: null, status: 'error' as const };
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { token: null, status: 'denied' as const };
  }

  if (!Device.isDevice) {
    return { token: null, status: 'error' as const };
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });

  if (Device.osName === 'Android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return { token: tokenResponse.data, status: 'granted' as const };
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [status, setStatus] = useState<NotificationContextValue['status']>('idle');

  const requestPermissions = async () => {
    setStatus('pending');
    try {
      if (Platform.OS === 'web') {
        setStatus('error');
        return;
      }
      const result = await registerForPushNotifications();
      setPushToken(result.token);
      setStatus(result.status);
    } catch (error) {
      setStatus('error');
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const value = useMemo(
    () => ({
      pushToken,
      status,
      requestPermissions,
    }),
    [pushToken, status],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationsSetup() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationsSetup must be used within NotificationProvider');
  return ctx;
}
