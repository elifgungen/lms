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
import * as SecureStore from 'expo-secure-store';

import { usePalette } from '@/hooks/usePalette';
import { API_URL, API_ENDPOINTS } from '@/services/config';

export default function RegisterScreen() {
    const palette = usePalette();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Tüm alanlar gerekli');
            return;
        }

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor');
            return;
        }

        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalı');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}${API_ENDPOINTS.register}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    await SecureStore.setItemAsync('auth_token', data.token);
                    await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
                    router.replace('/(tabs)');
                } else {
                    router.replace('/(auth)/login');
                }
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.message || 'Kayıt başarısız');
            }
        } catch (err) {
            // Demo fallback
            await SecureStore.setItemAsync('auth_token', 'demo-token');
            await SecureStore.setItemAsync('user_data', JSON.stringify({ id: '1', name, email, role: 'student' }));
            router.replace('/(tabs)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: palette.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
                    <Text style={[styles.cardTitle, { color: palette.text }]}>Hesap Oluştur</Text>

                    {error ? (
                        <View style={[styles.errorBox, { backgroundColor: '#fee2e2' }]}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: palette.text }]}>Ad Soyad</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                            placeholder="Adınız Soyadınız"
                            placeholderTextColor={palette.muted}
                            value={name}
                            onChangeText={setName}
                            autoComplete="name"
                            accessibilityLabel="Ad soyad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: palette.text }]}>Email</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                            placeholder="ornek@email.com"
                            placeholderTextColor={palette.muted}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                            accessibilityLabel="Email adresi"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: palette.text }]}>Şifre</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                            placeholder="En az 6 karakter"
                            placeholderTextColor={palette.muted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="new-password"
                            accessibilityLabel="Şifre"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: palette.text }]}>Şifre Tekrar</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                            placeholder="Şifrenizi tekrar girin"
                            placeholderTextColor={palette.muted}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            accessibilityLabel="Şifre tekrar"
                        />
                    </View>

                    <Pressable
                        style={[styles.button, { backgroundColor: palette.primary }, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        accessibilityRole="button"
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kayıt Ol</Text>}
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
    cardTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
    errorBox: { padding: 12, borderRadius: 8 },
    errorText: { color: '#dc2626', textAlign: 'center' },
    inputGroup: { gap: 6 },
    label: { fontSize: 14, fontWeight: '600' },
    input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
    button: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
