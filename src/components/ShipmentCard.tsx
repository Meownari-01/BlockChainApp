// src/components/ShipmentCard.tsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ViewStyle,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { ShipmentMetadata, ShipmentStatus } from '../types';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

interface ShipmentCardProps {
    shipment: ShipmentMetadata;
    onPress?: () => void;
    style?: ViewStyle;
    showAgent?: boolean;
    showShipper?: boolean;
}

const STATUS_CONFIG: Record<ShipmentStatus, { icon: string; bg: string; text: string; border: string; label: string }> = {
    Created: {
        icon: 'time-outline',
        bg: '#451A0330',
        text: '#FCD34D',
        border: '#F59E0B',
        label: 'Created',
    },
    OutForDelivery: {
        icon: 'bicycle-outline',
        bg: '#1E3A8A30',
        text: '#93C5FD',
        border: '#2563EB',
        label: 'In Transit',
    },
    Delivered: {
        icon: 'checkmark-circle-outline',
        bg: '#064E3B30',
        text: '#6EE7B7',
        border: '#10B981',
        label: 'Delivered',
    },
    Disputed: {
        icon: 'alert-circle-outline',
        bg: '#7F1D1D30',
        text: '#FCA5A5',
        border: '#EF4444',
        label: 'Disputed',
    },
};

function truncate(str: string, chars = 8): string {
    if (!str || str.length <= chars * 2 + 3) return str;
    return `${str.slice(0, chars)}...${str.slice(-4)}`;
}

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ShipmentCard: React.FC<ShipmentCardProps> = React.memo(({
    shipment,
    onPress,
    style,
    showAgent = true,
    showShipper = false,
}) => {
    const status = shipment.status as ShipmentStatus;
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Created;
    const router = useRouter();

    const handleCopyId = () => {
        if (!shipment.shipmentId) return;
        Clipboard.setStringAsync(shipment.shipmentId);
        if (Platform.OS === 'web') {
            window.alert('Shipment ID copied to clipboard');
        } else {
            Alert.alert('Copied', 'Shipment ID copied to clipboard');
        }
    };

    const handleTrack = () => {
        if (!shipment.shipmentId && !shipment.orderId) return;
        router.push(`/(public)/status/${shipment.shipmentId || shipment.orderId}` as never);
    };

    return (
        <TouchableOpacity
            style={[styles.card, style]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {/* Top row */}
            <View style={styles.header}>
                <View style={styles.orderIdRow}>
                    <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                    <Text style={styles.orderId} numberOfLines={1}>{shipment.orderId}</Text>
                </View>
                {/* Full Shipment ID & Actions */}
                <View style={styles.shipmentIdContainer}>
                    <Text style={styles.shipmentId} numberOfLines={1}>
                        {truncate(shipment.shipmentId || '', 12)}
                    </Text>
                    <View style={styles.shipmentIdActions}>
                        <TouchableOpacity 
                            onPress={handleCopyId} 
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.actionIconButton}
                        >
                            <Ionicons name="copy-outline" size={14} color={Colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleTrack} 
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={styles.actionIconButton}
                        >
                            <Ionicons name="navigate-outline" size={14} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
                {/* Status badge */}
                <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                    <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={12} color={cfg.text} />
                    <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Details */}
            <View style={styles.details}>
                {showShipper && (
                    <View style={styles.row}>
                        <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.label}>Shipper</Text>
                        <Text style={styles.value}>{shipment.shipper || 'N/A'}</Text>
                    </View>
                )}
                {showAgent && (
                    <View style={styles.row}>
                        <Ionicons name="bicycle-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.label}>Agent</Text>
                        <Text style={styles.value}>{shipment.agent || 'Not Assigned'}</Text>
                    </View>
                )}
                <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.label}>Created</Text>
                    <Text style={styles.value}>{formatDate(shipment.createdAt)}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="diamond-outline" size={13} color={Colors.primary} />
                    <Text style={styles.label}>Escrow</Text>
                    <Text style={[styles.value, { color: Colors.primary }]}>{shipment.escrowAmount || '0'} ETH</Text>
                </View>
            </View>


            {/* Chevron */}
            {onPress && (
                <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    orderIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    orderId: {
        ...Typography.h4,
        fontSize: 15,
    },
    shipmentIdContainer: {
        position: 'absolute',
        top: 40,
        left: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shipmentId: {
        ...Typography.caption,
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: 'monospace',
    },
    shipmentIdActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionIconButton: {
        padding: 4,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginLeft: Spacing.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    details: {
        gap: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        ...Typography.caption,
        fontSize: 12,
        width: 54,
        color: Colors.textMuted,
    },
    value: {
        ...Typography.caption,
        fontSize: 12,
        color: Colors.text,
        flex: 1,
        fontFamily: 'monospace',
    },
    chevron: {
        position: 'absolute',
        right: Spacing.md,
        top: Spacing.md,
    },
});
