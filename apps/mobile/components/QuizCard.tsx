import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View as RNView, TextInput } from 'react-native';

import { View } from '@/components/Themed';
import { usePalette } from '@/hooks/usePalette';
import { Exam } from '@/services/api';

// Question types for rendering logic
enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
}

interface Props {
  exam: Exam;
  onExamComplete: (answers: Record<string, string | number>) => void;
  onClose: () => void;
}

export default function QuizCard({ exam, onExamComplete }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [timeLeft, setTimeLeft] = useState((exam.durationMinutes || 60) * 60);
  const [antiCheatStrikes, setAntiCheatStrikes] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const palette = usePalette();

  useEffect(() => {
    timer.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setAntiCheatStrikes((s) => s + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const formatted = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

  return (
    <View
      style={[styles.container, { backgroundColor: palette.card }]}
      accessibilityLabel="Sınav kartı"
      accessible
    >
      <RNView style={styles.header}>
        <Text style={[styles.title, { color: palette.text }]}>{exam.title}</Text>
        <RNView style={styles.badgeRow}>
          <RNView style={[styles.badge, { backgroundColor: palette.secondary }]}>
            <Text style={styles.badgeText}>{formatted}</Text>
          </RNView>
          <RNView style={[styles.badgeMuted, { backgroundColor: palette.surface }]}>
            <Text style={[styles.badgeTextMuted, { color: palette.muted }]}>
              Anti-cheat: {antiCheatStrikes} {Platform.OS === 'web' ? 'sekme' : 'uygulama'} değişimi
            </Text>
          </RNView>
        </RNView>
      </RNView>
      {exam.questions?.map((question, idx) => {
        // Handle Text Input Questions (Essay, Short Answer)
        if (question.type === QuestionType.SHORT_ANSWER || question.type === QuestionType.ESSAY) {
          return (
            <View key={question.id} style={styles.question}>
              <Text style={[styles.questionTitle, { color: palette.text }]}>
                {idx + 1}. {question.text}
              </Text>
              <TextInput
                style={{
                  backgroundColor: palette.surface,
                  color: palette.text,
                  borderColor: palette.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  minHeight: question.type === QuestionType.ESSAY ? 100 : 50,
                  textAlignVertical: 'top',
                  marginTop: 8
                }}
                multiline={question.type === QuestionType.ESSAY}
                placeholder="Cevabınızı buraya yazın..."
                placeholderTextColor={palette.muted}
                value={(answers[question.id] as string) || ''}
                onChangeText={(text) => setAnswers(prev => ({ ...prev, [question.id]: text }))}
              />
            </View>
          );
        }

        // Handle Choice Questions via mapping or fallback
        let options: string[] = [];
        if (Array.isArray(question.options)) {
          options = question.options.map(o => (typeof o === 'string' ? o : o.text || ''));
        } else if (question.type === QuestionType.TRUE_FALSE) {
          options = ['Doğru', 'Yanlış'];
        }

        if (options.length === 0 && question.type === QuestionType.MULTIPLE_CHOICE) {
          options = ['(Seçenekler yüklenemedi)'];
        }

        return (
          <View key={question.id} style={styles.question}>
            <Text style={[styles.questionTitle, { color: palette.text }]}>
              {idx + 1}. {question.text}
            </Text>
            <RNView style={styles.options}>
              {options.map((option, optionIdx) => {
                const selected = answers[question.id] === optionIdx;
                const optionLabel = option;

                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.option,
                      { backgroundColor: palette.surface, borderColor: palette.border },
                      selected && { backgroundColor: palette.primary, borderColor: palette.primary },
                    ]}
                    onPress={() =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: optionIdx, // Store index for choice questions
                      }))
                    }
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Soru ${idx + 1} seçeneği ${optionIdx + 1}`}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: palette.muted },
                        selected && { color: '#f8fafc', fontWeight: '700' },
                      ]}
                    >
                      {optionLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </RNView>
          </View>
        );
      })}
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#022c22',
    fontWeight: '800',
  },
  badgeMuted: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeTextMuted: {
  },
  question: {
    gap: 8,
  },
  questionTitle: {
    fontWeight: '700',
  },
  options: {
    gap: 8,
  },
  option: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionText: {
  },
});
