import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="connect" />
            <Stack.Screen name="login" />
            <Stack.Screen name="admin-login" />
            <Stack.Screen name="signup" />
        </Stack>
    );
}
