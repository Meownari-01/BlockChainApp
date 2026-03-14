import { Stack } from 'expo-router';

export default function PublicLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="track" />
            <Stack.Screen name="verify" />
            <Stack.Screen name="status/[id]" />
        </Stack>
    );
}
