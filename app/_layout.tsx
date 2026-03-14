// app/_layout.tsx
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { getStoredSession, getRolePath } from '@hooks/useAuth';
import { Colors } from '@constants/theme';

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const pathname = usePathname();
    const navigationState = useRootNavigationState();
    const [initializing, setInitializing] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        // Wait for fonts and navigation state to be ready
        if (!fontsLoaded || !navigationState?.key) return;

        async function bootstrap() {
            try {
                const session = await getStoredSession();
                const segs = segments as string[];
                const inAuthGroup = segs[0] === '(auth)';
                const isRoot = pathname === '/';

                if (session?.address && session?.role) {
                    setAuthenticated(true);
                    const targetPath = getRolePath(session.role);
                    
                    // Only redirect if we're in the (auth) group or at the root index
                    if (inAuthGroup || isRoot) {
                        router.replace(targetPath as never);
                    }
                } else if (!inAuthGroup && segs[0] !== '(public)' && !isRoot) {
                    // Redirect to landing if not authenticated and trying to access a protected route
                    router.replace('/' as never);
                }
            } catch (err) {
                console.error('Bootstrap error:', err);
                router.replace('/(auth)/login' as never);
            } finally {
                setInitializing(false);
            }
        }

        bootstrap();
    }, [fontsLoaded, segments, navigationState?.key]);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" backgroundColor={Colors.background} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="(shipper)" />
                <Stack.Screen name="(agent)" />
                <Stack.Screen name="(public)" />
            </Stack>
            
            {(!fontsLoaded || initializing) && (
                <View style={[StyleSheet.absoluteFill, styles.loading]}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            )}
            <Toast />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
