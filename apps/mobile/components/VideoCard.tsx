import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View as RNView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';

import { usePalette } from '@/hooks/usePalette';

type Props = {
  source: string;
  id: string;
  title: string;
};

export function VideoCard({ source, id, title }: Props) {
  const palette = usePalette();

  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });

  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: 0,
    currentOffsetFromLive: 0,
    bufferedPosition: 0,
  });

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Save progress when time updates
  useEffect(() => {
    if (currentTime > 0) {
      AsyncStorage.setItem(`video_progress_${id}`, (currentTime * 1000).toString());
    }
  }, [currentTime, id]);

  // Load saved progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      const stored = await AsyncStorage.getItem(`video_progress_${id}`);
      if (stored) {
        const positionMs = Number(stored);
        player.currentTime = positionMs / 1000;
      }
    };
    loadProgress();
  }, [id, player]);

  const cycleRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIdx = rates.indexOf(player.playbackRate);
    const nextIdx = (currentIdx + 1) % rates.length;
    player.playbackRate = rates[nextIdx];
  };

  return (
    <RNView
      style={[styles.container, { backgroundColor: palette.card }]}
      accessible
      accessibilityLabel={`${title} video oynatıcı`}
    >
      <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
      <VideoView
        style={[styles.video, { backgroundColor: palette.surface }]}
        player={player}
        nativeControls
        contentFit="contain"
      />
      <RNView style={styles.controls}>
        <Text style={[styles.caption, { color: palette.muted }]}>
          {formatTime(currentTime)}
        </Text>
        <TouchableOpacity
          onPress={cycleRate}
          style={[styles.badge, { backgroundColor: palette.primary }]}
          accessibilityRole="button"
        >
          <Text style={styles.badgeText}>{player.playbackRate}x</Text>
        </TouchableOpacity>
      </RNView>
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
  },
  video: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caption: {},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '600',
  },
});
