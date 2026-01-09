import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View as RNView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

import { View } from '@/components/Themed';
import { usePalette } from '@/hooks/usePalette';
import { previewOmrImage, processOmrImage, apiClient } from '@/services/api';

type Corner = { x: number; y: number };
type ScanResult = {
  id: string;
  correctedUri: string;
  corners: Corner[];
  bubbles: { question: string; selected: string; confidence?: number; status?: string; correctAnswer?: string }[];
  errors?: string[];
  score?: { correct: number; wrong: number; empty: number; total: number; percentage: number };
};

type AnchorKey = 'q1A' | 'q1E' | 'q53A';
type DetectionState = 'scanning' | 'detected' | 'align' | 'processing' | 'done' | 'error';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>('scanning');
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceImageUri, setSourceImageUri] = useState<string | null>(null);
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 1700, height: 2200 });
  const [autoAnchors, setAutoAnchors] = useState<Record<string, Corner>>({});
  const [anchors, setAnchors] = useState<Record<string, Corner>>({});
  const [activeAnchor, setActiveAnchor] = useState<AnchorKey>('q1A');
  const [warpLayout, setWarpLayout] = useState<{ width: number; height: number }>({ width: 1, height: 1 });
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCapturingRef = useRef(false);
  const palette = usePalette();

  const permissionDenied = useMemo(() => permission && permission.status !== 'granted', [permission]);

  // Start live detection when camera is ready
  const startLiveDetection = useCallback(() => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (
        isCapturingRef.current ||
        !cameraRef.current ||
        detectionState === 'processing' ||
        detectionState === 'done' ||
        detectionState === 'align'
      ) {
        return;
      }

      try {
        // Capture low-res frame for detection
        const photo = await cameraRef.current.takePictureAsync({
          base64: false,
          quality: 0.3,
          skipProcessing: true
        });

        // Resize for faster upload
        const resized = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 400 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Send to detect endpoint
        const form = new FormData();
        form.append('image', {
          uri: resized.uri,
          name: 'frame.jpg',
          type: 'image/jpeg',
        } as any);

        const response = await apiClient.post('/omr/detect', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 3000,
        });

        const detection = response.data;
        setDetectionConfidence(detection.confidence || 0);

        if (detection.detected && detection.confidence >= 0.6) {
          // Sheet detected with good confidence - auto capture!
          setDetectionState('detected');
          Vibration.vibrate(100);

          // Wait a moment then capture high-res
          setTimeout(() => {
            handleAutoCapture();
          }, 500);
        }
      } catch (error) {
        // Silent fail for frame detection
        console.log('Detection frame error:', error);
      }
    }, 800); // Check every 800ms
  }, [detectionState]);

  // Stop detection loop
  const stopLiveDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
  }, []);

  // Effect to manage detection lifecycle
  useEffect(() => {
    // DISABLED for simulator - only use gallery picker
    const isRealDevice = Constants.isDevice;
    if (permission?.granted && detectionState === 'scanning' && isRealDevice) {
      startLiveDetection();
    }
    return () => stopLiveDetection();
  }, [permission?.granted, detectionState, startLiveDetection, stopLiveDetection]);

  const normalizeAnchors = useCallback(
    (raw: any, size: { width: number; height: number }) => {
      const out: Record<string, Corner> = {};
      if (!raw || typeof raw !== 'object') return out;
      Object.entries(raw).forEach(([k, v]) => {
        const x = Array.isArray(v) ? v[0] : (v as any)?.x;
        const y = Array.isArray(v) ? v[1] : (v as any)?.y;
        if (typeof x !== 'number' || typeof y !== 'number') return;
        out[k] = { x: x / size.width, y: y / size.height };
      });
      return out;
    },
    [],
  );

  const beginAnchorAlign = useCallback(
    async (uri: string) => {
      setErrorMessage(null);
      setProcessing(true);
      try {
        stopLiveDetection();
        const preview = await previewOmrImage(uri);
        const rawSize = preview.pageSize;
        const nextSize =
          Array.isArray(rawSize) && rawSize.length === 2
            ? { width: rawSize[0], height: rawSize[1] }
            : (rawSize as any)?.width && (rawSize as any)?.height
              ? { width: (rawSize as any).width, height: (rawSize as any).height }
              : { width: 1700, height: 2200 };
        setPageSize(nextSize);
        setWarpedImage(preview.warpedImage ?? null);
        const nextAuto = normalizeAnchors(preview.anchors, nextSize);
        setAutoAnchors(nextAuto);
        setAnchors({});
        setActiveAnchor('q1A');
        setSourceImageUri(uri);
        setDetectionState('align');
      } catch (err: any) {
        setErrorMessage(err?.message ?? 'Önizleme alınamadı');
        setDetectionState('error');
      } finally {
        setProcessing(false);
      }
    },
    [normalizeAnchors, stopLiveDetection],
  );

  const runScanWithAnchors = useCallback(async () => {
    if (!sourceImageUri) return;
    if (!anchors.q1A || !anchors.q1E) {
      setErrorMessage('Lütfen önce Q1A ve Q1E noktalarını seçin.');
      return;
    }
    setDetectionState('processing');
    setProcessing(true);
    try {
      const apiResult = await processOmrImage(sourceImageUri, undefined, anchors);
      const acceptedStatuses = new Set([
        'OK',
        'OK_STAB_OVERRIDE',
        'FAINT_OK',
        'RESCUED',
        'NEAR_MISS_OK',
      ]);
      const bubbles = (apiResult.answers || []).map((a) => ({
        question: `Soru ${a.question}`,
        selected: a.answer && acceptedStatuses.has(a.status || '') ? a.answer : '-',
        confidence: a.confidence,
        status: a.status,
        correctAnswer: a.correctAnswer,
      }));

      setResult({
        id: `${Date.now()}`,
        correctedUri: apiResult.previewImage || warpedImage || sourceImageUri,
        corners: apiResult.corners || [],
        bubbles: bubbles.length ? bubbles : [],
        errors: apiResult.errors,
        score: apiResult.score,
      });

      setDetectionState('done');
      Vibration.vibrate([100, 50, 100]);
    } catch (err: any) {
      setErrorMessage(err?.message ?? 'İşleme hatası');
      setDetectionState('error');
    } finally {
      setProcessing(false);
      isCapturingRef.current = false;
    }
  }, [anchors, sourceImageUri, warpedImage]);

  // Auto-capture and process when sheet is detected
  const handleAutoCapture = async () => {
    if (isCapturingRef.current || !cameraRef.current) return;
    isCapturingRef.current = true;
    stopLiveDetection();
    setDetectionState('processing');

    try {
      // Take high-quality photo
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.9,
        skipProcessing: false
      });

      // Process with full OMR
      const corrected = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      await beginAnchorAlign(corrected.uri);
    } catch (error: any) {
      console.error('OMR processing error:', error);
      setErrorMessage(error.message || 'İşleme hatası');
      setDetectionState('error');
    } finally {
      isCapturingRef.current = false;
    }
  };

  // Manual capture button
  const handleManualCapture = async () => {
    if (detectionState === 'processing') return;
    setDetectionState('detected');
    setTimeout(() => handleAutoCapture(), 100);
  };

  // Pick from gallery (for demo/simulator)
  const handlePickFromGallery = async () => {
    if (detectionState === 'processing') return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const picked = result.assets[0];
      setDetectionState('processing');
      stopLiveDetection();
      isCapturingRef.current = true;

      // Process the picked image
      const corrected = await ImageManipulator.manipulateAsync(
        picked.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      await beginAnchorAlign(corrected.uri);
    } catch (error: any) {
      console.error('Gallery pick error:', error);
      setErrorMessage(error.message || 'Galeri hatası');
      setDetectionState('error');
    } finally {
      isCapturingRef.current = false;
    }
  };

  // Reset to scan again
  const handleReset = () => {
    setResult(null);
    setErrorMessage(null);
    setDetectionState('scanning');
    setDetectionConfidence(0);
    setSourceImageUri(null);
    setWarpedImage(null);
    setAutoAnchors({});
    setAnchors({});
    startLiveDetection();
  };

  // Export results
  const exportResults = async () => {
    if (!result) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      result,
    };
    const path = `${FileSystem.documentDirectory}scan-${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
    setExportPath(path);
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
        <Text style={[styles.title, { color: palette.text }]}>📷 Canlı Optik Okuyucu</Text>
        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.meta, { color: palette.muted }]}>
            Kamera web önizlemesinde kapalı. Lütfen iOS/Android simulator veya cihazda deneyin.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Detection state indicator
  const getStateInfo = () => {
    switch (detectionState) {
      case 'scanning':
        return { text: '🔍 Optik kağıdı kameraya gösterin...', color: palette.muted };
      case 'detected':
        return { text: '✅ Kağıt algılandı! Yakalanıyor...', color: '#22c55e' };
      case 'align':
        return { text: '🧭 Önizleme hazır. Anchor seçimi yapın.', color: palette.primary };
      case 'processing':
        return { text: '⏳ İşleniyor...', color: palette.primary };
      case 'done':
        return { text: '✓ Tamamlandı', color: '#22c55e' };
      case 'error':
        return { text: `❌ Hata: ${errorMessage}`, color: '#ef4444' };
      default:
        return { text: '', color: palette.muted };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.title, { color: palette.text }]}>📷 Canlı Optik Okuyucu</Text>

      {permissionDenied && (
        <Pressable
          style={[styles.warning, { backgroundColor: '#fbbf24' }]}
          onPress={requestPermission}
        >
          <Text style={styles.warningText}>Kamera izni gerekli - tekrar dene</Text>
        </Pressable>
      )}

      {/* Camera View with Detection Overlay */}
      <View style={[styles.cameraWrapper, { backgroundColor: palette.card }]}>
        <RNView style={styles.cameraContainer}>
          {detectionState !== 'align' ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              enableTorch={false}
              zoom={0}
            />
          ) : (
            <RNView style={[styles.camera, { backgroundColor: '#000', justifyContent: 'center' }]}>
              {processing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : warpedImage ? (
                <RNView
                  style={{ width: '100%', height: '100%', position: 'relative' }}
                  onLayout={(e) => {
                    setWarpLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
                  }}
                >
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={(e) => {
                      const { width, height } = warpLayout;
                      const pageW = pageSize.width || 1700;
                      const pageH = pageSize.height || 2200;
                      const scale = Math.min(width / pageW, height / pageH);
                      const contentW = pageW * scale;
                      const contentH = pageH * scale;
                      const ox = (width - contentW) / 2;
                      const oy = (height - contentH) / 2;
                      const x = (e.nativeEvent.locationX - ox) / contentW;
                      const y = (e.nativeEvent.locationY - oy) / contentH;
                      if (x < 0 || x > 1 || y < 0 || y > 1) return;
                      setAnchors((prev) => ({ ...prev, [activeAnchor]: { x, y } }));
                    }}
                  >
                    <Image
                      source={{ uri: warpedImage }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="contain"
                    />
                    {Object.entries(anchors).map(([k, p]) => {
                      const { width, height } = warpLayout;
                      const pageW = pageSize.width || 1700;
                      const pageH = pageSize.height || 2200;
                      const scale = Math.min(width / pageW, height / pageH);
                      const contentW = pageW * scale;
                      const contentH = pageH * scale;
                      const ox = (width - contentW) / 2;
                      const oy = (height - contentH) / 2;
                      const left = ox + p.x * contentW - 10;
                      const top = oy + p.y * contentH - 10;
                      return (
                        <RNView
                          key={k}
                          style={[
                            styles.anchorDot,
                            {
                              left,
                              top,
                              backgroundColor: '#f97316',
                              borderColor: '#fff',
                            },
                          ]}
                        >
                          <Text style={styles.anchorDotText}>{k.toUpperCase()}</Text>
                        </RNView>
                      );
                    })}
                  </Pressable>
                </RNView>
              ) : (
                <Text style={{ color: '#fff', textAlign: 'center' }}>Önizleme yok</Text>
              )}
            </RNView>
          )}

          {/* Detection overlay border */}
          {detectionState === 'detected' && (
            <RNView style={styles.detectedOverlay} />
          )}

          {/* Processing overlay */}
          {detectionState === 'processing' && (
            <RNView style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>İşleniyor...</Text>
            </RNView>
          )}

          {/* Confidence indicator */}
          {detectionState === 'scanning' && detectionConfidence > 0 && (
            <RNView style={[styles.confidenceBadge, { backgroundColor: detectionConfidence > 0.5 ? '#22c55e' : palette.surface }]}>
              <Text style={styles.confidenceText}>{Math.round(detectionConfidence * 100)}%</Text>
            </RNView>
          )}
        </RNView>

        {/* Status text */}
        <Text style={[styles.statusText, { color: stateInfo.color }]}>
          {stateInfo.text}
        </Text>

        {/* Manual capture button (fallback) */}
        {(detectionState === 'scanning' || detectionState === 'error') && (
          <Pressable
            style={[styles.captureButton, { backgroundColor: palette.secondary }]}
            onPress={handleManualCapture}
          >
            <Text style={styles.captureText}>📸 Manuel Çekim</Text>
          </Pressable>
        )}

        {/* Gallery picker button (for demo/simulator) */}
        {(detectionState === 'scanning' || detectionState === 'error') && (
          <Pressable
            style={[styles.captureButton, { backgroundColor: '#6366f1', marginTop: 8 }]}
            onPress={handlePickFromGallery}
          >
            <Text style={[styles.captureText, { color: '#fff' }]}>🖼️ Galeriden Seç (Demo)</Text>
          </Pressable>
        )}

        {/* Anchor selection controls */}
        {detectionState === 'align' && (
          <RNView style={{ gap: 8 }}>
            <RNView style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
              {(['q1A', 'q1E', 'q53A'] as const).map((k) => (
                <Pressable
                  key={k}
                  style={[
                    styles.anchorButton,
                    { backgroundColor: activeAnchor === k ? palette.primary : palette.surface },
                  ]}
                  onPress={() => setActiveAnchor(k)}
                >
                  <Text style={{ color: activeAnchor === k ? '#fff' : palette.text, fontWeight: '800' }}>
                    {k.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </RNView>
            <RNView style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={[styles.anchorButton, { flex: 1, backgroundColor: '#334155' }]}
                onPress={() => setAnchors(autoAnchors)}
              >
                <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Auto Doldur</Text>
              </Pressable>
              <Pressable
                style={[styles.anchorButton, { flex: 1, backgroundColor: '#0f172a' }]}
                onPress={() => setAnchors({})}
              >
                <Text style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>Sıfırla</Text>
              </Pressable>
            </RNView>
            <Pressable
              style={[
                styles.captureButton,
                { backgroundColor: anchors.q1A && anchors.q1E ? palette.primary : '#475569' },
              ]}
              onPress={runScanWithAnchors}
              disabled={!anchors.q1A || !anchors.q1E}
            >
              <Text style={[styles.captureText, { color: '#fff' }]}>✅ Oku</Text>
            </Pressable>
            <Pressable
              style={[styles.captureButton, { backgroundColor: '#ef4444' }]}
              onPress={handleReset}
            >
              <Text style={[styles.captureText, { color: '#fff' }]}>↩︎ İptal</Text>
            </Pressable>
          </RNView>
        )}

        {/* Reset button */}
        {(detectionState === 'done' || detectionState === 'error') && (
          <Pressable
            style={[styles.captureButton, { backgroundColor: palette.primary }]}
            onPress={handleReset}
          >
            <Text style={[styles.captureText, { color: '#fff' }]}>🔄 Yeni Tarama</Text>
          </Pressable>
        )}
      </View>

      {/* Results Section */}
      {result && (
        <View style={[styles.section, { backgroundColor: palette.card }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>📊 Sonuçlar</Text>

          {result.score && (
            <RNView style={[styles.scoreCard, { backgroundColor: result.score.percentage >= 50 ? '#166534' : '#991b1b' }]}>
              <Text style={styles.scoreText}>
                Puan: {result.score.percentage}% ({result.score.correct}/{result.score.total})
              </Text>
              <Text style={styles.scoreDetail}>
                ✓ {result.score.correct} Doğru | ✗ {result.score.wrong} Yanlış | - {result.score.empty} Boş
              </Text>
            </RNView>
          )}

          <Image source={{ uri: result.correctedUri }} style={styles.resultImage} />

          {result.errors && result.errors.length > 0 && (
            <Text style={[styles.meta, { color: '#f97316' }]}>⚠️ {result.errors.join(', ')}</Text>
          )}

          <Text style={[styles.meta, { color: palette.muted, marginTop: 8 }]}>Cevaplar:</Text>
          {result.bubbles.slice(0, 20).map((bubble) => (
            <RNView key={bubble.question} style={styles.bubbleRow}>
              <Text style={[styles.bubbleLine, { color: palette.text }]}>
                {bubble.question}: <Text style={{ fontWeight: '700' }}>{bubble.selected}</Text>
              </Text>
              {bubble.correctAnswer && (
                <Text style={{ color: bubble.selected === bubble.correctAnswer ? '#22c55e' : '#ef4444' }}>
                  {bubble.selected === bubble.correctAnswer ? ' ✓' : ` (Doğru: ${bubble.correctAnswer})`}
                </Text>
              )}
            </RNView>
          ))}
          {result.bubbles.length > 20 && (
            <Text style={{ color: palette.muted }}>... ve {result.bubbles.length - 20} soru daha</Text>
          )}

          <RNView style={styles.row}>
            <Pressable
              style={[styles.primary, { backgroundColor: palette.primary }]}
              onPress={exportResults}
            >
              <Text style={styles.primaryText}>📁 JSON Export</Text>
            </Pressable>
            {exportPath && <Text style={[styles.meta, { color: palette.muted }]}>✓ Kaydedildi</Text>}
          </RNView>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  warning: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  warningText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  cameraWrapper: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  cameraContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  camera: {
    width: '100%',
    height: 320,
  },
  detectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    borderColor: '#22c55e',
    borderRadius: 12,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  processingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  confidenceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  captureText: {
    fontWeight: '800',
    fontSize: 16,
  },
  section: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  scoreCard: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  scoreDetail: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  anchorDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorDotText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',
  },
  anchorButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleLine: {
    fontSize: 14,
  },
  meta: {
    fontSize: 13,
  },
  row: {
    gap: 8,
    marginTop: 8,
  },
  primary: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
