import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';

import { usePalette } from '@/hooks/usePalette';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
    const { t } = useTranslation();
    const palette = usePalette();
    const { signIn, biometricLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasBiometrics, setHasBiometrics] = useState(false);

    React.useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                const compatible = await LocalAuthentication.hasHardwareAsync();
                const enrolled = await LocalAuthentication.isEnrolledAsync();
                setHasBiometrics(compatible && enrolled);
            }
        })();
    }, []);

    const handleBiometricLogin = async () => {
        const success = await biometricLogin();
        if (success) {
            router.replace('/(tabs)');
        } else {
            setError('Biyometrik giriş başarısız veya kayıtlı oturum yok.');
        }
    };

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Email ve şifre gerekli');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const success = await signIn(email, password);
            if (success) {
                router.replace('/(tabs)');
            } else {
                setError('Geçersiz email veya şifre');
            }
        } catch (err) {
            console.error('[Login] Error:', err);
            setError('Giriş başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.background }]}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Card with glassmorphism effect */}
                    <View style={[styles.card, {
                        backgroundColor: palette.glassBg,
                        borderColor: palette.border
                    }]}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={[styles.title, { color: palette.text }]}>
                                LMS Mobile
                            </Text>
                            <Text style={[styles.subtitle, { color: palette.muted }]}>
                                Öğrenme Yönetim Sistemi
                            </Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.muted }]}>
                                    Kullanıcı Adı
                                </Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: palette.surface,
                                        borderColor: palette.border,
                                        color: palette.text
                                    }]}
                                    placeholder="Kullanıcı Adınızı giriniz"
                                    placeholderTextColor={palette.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: palette.muted }]}>
                                    Şifre
                                </Text>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: palette.surface,
                                        borderColor: palette.border,
                                        color: palette.text
                                    }]}
                                    placeholder="Şifrenizi giriniz"
                                    placeholderTextColor={palette.muted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoComplete="password"
                                />
                            </View>

                            {/* Error Message */}
                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            {/* Login Button */}
                            <Pressable
                                onPress={handleLogin}
                                disabled={loading}
                                style={({ pressed }) => [
                                    styles.button,
                                    pressed && styles.buttonPressed,
                                    loading && styles.buttonDisabled
                                ]}
                            >
                                <View style={styles.buttonGradient}>
                                    {loading ? (
                                        <ActivityIndicator color="#0f172a" size="small" />
                                    ) : (
                                        <Text style={styles.buttonText}>Giriş Yap</Text>
                                    )}
                                </View>
                            </Pressable>

                            {/* Biometric Login Button */}
                            {hasBiometrics && (
                                <Pressable
                                    onPress={handleBiometricLogin}
                                    style={({ pressed }) => [
                                        styles.biometricButton,
                                        pressed && styles.buttonPressed,
                                        { borderColor: palette.primary }
                                    ]}
                                >
                                    <Ionicons name="finger-print" size={20} color={palette.primary} />
                                    <Text style={[styles.biometricText, { color: palette.primary }]}>
                                        Biyometrik Giriş ile Devam Et
                                    </Text>
                                </Pressable>
                            )}

                            {/* Divider */}
                            <View style={styles.divider}>
                                <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
                                <Text style={[styles.dividerText, { color: palette.muted }]}>
                                    veya
                                </Text>
                                <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
                            </View>

                            {/* OAuth Buttons */}
                            <Pressable style={[styles.oauthButton, styles.googleButton]}>
                                <Text style={styles.oauthButtonText}>Google ile Giriş Yap</Text>
                            </Pressable>

                            <Pressable style={[styles.oauthButton, styles.microsoftButton]}>
                                <Text style={styles.oauthButtonText}>Microsoft ile Giriş Yap</Text>
                            </Pressable>

                            {/* Links */}
                            <View style={styles.linksContainer}>
                                <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                                    <Text style={[styles.link, { color: palette.muted }]}>
                                        Şifremi Unuttum
                                    </Text>
                                </Pressable>
                                <Pressable onPress={() => router.push('/(auth)/register')}>
                                    <Text style={[styles.linkPrimary, { color: palette.primary }]}>
                                        Yeni Hesap Oluştur
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        borderRadius: 20,
        padding: 28,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
    },
    input: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 12,
        borderRadius: 10,
    },
    errorText: {
        color: '#ef4444',
        fontSize: 14,
        textAlign: 'center',
    },
    button: {
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonPressed: {
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#06b6d4',
        borderRadius: 12,
    },
    buttonText: {
        color: '#0f172a',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 14,
    },
    oauthButton: {
        height: 52,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleButton: {
        backgroundColor: '#ea4335',
    },
    microsoftButton: {
        backgroundColor: '#2563eb',
    },
    oauthButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '500',
    },
    linksContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    link: {
        fontSize: 14,
    },
    linkPrimary: {
        fontSize: 14,
        fontWeight: '500',
    },
    biometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 8,
        gap: 8,
    },
    biometricText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
