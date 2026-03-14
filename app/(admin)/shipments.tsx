// app/(admin)/shipments.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ApiService } from '../../src/services/api';
import { WalletHeader } from '../../src/components/WalletHeader';
import { ShipmentCard } from '../../src/components/ShipmentCard';
import { getStoredSession, clearStoredSession } from '../../src/services/hooks/useAuth';
import { ShipmentMetadata, ShipmentStatus } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { Platform, Alert } from 'react-native';

const FILTERS: { label: string; value: ShipmentStatus | 'All' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Created', value: 'Created' },
    { label: 'Transit', value: 'OutForDelivery' },
    { label: 'Delivered', value: 'Delivered' },
    { label: 'Disputed', value: 'Disputed' },
];

export default function AdminShipments() {
    const router = useRouter();
    const [session, setSession] = useState<{ address: string } | null>(null);
    const [shipments, setShipments] = useState<ShipmentMetadata[]>([]);
    const [filtered, setFiltered] = useState<ShipmentMetadata[]>([]);
    const [activeFilter, setActiveFilter] = useState<ShipmentStatus | 'All'>('All');
    async function handleDisconnect() {
        const logout = async () => {
            await clearStoredSession();
            router.replace('/(auth)/connect' as never);
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Disconnect?')) logout();
        } else {
            Alert.alert('Disconnect', 'Disconnect?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: logout },
            ]);
        }
    }

    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        async function setupListener() {
            setLoading(true);
            const sess = await getStoredSession();
            setSession(sess);

            unsubscribe = ApiService.subscribeToAllShipments((data) => {
                setShipments(data);
                setLoading(false);
                setRefreshing(false);
            });
        }

        setupListener();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    useEffect(() => {
        if (activeFilter === 'All') {
            setFiltered(shipments);
        } else {
            setFiltered(shipments.filter((s) => s.status === activeFilter));
        }
    }, [activeFilter, shipments]);

    return (
        <View style={styles.root}>
            <WalletHeader
                title="All Shipments"
                subtitle={`${shipments.length} total across all shippers`}
                address={session?.address || ''}
                role="ADMIN"
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
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                            <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
                                <Text style={[styles.filterBadgeText, isActive && { color: Colors.white }]}>{count}</Text>
                            </View>
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
                    renderItem={({ item }) => (
                        <ShipmentCard
                            shipment={item}
                            showShipper
                            showAgent
                            onPress={() => router.push(`/(public)/status/${item.shipmentId}` as never)}
                            style={styles.cardStyle}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>No shipments found</Text>
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
        gap: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    filterTabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    filterTextActive: {
        color: Colors.white,
        fontWeight: '700',
    },
    filterBadge: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 5,
        paddingVertical: 1,
        minWidth: 18,
        alignItems: 'center',
    },
    filterBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
    filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
    list: { padding: Spacing.md, paddingBottom: 40 },
    cardStyle: {},
    empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
    emptyText: { ...Typography.h4, color: Colors.textSecondary },
});
