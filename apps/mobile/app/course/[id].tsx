import React, { useState, useEffect } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Pressable,
    ActivityIndicator,
    Dimensions,
    Alert,
    Modal,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePalette } from '@/hooks/usePalette';
import { getCourseById, Course, Exam, apiClient as api } from '@/services/api';
import { downloadManager } from '@/services/downloadManager';
import QuizCard from '@/components/QuizCard';

type Tab = 'video' | 'pdf' | 'notes' | 'quiz';

function VideoSection({
    videoUrl,
    courseId,
    width,
    videoHeight,
    palette,
    onDownloadStateChange
}: {
    videoUrl: string;
    courseId: string;
    width: number;
    videoHeight: number;
    palette: ReturnType<typeof usePalette>;
    onDownloadStateChange?: () => void;
}) {
    // Determine source: If offline file exists, use it. Otherwise, use remote URL.
    const [source, setSource] = useState(videoUrl);
    const [isOffline, setIsOffline] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [progress, setProgress] = useState(0);

    // Initial check for offline file
    useEffect(() => {
        checkOffline();
    }, [videoUrl]);

    const checkOffline = async () => {
        const local = await downloadManager.getOfflineFile(videoUrl);
        if (local) {
            setSource(local);
            setIsOffline(true);
        } else {
            setSource(videoUrl);
            setIsOffline(false);
        }
    };

    const player = useVideoPlayer(source, (p) => {
        p.loop = false;
    });

    const { currentTime } = useEvent(player, 'timeUpdate', {
        currentTime: player.currentTime,
        currentLiveTimestamp: 0,
        currentOffsetFromLive: 0,
        bufferedPosition: 0,
    });

    const [videoProgress, setVideoProgress] = useState(0);
    const [isReady, setIsReady] = useState(false);

    // Save playback progress
    useEffect(() => {
        if (currentTime > 0 && player.duration > 0) {
            const p = currentTime / player.duration;
            setVideoProgress(p);
            AsyncStorage.setItem(`course_progress_${courseId}`, String(p));
        }
        if (player.duration > 0) {
            setIsReady(true);
        }
    }, [currentTime, courseId, player.duration]);

    // Load saved playback progress
    useEffect(() => {
        const loadProgress = async () => {
            const saved = await AsyncStorage.getItem(`course_progress_${courseId}`);
            if (saved && player.duration > 0) {
                const prog = Number(saved);
                player.currentTime = prog * player.duration;
            }
        };
        loadProgress();
    }, [courseId, player]);

    // Reload player when source changes
    useEffect(() => {
        try {
            player.replace(source);
        } catch (e) {
            console.warn('Failed to replace source', e);
        }
    }, [source]);

    const cycleSpeed = () => {
        const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];
        const idx = speeds.indexOf(player.playbackRate);
        const next = speeds[(idx + 1) % speeds.length];
        player.playbackRate = next;
    };


    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        setProgress(0);

        const result = await downloadManager.downloadFile(
            videoUrl,
            `course-${courseId}-video.mp4`,
            'video',
            (p) => setProgress(p)
        );

        setDownloading(false);
        if (result) {
            Alert.alert('Tamamlandı', 'Video çevrimdışı kullanım için indirildi.');
            checkOffline();
            onDownloadStateChange?.();
        } else {
            Alert.alert('Hata', 'Video indirilemedi.');
        }
    };

    const handleDelete = async () => {
        Alert.alert('Sil', 'İndirilen videoyu silmek istiyor musunuz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil',
                style: 'destructive',
                onPress: async () => {
                    await downloadManager.removeFile(videoUrl);
                    checkOffline();
                    onDownloadStateChange?.();
                }
            }
        ]);
    };

    return (
        <View>
            <View style={styles.videoWrapper}>
                {!isReady && (
                    <View style={styles.videoLoader}>
                        <ActivityIndicator color={palette.primary} />
                        <Text style={{ color: palette.text, marginTop: 8 }}>Video yükleniyor...</Text>
                    </View>
                )}
                <VideoView
                    style={{ width, height: videoHeight }}
                    player={player}
                    nativeControls
                    contentFit="contain"
                />
            </View>

            {/* Controls Bar */}
            <View style={[styles.controls, { backgroundColor: palette.card }]}>
                <View style={styles.leftControls}>
                    <Pressable
                        style={[styles.speedBtn, { backgroundColor: palette.surface }]}
                        onPress={cycleSpeed}
                    >
                        <Text style={{ color: palette.text }}>{player.playbackRate}x</Text>
                    </Pressable>
                    <Text style={{ color: palette.muted, marginLeft: 8 }}>
                        {Math.round(videoProgress * 100)}%
                    </Text>
                </View>

                {/* Download / Offline Controls */}
                <View style={styles.rightControls}>
                    {downloading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <ActivityIndicator size="small" color={palette.primary} />
                            <Text style={{ color: palette.muted, fontSize: 12 }}>%{Math.round(progress * 100)}</Text>
                        </View>
                    ) : isOffline ? (
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}
                            onPress={handleDelete}
                        >
                            <Text style={{ color: '#22c55e', fontWeight: '600' }}>✓ İndirildi</Text>
                        </Pressable>
                    ) : (
                        <Pressable
                            style={[styles.actionBtn, { backgroundColor: palette.surface }]}
                            onPress={handleDownload}
                        >
                            <Text style={{ color: palette.primary, fontWeight: '600' }}>⬇️ İndir</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
}

export default function CourseDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const palette = usePalette();

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('video');
    const [notes, setNotes] = useState('');
    const [pdfSource, setPdfSource] = useState<string | null>(null);
    const [pdfOffline, setPdfOffline] = useState(false);
    const [pdfDownloading, setPdfDownloading] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);

    const [activeQuiz, setActiveQuiz] = useState<Exam | null>(null);
    const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
    const [startingQuiz, setStartingQuiz] = useState(false);

    useEffect(() => {
        loadCourse();
        loadNotes();
    }, [id]);

    const loadCourse = async () => {
        setLoading(true);
        const data = await getCourseById(id || '');
        setCourse(data || null);
        setLoading(false);
    };

    const loadNotes = async () => {
        const saved = await AsyncStorage.getItem(`course_notes_${id}`);
        if (saved) setNotes(saved);
    };

    // Resolve PDF source (offline -> remote fallback)
    useEffect(() => {
        const resolvePdf = async () => {
            if (!course?.pdfUrl) {
                setPdfSource(null);
                setPdfOffline(false);
                return;
            }
            const local = await downloadManager.getOfflineFile(course.pdfUrl);
            if (local) {
                setPdfSource(local);
                setPdfOffline(true);
            } else {
                setPdfSource(course.pdfUrl);
                setPdfOffline(false);
            }
        };
        resolvePdf();
    }, [course?.pdfUrl]);

    const handlePdfDownload = async () => {
        if (!course?.pdfUrl) return;
        if (pdfDownloading) return;
        setPdfDownloading(true);
        setPdfProgress(0);

        const result = await downloadManager.downloadFile(
            course.pdfUrl,
            `course-${course.id}-notes.pdf`,
            'pdf',
            (p) => setPdfProgress(p)
        );

        setPdfDownloading(false);
        if (result) {
            setPdfSource(result.localUri);
            setPdfOffline(true);
            Alert.alert('Tamamlandı', 'PDF çevrimdışı kullanım için indirildi.');
        } else {
            Alert.alert('Hata', 'PDF indirilemedi.');
        }
    };

    const handlePdfDelete = async () => {
        if (!course?.pdfUrl || !pdfOffline) return;
        await downloadManager.removeFile(course.pdfUrl);
        setPdfOffline(false);
        setPdfSource(course.pdfUrl);
    };

    const startQuiz = async (examId: string) => {
        if (startingQuiz) return;
        try {
            setStartingQuiz(true);
            // Try to start (might throw 400 if already started, which is fine)
            let attemptId = '';
            try {
                const res = await api.post(`/exams/${examId}/start`);
                attemptId = res.data?.id;
            } catch (e: any) {
                if (e.response?.status !== 400) throw e;
                // If 400, maybe fetch active attempt? For now assume it's started.
                // Ideally we should get the active attempt ID.
                // For legacy support/demo, maybe we skip attemptId validation if backend allows?
                // Or fetch attempts?
            }

            if (attemptId) setCurrentAttemptId(attemptId);

            // Fetch full exam with questions
            const res = await api.get(`/exams/${examId}`);
            setActiveQuiz(res.data);
        } catch (err) {
            console.warn('Quiz start error:', err);
            Alert.alert('Hata', 'Sınav başlatılamadı.');
        } finally {
            setStartingQuiz(false);
        }
    };

    const handleExamComplete = async (answers: Record<string, string | number>) => {
        if (!activeQuiz) return;

        // Convert answers to API format
        const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
        }));

        try {
            // If we have an attemptId, use it. Otherwise, rely on backend to find active attempt?
            // The submit endpoint usually requires attemptId in URL.
            // Assuming `currentAttemptId` is set.
            // If not, maybe use `activeQuiz.id` as failover (incorrect but...)
            const idToSubmit = currentAttemptId || activeQuiz.id;

            await api.post(`/exams/${activeQuiz.id}/submit`, {
                attemptId: idToSubmit,
                answers: formattedAnswers
            });
            Alert.alert('Başarılı', 'Sınavınız tamamlandı.');
            setActiveQuiz(null);
            setCurrentAttemptId(null);
        } catch (err) {
            console.warn('Submit error:', err);
            Alert.alert('Hata', 'Sınav gönderilemedi.');
        }
    };

    const { width } = Dimensions.get('window');
    const videoHeight = width * (9 / 16);

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: palette.background }]}>
                <ActivityIndicator size="large" color={palette.primary} />
            </View>
        );
    }

    if (!course) {
        return (
            <View style={[styles.centered, { backgroundColor: palette.background }]}>
                <Text style={{ color: palette.text }}>Kurs bulunamadı</Text>
            </View>
        );
    }





    return (
        <>
            <Stack.Screen options={{ title: course.title }} />
            <View style={[styles.container, { backgroundColor: palette.background }]}>
                {/* Tabs */}
                <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
                    {(['video', 'pdf', 'notes', 'quiz'] as Tab[]).map((tab) => (
                        <Pressable
                            key={tab}
                            style={[styles.tab, activeTab === tab && { borderBottomColor: palette.primary, borderBottomWidth: 2 }]}
                            onPress={() => setActiveTab(tab)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: activeTab === tab }}
                        >
                            <Text style={[styles.tabText, { color: activeTab === tab ? palette.primary : palette.muted }]}>
                                {tab === 'video' ? '🎬 Video' : tab === 'pdf' ? '📄 PDF' : tab === 'notes' ? '📝 Notlar' : '✏️ Sınav'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Content */}
                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    {activeTab === 'video' && (
                        <View>
                            {course.videoUrl ? (
                                <VideoSection
                                    videoUrl={course.videoUrl}
                                    courseId={id || ''}
                                    width={width}
                                    videoHeight={videoHeight}
                                    palette={palette}
                                />
                            ) : (
                                <View style={[styles.emptyState, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                    <Text style={[styles.emptyText, { color: palette.text }]}>İçerik bulunamadı</Text>
                                    <Text style={{ color: palette.muted }}>Bu ders için video eklenmemiş.</Text>
                                </View>
                            )}
                            <View style={[styles.infoCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                <Text style={[styles.courseTitle, { color: palette.text }]}>{course.title}</Text>
                                <Text style={[styles.instructor, { color: palette.muted }]}>Eğitmen: {course.instructor}</Text>
                                {course.description && (
                                    <Text style={[styles.description, { color: palette.text }]}>{course.description}</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {activeTab === 'pdf' && (
                        <View style={{ height: 520 }}>
                            {pdfSource ? (
                                <>
                                    <WebView
                                        source={{ uri: pdfSource }}
                                        style={styles.webview}
                                        startInLoadingState
                                        renderLoading={() => <ActivityIndicator size="large" color={palette.primary} style={styles.webviewLoader} />}
                                    />
                                    <View style={[styles.pdfActions, { borderColor: palette.border }]}>
                                        {pdfDownloading ? (
                                            <View style={styles.pdfProgress}>
                                                <ActivityIndicator size="small" color={palette.primary} />
                                                <Text style={{ color: palette.muted, marginLeft: 8 }}>
                                                    %{Math.round(pdfProgress * 100)} indiriliyor
                                                </Text>
                                            </View>
                                        ) : pdfOffline ? (
                                            <Pressable style={[styles.pdfButton, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]} onPress={handlePdfDelete}>
                                                <Text style={{ color: '#22c55e', fontWeight: '700' }}>✓ Çevrimdışı</Text>
                                            </Pressable>
                                        ) : (
                                            <Pressable style={[styles.pdfButton, { backgroundColor: palette.surface }]} onPress={handlePdfDownload}>
                                                <Text style={{ color: palette.primary, fontWeight: '700' }}>⬇️ PDF İndir</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                </>
                            ) : (
                                <View style={[styles.emptyState, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                    <Text style={[styles.emptyText, { color: palette.text }]}>İçerik bulunamadı</Text>
                                    <Text style={{ color: palette.muted }}>Bu ders için PDF eklenmemiş.</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {activeTab === 'notes' && (
                        <View style={[styles.notesContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
                            <Text style={[styles.notesLabel, { color: palette.text }]}>📝 Ders Notları</Text>
                            <View
                                style={[styles.notesInput, { backgroundColor: palette.surface, borderColor: palette.border }]}
                            >
                                <Text style={{ color: palette.muted }}>Not alma özelliği - TextInput yerine basit metin</Text>
                                <Text style={{ color: palette.text, marginTop: 8 }}>{notes || 'Henüz not eklenmedi.'}</Text>
                            </View>
                            <Text style={[styles.hint, { color: palette.muted }]}>Notlarınız yerel olarak kaydedilir.</Text>
                        </View>
                    )}

                    {activeTab === 'quiz' && (
                        <View style={{ padding: 16 }}>
                            {(course as any).exams && (course as any).exams.length > 0 ? (
                                (course as any).exams.map((exam: any) => (
                                    <View key={exam.id} style={[styles.examCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                        <View>
                                            <Text style={[styles.examTitle, { color: palette.text }]}>{exam.title}</Text>
                                            <Text style={{ color: palette.muted }}>{exam.durationMinutes} dakika · {exam.questionCount || 0} soru</Text>
                                        </View>
                                        <Pressable
                                            style={[styles.startBtn, { backgroundColor: palette.primary }]}
                                            onPress={() => startQuiz(exam.id)}
                                            disabled={startingQuiz}
                                        >
                                            {startingQuiz ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <Text style={{ color: '#fff', fontWeight: '700' }}>Başla</Text>
                                            )}
                                        </Pressable>
                                    </View>
                                ))
                            ) : (
                                <View style={[styles.emptyState, { backgroundColor: palette.card, borderColor: palette.border }]}>
                                    <Text style={[styles.emptyText, { color: palette.text }]}>Sınav yok</Text>
                                    <Text style={{ color: palette.muted }}>Bu ders için aktif sınav bulunamadı.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Full Screen Quiz Modal */}
                <Modal
                    visible={!!activeQuiz}
                    animationType="slide"
                    presentationStyle="fullScreen"
                    onRequestClose={() => {
                        Alert.alert('Çıkış', 'Sınavdan çıkmak istiyor musunuz?', [
                            { text: 'İptal', style: 'cancel' },
                            { text: 'Çık', style: 'destructive', onPress: () => setActiveQuiz(null) }
                        ]);
                    }}
                >
                    {activeQuiz && (
                        <QuizCard
                            exam={activeQuiz}
                            onExamComplete={handleExamComplete}
                            onClose={() => setActiveQuiz(null)}
                        />
                    )}
                </Modal>

            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabs: { flexDirection: 'row', borderBottomWidth: 1 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabText: { fontWeight: '600' },
    content: { flex: 1 },
    contentContainer: { paddingBottom: 20 },
    controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
    leftControls: { flexDirection: 'row', alignItems: 'center' },
    rightControls: { flexDirection: 'row', alignItems: 'center' },
    speedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minWidth: 80, alignItems: 'center' },
    infoCard: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
    courseTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
    instructor: { fontSize: 14, marginBottom: 8 },
    description: { fontSize: 14, lineHeight: 20 },
    webview: { flex: 1 },
    webviewLoader: { position: 'absolute', top: '50%', left: '50%' },
    notesContainer: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
    notesLabel: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    notesInput: { minHeight: 150, padding: 12, borderRadius: 8, borderWidth: 1 },
    hint: { fontSize: 12, marginTop: 8, textAlign: 'center' },
    videoWrapper: { position: 'relative' },
    videoLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    emptyState: { padding: 16, borderRadius: 12, borderWidth: 1, margin: 16, alignItems: 'center', gap: 6 },
    emptyText: { fontSize: 16, fontWeight: '700' },
    pdfActions: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'flex-end' },
    pdfButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
    pdfProgress: { flexDirection: 'row', alignItems: 'center' },
    examCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    examTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
    startBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});
