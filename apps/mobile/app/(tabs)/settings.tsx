import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View as RNView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { View } from '@/components/Themed';
import { useAuth } from '@/providers/AuthProvider';
import { useLocalization } from '@/providers/LocalizationProvider';
import { useNotificationsSetup } from '@/providers/NotificationProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { usePalette } from '@/hooks/usePalette';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { languages, language, setLanguage } = useLocalization();
  const { status, requestPermissions, pushToken } = useNotificationsSetup();
  const { biometricLogin, signOut, user } = useAuth();
  const { isOffline } = useOffline();
  const palette = usePalette();

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>{t('settings')}</Text>
      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('language')}</Text>
        <RNView style={styles.row}>
          {languages.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => setLanguage(lang.code)}
              style={[
                styles.badge,
                { backgroundColor: palette.surface },
                language === lang.code && { backgroundColor: palette.primary },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === lang.code }}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: palette.text },
                  language === lang.code && styles.badgeTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </Pressable>
          ))}
        </RNView>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('notifications')}</Text>
        <RNView style={styles.rowBetween}>
          <Text style={[styles.meta, { color: palette.muted }]}>Durum: {status}</Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.secondary }]}
            onPress={requestPermissions}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('grantPermission')}</Text>
          </Pressable>
        </RNView>
        {pushToken && <Text style={[styles.meta, { color: palette.muted }]}>Push token: {pushToken}</Text>}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('enableBiometric')}</Text>
        <RNView style={styles.rowBetween}>
          <Text style={[styles.meta, { color: palette.muted }]}>
            {user ? user.email : t('biometricsUnavailable')}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: palette.secondary }]}
            onPress={biometricLogin}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t('authenticate')}</Text>
          </Pressable>
        </RNView>
        {user && (
          <Pressable style={styles.dangerButton} onPress={signOut}>
            <Text style={styles.dangerText}>Oturumu Kapat</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>{t('offlineMode')}</Text>
        <RNView style={styles.rowBetween}>
          <Text style={[styles.meta, { color: palette.muted }]}>{t('offlineDescription')}</Text>
          <Switch value={isOffline} disabled />
        </RNView>
        <Text style={[styles.meta, { color: palette.muted }]}>Bağlantı durumunu otomatik izliyoruz.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  badgeText: {
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#fff',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    color: '#064e3b',
    fontWeight: '800',
  },
  meta: {
    color: '#9ca3af',
  },
  dangerButton: {
    marginTop: 8,
    backgroundColor: '#7f1d1d',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerText: {
    color: '#fecdd3',
    fontWeight: '700',
  },
});
