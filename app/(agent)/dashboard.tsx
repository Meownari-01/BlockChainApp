// app/(agent)/dashboard.tsx
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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../src/services/api';
import { BlockchainService } from '../../src/services/blockchain';
import { WalletHeader } from '../../src/components/WalletHeader';
import { getStoredSession, clearStoredSession } from '../../src/services/hooks/useAuth';
import { ShipmentMetadata, ShipmentStatus } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const STATUS_PRIORITY: Record<ShipmentStatus, number> = {
    OutForDelivery: 0,
    Created: 1,
    Delivered: 2,
    Disputed: 3,
};

const DeliveryCard = React.memo(({ shipment, onStartDelivery, onConfirm }: {
    shipment: ShipmentMetadata;
    onStartDelivery: (id: string) => void;
    onConfirm: (id: string) => void;
}) => {
    const isOut = shipment.status === 'OutForDelivery';
    const isCreated = shipment.status === 'Created';
    const isDone = shipment.status === 'Delivered' || shipment.status === 'Disputed';

    const statusColor = isOut ? Colors.primary : isCreated ? Colors.warning : Colors.success;
    const statusLabel = isOut ? 'In Transit' : shipment.status;

    return (
        <View style={[styles.card, isOut && styles.cardHighlight]}>
            {isOut && (
                <LinearGradient colors={[`${Colors.primary}15`, 'transparent']} style={styles.cardGlow} />
            )}
            <View style={styles.cardHeader}>
                <View style={styles.cardIdRow}>
                    <Ionicons name="cube-outline" size={16} color={statusColor} />
                    <Text style={styles.cardId}>{shipment.orderId}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                    <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <Text style={styles.shipperText}>Shipper: {shipment.shipper?.slice(0, 10)}...{shipment.shipper?.slice(-4)}</Text>
                <Text style={styles.dateText}>{new Date(shipment.createdAt).toLocaleDateString()}</Text>
            </View>

            {!isDone && (
                <View style={styles.cardActions}>
                    {isCreated && (
                        <TouchableOpacity 
                            style={styles.startBtn} 
                            onPress={() => onStartDelivery(shipment.shipmentId || shipment.orderId)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.startBtnGrad}>
                                <Ionicons name="bicycle" size={16} color={Colors.white} />
                                <Text style={styles.startBtnText}>Start Delivery</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                    {isOut && (
                        <TouchableOpacity 
                            style={styles.confirmBtn} 
                            onPress={() => onConfirm(shipment.shipmentId || shipment.orderId)}
                            activeOpacity={0.7}
                        >
                            <LinearGradient colors={[Colors.success, '#059669']} style={styles.startBtnGrad}>
                                <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                                <Text style={styles.startBtnText}>Confirm Delivery</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {isDone && (
                <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-done" size={14} color={Colors.success} />
                    <Text style={styles.doneBadgeText}>Completed</Text>
                </View>
            )}
        </View>
    );
});

export default function AgentDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<{ address: string } | null>(null);
    const [deliveries, setDeliveries] = useState<ShipmentMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        async function setupListener() {
            setLoading(true);
            const sess = await getStoredSession();
            setSession(sess);

            if (sess?.address) {
                unsubscribe = ApiService.subscribeToShipmentsByAgent(sess.address, (data) => {
                    const sorted = [...data].sort((a, b) => 
                        (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9)
                    );
                    setDeliveries(sorted);
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

    const onRefresh = useCallback(async () => { 
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handleStartDelivery = useCallback(async (shipmentId: string) => {
        Alert.alert('Start Delivery?', 'This will broadcast a transaction marking this shipment as Out For Delivery.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm', onPress: async () => {
                    try {
                        const tx = await BlockchainService.markOutForDelivery(shipmentId);
                        await BlockchainService.waitForTransaction(tx);
                        await ApiService.updateShipment(shipmentId, { status: 'OutForDelivery' });
                        setDeliveries((prev) => prev.map((d) => d.shipmentId === shipmentId ? { ...d, status: 'OutForDelivery' } : d));
                        Toast.show({ type: 'success', text1: '📦 In Transit!', text2: 'Transaction confirmed on-chain.' });
                    } catch (err: unknown) {
                        Toast.show({ type: 'error', text1: 'Transaction Failed', text2: err instanceof Error ? err.message : '' });
                    }
                },
            },
        ]);
    }, []);

    const handleConfirmDelivery = useCallback((shipmentId: string) => {
        router.push(`/(agent)/deliver/${shipmentId}` as never);
    }, [router]);

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

    const activeCount = deliveries.filter((d) => d.status !== 'Delivered' && d.status !== 'Disputed').length;

    return (
        <View style={styles.root}>
            <WalletHeader
                title="My Deliveries"
                subtitle={`${activeCount} active · ${deliveries.filter((d) => d.status === 'Delivered').length} delivered`}
                address={session?.address || ''}
                role="AGENT"
                onDisconnect={handleDisconnect}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.success} /></View>
            ) : (
                <FlatList
                    data={deliveries}
                    keyExtractor={(d) => d.shipmentId || d.orderId || Math.random().toString()}
                    renderItem={({ item }) => (
                        <DeliveryCard
                            shipment={item}
                            onStartDelivery={handleStartDelivery}
                            onConfirm={handleConfirmDelivery}
                        />
                    )}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.success} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="bicycle-outline" size={56} color={Colors.textMuted} />
                            <Text style={styles.emptyTitle}>No deliveries assigned</Text>
                            <Text style={styles.emptyHint}>Shipments assigned to your address will appear here</Text>
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
    list: { padding: Spacing.md, paddingBottom: 40 },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
        ...Shadows.card,
    },
    cardHighlight: { borderColor: `${Colors.primary}50` },
    cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
    cardIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardId: { ...Typography.h4, fontSize: 15 },
    badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardDetails: { gap: 3, marginBottom: Spacing.sm },
    shipperText: { ...Typography.caption, fontFamily: 'monospace', fontSize: 12, color: Colors.textMuted },
    dateText: { ...Typography.caption, fontSize: 12, color: Colors.textMuted },
    cardActions: { marginTop: 4 },
    startBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    confirmBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    startBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm + 2 },
    startBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    doneBadgeText: { ...Typography.caption, color: Colors.success, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary },
    emptyHint: { ...Typography.caption, textAlign: 'center' },
    fab: { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg, borderRadius: BorderRadius.full, overflow: 'hidden', ...Shadows.lg },
    fabGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14 },
    fabText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
