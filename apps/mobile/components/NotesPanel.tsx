import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View as RNView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePalette } from '@/hooks/usePalette';

type Props = {
  itemId: string;
  placeholder: string;
};

export function NotesPanel({ itemId, placeholder }: Props) {
  const [note, setNote] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const palette = usePalette();

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(`note_${itemId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNote(parsed.text);
        setSavedAt(parsed.savedAt);
      }
    };
    load();
  }, [itemId]);

  const save = async () => {
    const payload = { text: note, savedAt: new Date().toISOString() };
    await AsyncStorage.setItem(`note_${itemId}`, JSON.stringify(payload));
    setSavedAt(payload.savedAt);
  };

  return (
    <RNView
      style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}
      accessible
      accessibilityLabel="Not alanı"
    >
      <Text style={[styles.title, { color: palette.text }]}>Notlar</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
        ]}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline
        value={note}
        onChangeText={setNote}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: palette.primary }]}
        onPress={save}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Kaydet</Text>
      </TouchableOpacity>
      {savedAt && (
        <Text style={[styles.caption, { color: palette.muted }]}>
          Son kaydedilme: {new Date(savedAt).toLocaleString()}
        </Text>
      )}
    </RNView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
  },
  title: {
    fontWeight: '700',
  },
  input: {
    minHeight: 80,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    borderWidth: 1,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
  },
});
