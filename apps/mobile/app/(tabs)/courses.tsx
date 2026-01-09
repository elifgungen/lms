import React, { useEffect, useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';

import { View as ThemedView } from '@/components/Themed';
import { Course, fetchWithCache, getCourses } from '@/services/api';
import { downloadManager } from '@/services/downloadManager';
import { usePalette } from '@/hooks/usePalette';

export default function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [offlineMap, setOfflineMap] = useState<Record<string, boolean>>({});
  const palette = usePalette();

  const refreshOfflineState = useCallback(async (list: Course[]) => {
    const entries = await Promise.all(list.map(async (course) => {
      const videoOffline = course.videoUrl ? await downloadManager.getOfflineFile(course.videoUrl) : null;
      const pdfOffline = course.pdfUrl ? await downloadManager.getOfflineFile(course.pdfUrl) : null;
      return [course.id, Boolean(videoOffline || pdfOffline)] as const;
    }));
    setOfflineMap(Object.fromEntries(entries));
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchWithCache('courses', getCourses);
      const list = data ?? [];
      setCourses(list);
      await refreshOfflineState(list);
      setLoading(false);
    };
    load();
  }, [refreshOfflineState]);

  useFocusEffect(
    useCallback(() => {
      if (courses.length) {
        refreshOfflineState(courses);
      }
    }, [courses, refreshOfflineState])
  );

  const filteredCourses = courses.filter(course =>
    (course.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCourseCard = ({ item: course }: { item: Course }) => (
    <View style={[styles.card, {
      backgroundColor: palette.glassBg,
      borderColor: palette.border
    }]}>
      {/* Course Image/Placeholder */}
      <View style={[styles.imageContainer, { backgroundColor: palette.surface }]}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageEmoji}>📚</Text>
        </View>
      </View>

      {/* Course Info */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: palette.text }]} numberOfLines={2}>
          {course.title}
        </Text>

        {course.instructor && (
          <Text style={[styles.instructor, { color: palette.muted }]}>
            👨‍🏫 {course.instructor}
          </Text>
        )}

        {course.description && (
          <Text style={[styles.cardDescription, { color: palette.muted }]} numberOfLines={2}>
            {course.description}
          </Text>
        )}

        {offlineMap[course.id] && (
          <View style={[styles.offlineBadge, { borderColor: palette.border, backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
            <Text style={styles.offlineText}>📥 Çevrimdışı kullanılabilir</Text>
          </View>
        )}

        {/* Progress Bar */}
        {course.progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: palette.surface }]}>
              <View style={[styles.progressFill, { width: `${Math.round((course.progress ?? 0) * 100)}%` }]} />
            </View>
            <Text style={[styles.progressText, { color: palette.muted }]}>
              %{Math.round((course.progress ?? 0) * 100)} tamamlandı
            </Text>
          </View>
        )}

        <Link href={`/course/${course.id}` as any} asChild>
          <Pressable style={styles.viewButton}>
            <View style={styles.viewButtonGradient}>
              <Text style={styles.viewButtonText}>📖 Derse Git</Text>
            </View>
          </Pressable>
        </Link>
      </View>
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
          <Text style={[styles.title, { color: palette.text }]}>📚 Derslerim</Text>
        </View>

        {/* Search */}
        <View style={[styles.searchContainer, {
          backgroundColor: palette.surface,
          borderColor: palette.border
        }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Ders Ara..."
            placeholderTextColor={palette.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Course List */}
      <FlatList
        data={filteredCourses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourseCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: palette.muted }]}>
              Ders bulunamadı
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
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    height: 120,
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  imageEmoji: {
    fontSize: 40,
  },
  cardContent: {
    padding: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  instructor: {
    fontSize: 14,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#06b6d4',
  },
  progressText: {
    fontSize: 12,
  },
  offlineBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  offlineText: {
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 12,
  },
  viewButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  viewButtonGradient: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    borderRadius: 12,
  },
  viewButtonText: {
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
