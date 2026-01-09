import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { WebView } from 'react-native-webview';

import { View } from '@/components/Themed';
import { usePalette } from '@/hooks/usePalette';

type Props = {
  uri: string;
  localPath?: string | null;
};

export function PdfViewer({ uri, localPath }: Props) {
  const source = localPath ? { uri: localPath } : { uri };
  const palette = usePalette();
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: palette.card }]} accessibilityLabel="PDF görüntüleyici">
        <Text style={[styles.title, { color: palette.text }]}>PDF</Text>
        <Text style={{ color: palette.muted }}>Web önizlemede PDF desteklenmiyor.</Text>
      </View>
    );
  }
  return (
    <View
      style={[styles.container, { backgroundColor: palette.card }]}
      accessibilityLabel="PDF görüntüleyici"
    >
      <Text style={[styles.title, { color: palette.text }]}>PDF</Text>
      <WebView
        source={source}
        allowFileAccess
        startInLoadingState
        style={[styles.webView, { backgroundColor: palette.surface }]}
        androidForceDarkOn
        setSupportMultipleWindows={false}
        scalesPageToFit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 10,
    height: 320,
  },
  title: {
    marginBottom: 6,
    fontWeight: '700',
  },
  webView: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
