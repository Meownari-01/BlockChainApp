// app/(agent)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function AgentLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
                    height: Platform.OS === 'ios' ? 80 : 60,
                },
                tabBarActiveTintColor: Colors.success,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Deliveries',
                    tabBarIcon: ({ color, size }) => <Ionicons name="bicycle-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="deliver/[id]"
                options={{
                    href: null, // hide from tab bar
                }}
            />
        </Tabs>
    );
}
