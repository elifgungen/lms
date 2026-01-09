import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

export function usePalette() {
  const scheme = useColorScheme();
  return useMemo(
    () => ({
      // Backgrounds - matching web globals.css
      background: scheme === 'dark' ? '#0b1224' : '#f8f5ff',
      card: scheme === 'dark' ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.88)',
      surface: scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.72)',

      // Text colors
      text: scheme === 'dark' ? '#f8fafc' : '#0a0a0f',
      muted: scheme === 'dark' ? '#9ca3af' : '#6b7280',

      // Accent colors - matching web cyan theme
      primary: '#06b6d4', // cyan-500
      primaryDark: '#0891b2', // cyan-600
      secondary: '#a855f7', // purple-500
      accent: '#22c55e', // green-500

      // Status colors
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#22c55e',

      // Borders
      border: scheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',

      // Glass effect colors
      glassBg: scheme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.72)',
      glassGlow: scheme === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)',
    }),
    [scheme],
  );
}
