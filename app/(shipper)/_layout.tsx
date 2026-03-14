// app/(shipper)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function ShipperLayout() {
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
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Shipments',
                    tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: 'Create',
                    tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="tracking"
                options={{
                    title: 'Track',
                    tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="qrcode"
                options={{
                    title: 'QR Code',
                    tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
