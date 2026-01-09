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
    Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePalette } from '@/hooks/usePalette';
import { API_URL, API_ENDPOINTS } from '@/services/config';

export default function ForgotPasswordScreen() {
    const palette = usePalette();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!email.trim()) {
            Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
            return;
        }

        setLoading(true);
        try {
            // API çağrısı simülasyonu (veya gerçek endpoint)
            // await axios.post(`${API_URL}/auth/forgot-password`, { email });

            // Şimdilik demo modunda başarılı sayıyoruz
            await new Promise(resolve => setTimeout(resolve, 1500));

            Alert.alert(
                'Başarılı',
                'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.',
                [{ text: 'Tamam', onPress: () => router.back() }]
            );
        } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız oldu. Lütfen tekrar deneyin.');
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={palette.text} />
                        </Pressable>
                        <Text style={[styles.title, { color: palette.text }]}>Şifremi Unuttum</Text>
                    </View>

                    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <Text style={[styles.description, { color: palette.muted }]}>
                            Hesabınıza kayıtlı e-posta adresini girin. Size şifrenizi sıfırlamanız için bir bağlantı göndereceğiz.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: palette.muted }]}>E-posta</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: palette.surface,
                                    borderColor: palette.border,
                                    color: palette.text
                                }]}
                                placeholder="E-posta adresiniz"
                                placeholderTextColor={palette.muted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <Pressable
                            onPress={handleReset}
                            disabled={loading}
                            style={({ pressed }) => [
                                styles.button,
                                pressed && styles.buttonPressed,
                                loading && styles.buttonDisabled
                            ]}
                        >
                            <View style={styles.buttonGradient}>
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Sıfırlama Bağlantısı Gönder</Text>
                                )}
                            </View>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    scrollContent: { padding: 24, flexGrow: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 40
    },
    backButton: { marginRight: 16 },
    title: { fontSize: 24, fontWeight: '700' },
    card: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    description: {
        fontSize: 16,
        marginBottom: 24,
        lineHeight: 24,
    },
    inputGroup: { gap: 8, marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '500' },
    input: {
        height: 52,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    buttonPressed: { transform: [{ scale: 0.98 }] },
    buttonDisabled: { opacity: 0.7 },
    buttonGradient: {
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#06b6d4',
        borderRadius: 12,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
