import React, { useState, useEffect, useRef } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';

import { usePalette } from '@/hooks/usePalette';
import { getExamById, getExamQuestions, submitExamAttempt, Exam } from '@/services/api';
import { Question } from '@lms/core';

interface DisplayQuestion {
    id: string;
    text: string;
    options: string[];
}

export default function ExamScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const palette = usePalette();

    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);
    const [blurCount, setBlurCount] = useState(0);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        loadExam();
        ScreenCapture.preventScreenCaptureAsync().catch(() => {});
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        };
    }, [id]);

    // Anti-cheat: Detect app going to background
    useEffect(() => {
        const handleAppState = (nextState: AppStateStatus) => {
            if (nextState === 'background' && !submitted) {
                setBlurCount((c) => c + 1);
                Alert.alert('⚠️ Uyarı', 'Uygulamadan ayrıldınız. Bu davranış kaydedildi.');
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, [submitted]);

    // Timer
    useEffect(() => {
        if (timeLeft > 0 && !submitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft((t) => {
                    if (t <= 1) {
                        handleSubmit();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [timeLeft, submitted]);

    const loadExam = async () => {
        setLoading(true);
        try {
            const examData = await getExamById(id || '');
            if (examData) {
                setExam(examData);
                setTimeLeft(examData.durationMinutes ? examData.durationMinutes * 60 : 2700);

                // Fetch questions from separate endpoint
                const questionsData = await getExamQuestions(id || '');
                const mappedQuestions: DisplayQuestion[] = questionsData.map((q: Question) => ({
                    id: q.id,
                    text: q.prompt || q.text || '',
                    options: Array.isArray(q.options)
                        ? q.options.map((opt: any) => typeof opt === 'string' ? opt : opt.text || String(opt))
                        : []
                }));
                setQuestions(mappedQuestions);
            }
        } catch (error) {
            console.error('Failed to load exam:', error);
        }
        setLoading(false);
    };

    const selectAnswer = (questionId: string, optionIndex: number) => {
        if (submitted) return;
        setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    };

    const handleSubmit = async () => {
        if (submitted) return;
        setSubmitted(true);
        if (timerRef.current) clearInterval(timerRef.current);

        const res = await submitExamAttempt(id || '', answers);
        setResult(res);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: palette.background }]}>
                <ActivityIndicator size="large" color={palette.primary} />
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={[styles.centered, { backgroundColor: palette.background }]}>
                <Text style={{ color: palette.text }}>Sınav bulunamadı</Text>
            </View>
        );
    }

    // Result screen
    if (submitted && result) {
        const percent = Math.round((result.score / result.total) * 100);
        const passed = percent >= 60;

        return (
            <>
                <Stack.Screen options={{ title: 'Sonuç' }} />
                <View style={[styles.resultContainer, { backgroundColor: palette.background }]}>
                    <View style={[styles.resultCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <Text style={[styles.resultEmoji]}>{passed ? '🎉' : '😔'}</Text>
                        <Text style={[styles.resultTitle, { color: palette.text }]}>
                            {passed ? 'Tebrikler!' : 'Tekrar Deneyin'}
                        </Text>
                        <Text style={[styles.resultScore, { color: passed ? '#22c55e' : '#ef4444' }]}>
                            {result.score} / {result.total}
                        </Text>
                        <Text style={[styles.resultPercent, { color: palette.muted }]}>%{percent}</Text>
                        {blurCount > 0 && (
                            <Text style={[styles.warning, { color: '#f59e0b' }]}>
                                ⚠️ Sınav sırasında {blurCount} kez uygulamadan ayrıldınız.
                            </Text>
                        )}
                        <Pressable
                            style={[styles.backButton, { backgroundColor: palette.primary }]}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                        >
                            <Text style={styles.backButtonText}>Geri Dön</Text>
                        </Pressable>
                    </View>
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen options={{ title: exam.title }} />
            <View style={[styles.container, { backgroundColor: palette.background }]}>
                {/* Timer Bar */}
                <View style={[styles.timerBar, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
                    <Text style={[styles.timerLabel, { color: palette.muted }]}>Kalan Süre</Text>
                    <Text style={[styles.timer, { color: timeLeft < 60 ? '#ef4444' : palette.text }]}>
                        {formatTime(timeLeft)}
                    </Text>
                    <Text style={[styles.progress, { color: palette.muted }]}>
                        {Object.keys(answers).length} / {questions.length} cevaplandı
                    </Text>
                </View>

                <ScrollView style={styles.questions} contentContainerStyle={{ padding: 16 }}>
                    {questions.map((q, qIdx) => (
                        <View key={q.id} style={[styles.questionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                            <Text style={[styles.questionNumber, { color: palette.muted }]}>Soru {qIdx + 1}</Text>
                            <Text style={[styles.questionText, { color: palette.text }]}>{q.text}</Text>
                            <View style={styles.options}>
                                {q.options.map((opt: string, optIdx: number) => {
                                    const selected = answers[q.id] === optIdx;
                                    return (
                                        <Pressable
                                            key={optIdx}
                                            style={[
                                                styles.option,
                                                { borderColor: selected ? palette.primary : palette.border },
                                                selected && { backgroundColor: palette.primary + '15' },
                                            ]}
                                            onPress={() => selectAnswer(q.id, optIdx)}
                                            accessibilityRole="radio"
                                            accessibilityState={{ checked: selected }}
                                        >
                                            <View style={[styles.radio, { borderColor: selected ? palette.primary : palette.border }]}>
                                                {selected && <View style={[styles.radioInner, { backgroundColor: palette.primary }]} />}
                                            </View>
                                            <Text style={[styles.optionText, { color: palette.text }]}>{opt}</Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Submit Button */}
                <View style={[styles.footer, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
                    <Pressable
                        style={[styles.submitButton, { backgroundColor: palette.primary }]}
                        onPress={() => {
                            Alert.alert('Sınavı Bitir', 'Cevaplarınızı göndermek istediğinize emin misiniz?', [
                                { text: 'İptal', style: 'cancel' },
                                { text: 'Gönder', onPress: handleSubmit },
                            ]);
                        }}
                        accessibilityRole="button"
                    >
                        <Text style={styles.submitText}>Sınavı Bitir</Text>
                    </Pressable>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    timerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1 },
    timerLabel: { fontSize: 12 },
    timer: { fontSize: 24, fontWeight: '700' },
    progress: { fontSize: 12 },
    questions: { flex: 1 },
    questionCard: { marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
    questionNumber: { fontSize: 12, marginBottom: 4 },
    questionText: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
    options: { gap: 10 },
    option: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1 },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    optionText: { flex: 1, fontSize: 14 },
    footer: { padding: 16, borderTopWidth: 1 },
    submitButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    resultCard: { width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    resultEmoji: { fontSize: 64, marginBottom: 16 },
    resultTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
    resultScore: { fontSize: 48, fontWeight: '800' },
    resultPercent: { fontSize: 18, marginTop: 4 },
    warning: { marginTop: 16, textAlign: 'center' },
    backButton: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
    backButtonText: { color: '#fff', fontWeight: '600' },
});
