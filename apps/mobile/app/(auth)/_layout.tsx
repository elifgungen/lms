import { Stack } from 'expo-router';
import { usePalette } from '@/hooks/usePalette';

export default function AuthLayout() {
    const palette = usePalette();

    return (
        <Stack
            screenOptions={{
                headerStyle: { backgroundColor: palette.background },
                headerTintColor: palette.text,
                headerTitleStyle: { fontWeight: '600' },
                contentStyle: { backgroundColor: palette.background },
            }}
        >
            <Stack.Screen name="login" options={{ title: 'Giriş Yap', headerShown: false }} />
            <Stack.Screen name="register" options={{ title: 'Kayıt Ol' }} />
        </Stack>
    );
}
