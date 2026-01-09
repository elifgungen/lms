import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  TextInput
} from 'react-native';
import { Link } from 'expo-router';

import { View as ThemedView } from '@/components/Themed';
import { Exam, fetchWithCache, getExams } from '@/services/api';
import { usePalette } from '@/hooks/usePalette';

export default function ExamsScreen() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const palette = usePalette();

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchWithCache('exams', getExams);
      setExams(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filteredExams = exams.filter(exam =>
    (exam.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderExamCard = ({ item: exam }: { item: Exam }) => (
    <View style={[styles.card, {
      backgroundColor: palette.glassBg,
      borderColor: palette.border
    }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={2}>
          {exam.title}
        </Text>
        {exam.sebEnabled && (
          <View style={styles.sebBadge}>
            <Text style={styles.sebBadgeText}>🔒 SEB</Text>
          </View>
        )}
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.metaBadge, { backgroundColor: palette.surface }]}>
          <Text style={[styles.metaText, { color: palette.muted }]}>
            ⏱️ {exam.durationMinutes || 45} dk
          </Text>
        </View>
        <View style={[styles.metaBadge, {
          backgroundColor: exam.status === 'published'
            ? 'rgba(34, 197, 94, 0.15)'
            : palette.surface
        }]}>
          <Text style={[styles.metaText, {
            color: exam.status === 'published' ? '#22c55e' : palette.muted
          }]}>
            {exam.status === 'published' ? '✓ Yayında' : '○ Taslak'}
          </Text>
        </View>
      </View>

      {exam.description && (
        <Text style={[styles.cardDescription, { color: palette.muted }]} numberOfLines={2}>
          {exam.description}
        </Text>
      )}

      <Link href={`/exam/${exam.id}` as any} asChild>
        <Pressable style={styles.startButton}>
          <View style={styles.startButtonGradient}>
            <Text style={styles.startButtonText}>🚀 Sınava Başla</Text>
          </View>
        </Pressable>
      </Link>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} size="large" />
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: palette.text }]}>📝 Sınavlar</Text>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, {
          backgroundColor: palette.surface,
          borderColor: palette.border
        }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Sınav Ara..."
            placeholderTextColor={palette.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Exam List */}
      <FlatList
        data={filteredExams}
        keyExtractor={(item) => item.id}
        renderItem={renderExamCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              Sınav bulunamadı
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  sebBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sebBadgeText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 13,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  startButtonGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 12,
  },
  startButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
