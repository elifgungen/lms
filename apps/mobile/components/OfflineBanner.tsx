import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { View } from '@/components/Themed';
import { useOffline } from '@/providers/OfflineProvider';
import { usePalette } from '@/hooks/usePalette';

export function OfflineBanner() {
  const { isOffline } = useOffline();
  const palette = usePalette();

  if (!isOffline) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: palette.warning }]}
      accessibilityRole="alert"
      accessibilityLabel="Çevrimdışı uyarısı"
    >
      <Text style={[styles.text, { color: palette.text }]}>
        Bağlantı yok - içerikler cache üzerinden gösteriliyor
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  text: {
    fontWeight: '600',
  },
});
