import { Platform, ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../src/services/hooks/useAuth';
import { useRouter, useSegments, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../src/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';

export default function AdminLayout() {
    const { session, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        console.log(`[AdminLayout] Check - loading: ${loading}, role: ${session?.role || 'null'}`);
        if (!loading) {
            if (!session || session.role !== 'ADMIN') {
                console.log(`[AdminLayout] Unauthorized. Redirecting to login.`);
                router.replace('/(auth)/admin-login');
            } else {
                console.log(`[AdminLayout] Authorized as ADMIN.`);
            }
        }
    }, [session, loading]);

    if (loading || !session || session.role !== 'ADMIN') {
        return (
            <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.lockedRoot}>
                <View style={styles.lockInfo}>
                    <Ionicons name="lock-closed" size={64} color={Colors.primary} />
                    <Text style={styles.lockTitle}>Restricted Access</Text>
                    <Text style={styles.lockSub}>Please authenticate via the Admin Portal to continue.</Text>
                    <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
                </View>
            </LinearGradient>
        );
    }

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
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="agents"
                options={{
                    title: 'Agents',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="shipments"
                options={{
                    title: 'Shipments',
                    tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="shippers"
                options={{
                    title: 'Shippers',
                    tabBarIcon: ({ color, size }) => <Ionicons name="car-outline" size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    lockedRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    lockInfo: { alignItems: 'center', gap: Spacing.md },
    lockTitle: { ...Typography.h2, color: Colors.white, textAlign: 'center' },
    lockSub: { ...Typography.bodySmall, color: Colors.textMuted, textAlign: 'center' },
});
