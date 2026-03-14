// app/(shipper)/dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ApiService } from '../../src/services/api';
import { WalletHeader } from '../../src/components/WalletHeader';
import { ShipmentCard } from '../../src/components/ShipmentCard';
import { getStoredSession, clearStoredSession } from '../../src/services/hooks/useAuth';
import { ShipmentMetadata, ShipmentStatus } from '../../src/types';
import { Colors, Typography, Spacing } from '../../src/constants/theme';

const FILTERS: { label: string; value: ShipmentStatus | 'All' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Created', value: 'Created' },
    { label: 'Transit', value: 'OutForDelivery' },
    { label: 'Delivered', value: 'Delivered' },
    { label: 'Disputed', value: 'Disputed' },
];

export default function ShipperDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<{ address: string } | null>(null);
    const [shipments, setShipments] = useState<ShipmentMetadata[]>([]);
    const [filtered, setFiltered] = useState<ShipmentMetadata[]>([]);
    const [activeFilter, setActiveFilter] = useState<ShipmentStatus | 'All'>('All');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        async function setupListener() {
            setLoading(true);
            const sess = await getStoredSession();
            setSession(sess);

            if (sess?.address) {
                // Initial load is handled by the subscription callback
                unsubscribe = ApiService.subscribeToShipmentsByShipper(sess.address, (data) => {
                    setShipments(data);
                    setLoading(false);
                    setRefreshing(false);
                });
            } else {
                setLoading(false);
            }
        }

        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    useEffect(() => {
        setFiltered(activeFilter === 'All' ? shipments : shipments.filter((s) => s.status === activeFilter));
    }, [activeFilter, shipments]);

    const onRefresh = useCallback(async () => { 
        setRefreshing(true);
        // With onSnapshot, refresh mainly just resets the loading state if needed, 
        // as the data is already synced. But we can keep it for UX.
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    async function handleDisconnect() {
        const logout = async () => {
            await clearStoredSession();
            router.replace('/(auth)/connect' as never);
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Disconnect wallet?')) logout();
        } else {
            Alert.alert('Disconnect', 'Disconnect wallet?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: logout },
            ]);
        }
    }

    const deliveredCount = shipments.filter((s) => s.status === 'Delivered').length;

    return (
        <View style={styles.root}>
            <WalletHeader
                title="My Shipments"
                subtitle={`${shipments.length} shipments · ${deliveredCount} delivered`}
                address={session?.address || ''}
                role="SHIPPER"
                onDisconnect={handleDisconnect}
            />

            {/* Filter tabs */}
            <View style={styles.filterRow}>
                {FILTERS.map((f) => {
                    const count = f.value === 'All' ? shipments.length : shipments.filter((s) => s.status === f.value).length;
                    const isActive = activeFilter === f.value;
                    return (
                        <TouchableOpacity
                            key={f.value}
                            style={[styles.filterTab, isActive && styles.filterTabActive]}
                            onPress={() => setActiveFilter(f.value)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{f.label}</Text>
                            {count > 0 && (
                                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                                    <Text style={[styles.filterCountText, isActive && { color: Colors.white }]}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(s) => s.shipmentId || s.orderId || Math.random().toString()}
                    renderItem={({ item }) => {
                        const handlePress = () => router.push(`/(public)/status/${item.shipmentId}` as never);
                        return (
                            <ShipmentCard
                                shipment={item}
                                showAgent
                                onPress={handlePress}
                                style={styles.card}
                            />
                        );
                    }}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="cube-outline" size={56} color={Colors.textMuted} />
                            <Text style={styles.emptyTitle}>No shipments yet</Text>
                            <Text style={styles.emptyHint}>Tap Create to start your first shipment</Text>
                            <TouchableOpacity style={styles.createPrompt} onPress={() => router.push('/(shipper)/create' as never)}>
                                <Text style={styles.createPromptText}>+ Create Shipment</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary },
    filterTextActive: { color: Colors.white, fontWeight: '700' },
    filterCount: { backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 5, minWidth: 18, alignItems: 'center' },
    filterCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    filterCountText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
    list: { padding: Spacing.md, paddingBottom: 40 },
    card: {},
    empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyHint: { ...Typography.caption },
    createPrompt: {
        backgroundColor: Colors.primary, borderRadius: 20,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.sm,
    },
    createPromptText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
