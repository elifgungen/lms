import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuth } from '@/providers/AuthProvider';
import { useNotificationsSetup } from '@/providers/NotificationProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { usePalette } from '@/hooks/usePalette';

const cards = [
  { href: '/(tabs)/courses', title: 'Dersler', icon: '📚', description: 'Video, PDF, indirme, not alma' },
  { href: '/(tabs)/exams', title: 'Sınavlar', icon: '📝', description: 'Timer, anti-cheat, çoktan seçmeli' },
  { href: '/(tabs)/scanner', title: 'Optik Okuyucu', icon: '📷', description: 'Köşe tespiti, batch tarama' },
  { href: '/(tabs)/settings', title: 'Ayarlar', icon: '⚙️', description: 'Dil, biometrik, izinler' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const { user, biometricLogin } = useAuth();
  const { status } = useNotificationsSetup();
  const { isOffline } = useOffline();
  const palette = usePalette();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <OfflineBanner />

          {/* Header Section */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: palette.muted }]}>Hoş geldin, 👋</Text>
              <Text style={[styles.userName, { color: palette.text }]}>
                {user?.name || 'Misafir Kullanıcı'}
              </Text>
            </View>
            <Pressable
              style={[styles.profileButton, { backgroundColor: palette.surface }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Text style={styles.profileIcon}>{user?.name?.charAt(0) || '?'}</Text>
            </Pressable>
          </View>

          {/* Hero/Welcome Card */}
          <View style={[styles.heroCard, {
            backgroundColor: palette.glassBg,
            borderColor: palette.border
          }]}>
            <View style={styles.heroContent}>
              <Text style={[styles.heroTitle, { color: palette.text }]}>
                {user ? 'Öğrenmeye Devam Et' : 'Giriş Yapmalısın'}
              </Text>
              <Text style={[styles.heroSubtitle, { color: palette.muted }]}>
                {user
                  ? 'Derslerine ve sınavlarına kaldığın yerden devam et.'
                  : 'İçeriklere erişmek için giriş yap.'}
              </Text>

              {!user ? (
                <Pressable
                  style={styles.heroButton}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <View style={styles.heroButtonGradient}>
                    <Text style={styles.heroButtonText}>Giriş Yap</Text>
                  </View>
                </Pressable>
              ) : (
                <View style={styles.statsRow}>
                  <View style={[styles.statItem, { backgroundColor: palette.surface }]}>
                    <Text style={[styles.statValue, { color: palette.primary }]}>3</Text>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Aktif Ders</Text>
                  </View>
                  <View style={[styles.statItem, { backgroundColor: palette.surface }]}>
                    <Text style={[styles.statValue, { color: palette.secondary }]}>2</Text>
                    <Text style={[styles.statLabel, { color: palette.muted }]}>Yaklaşan Sınav</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Quick Actions Grid */}
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Hızlı Erişim</Text>
          <View style={styles.grid}>
            {cards.map((card) => (
              <Link key={card.href} href={card.href as any} asChild>
                <Pressable
                  style={[styles.card, { backgroundColor: palette.glassBg, borderColor: palette.border }]}
                >
                  <View style={[styles.iconContainer, { backgroundColor: palette.surface }]}>
                    <Text style={styles.cardIcon}>{card.icon}</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>{card.title}</Text>
                    <Text style={[styles.cardDescription, { color: palette.muted }]} numberOfLines={2}>
                      {card.description}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            ))}
          </View>

          {/* System Status */}
          <View style={[styles.statusCard, { backgroundColor: palette.surface }]}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: palette.muted }]}>Bildirimler</Text>
              <View style={[styles.badge, {
                backgroundColor: status === 'granted' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'
              }]}>
                <Text style={{
                  color: status === 'granted' ? '#22c55e' : '#ef4444',
                  fontSize: 12, fontWeight: '600'
                }}>
                  {status === 'granted' ? 'Açık' : 'Kapalı'}
                </Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: palette.muted }]}>Bağlantı</Text>
              <View style={[styles.badge, {
                backgroundColor: !isOffline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)'
              }]}>
                <Text style={{
                  color: !isOffline ? '#22c55e' : '#f59e0b',
                  fontSize: 12, fontWeight: '600'
                }}>
                  {!isOffline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#06b6d4',
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroContent: {
    gap: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  heroButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  heroButtonGradient: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    alignItems: 'center',
  },
  heroButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: -8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: '47%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 20,
  },
  cardInfo: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    opacity: 0.1,
    marginVertical: 4,
  },
});
