// app/(public)/status/[id].tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ApiService } from '../../../src/services/api';
import { StatusTimeline } from '../../../src/components/StatusTimeline';
import { BlockchainService } from '../../../src/services/blockchain';
import LeafletMap from '../../../src/components/Map';
import QRCode from 'react-native-qrcode-svg';
import { ShipmentMetadata } from '../../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import * as LinkingHelper from 'expo-linking';

function InfoRow({ icon, label, value, mono = false, link }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; mono?: boolean; link?: string }) {
    return (
        <TouchableOpacity style={styles.infoRow} onPress={link ? () => Linking.openURL(link) : undefined} disabled={!link}>
            <Ionicons name={icon} size={15} color={Colors.textMuted} />
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, mono ? styles.infoValueMono : undefined, link ? styles.infoValueLink : undefined]} numberOfLines={1}>{value}</Text>
            {link && <Ionicons name="open-outline" size={12} color={Colors.primary} />}
        </TouchableOpacity>
    );
}

export default function StatusScreen() {
    const router = useRouter();
    const { id: shipmentId } = useLocalSearchParams<{ id: string }>();
    const [shipment, setShipment] = useState<ShipmentMetadata | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchShipment() {
            if (!shipmentId || shipmentId === 'undefined') {
                setError('Invalid Shipment ID');
                setLoading(false);
                return;
            }
            try {
                // Ensure we try both the original and potentially trimmed version
                const cleanId = shipmentId.trim();
                const data = await ApiService.getShipment(cleanId);
                setShipment(data);
            } catch (err: unknown) {
                console.error("Tracking Fetch Error for ID:", shipmentId, err);
                setError(err instanceof Error ? err.message : 'Shipment not found');
            } finally {
                setLoading(false);
            }
        }
        fetchShipment();
    }, [shipmentId]);

    const isDelivered = shipment?.status === 'Delivered';
    const isDisputed = shipment?.status === 'Disputed';

    const statusColor = isDelivered ? Colors.success : isDisputed ? Colors.error : Colors.primary;
    const statusIcon = isDelivered ? 'checkmark-circle' : isDisputed ? 'alert-circle' : 'bicycle';

    return (
        <View style={styles.root}>
            {/* Header */}
            <LinearGradient colors={['#0F1729', '#111827']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Shipment Status</Text>
                    <Text style={styles.headerSub}>{shipmentId}</Text>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Fetching on-chain data...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
                    <Text style={styles.errorTitle}>Shipment Not Found</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.backToTrack} onPress={() => router.replace('/(public)/track' as never)}>
                        <Text style={styles.backToTrackText}>← Try Another ID</Text>
                    </TouchableOpacity>
                </View>
            ) : shipment ? (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Status hero card */}
                    <View style={[styles.statusCard, { borderColor: `${statusColor}50` }]}>
                        <LinearGradient colors={[`${statusColor}15`, 'transparent']} style={styles.statusGrad}>
                            <Ionicons name={statusIcon} size={36} color={statusColor} />
                            <View style={styles.statusInfo}>
                                <Text style={styles.statusOrderId}>{shipment.orderId}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}25`, borderColor: statusColor }]}>
                                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{shipment.status}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* QR Code Section */}
                    <View style={styles.qrSection}>
                        <View style={styles.qrCard}>
                            <QRCode
                                value={LinkingHelper.createURL(`/(public)/status/${shipmentId}`)}
                                size={120}
                                color={Colors.text}
                                backgroundColor={Colors.surface}
                            />
                            <View style={styles.qrInfo}>
                                <Text style={styles.qrTitle}>Tracking QR Code</Text>
                                <Text style={styles.qrSub}>Scan from the Agent Scanner to process this delivery</Text>
                            </View>
                        </View>
                    </View>

                    {/* Map Section */}
                    {shipment.gpsLocation && (
                        <>
                            <Text style={styles.sectionTitle}>Current Location</Text>
                            <View style={styles.mapContainer}>
                                <LeafletMap
                                    center={{
                                        latitude: parseFloat(shipment.gpsLocation.split(',')[0]),
                                        longitude: parseFloat(shipment.gpsLocation.split(',')[1])
                                    }}
                                    zoom={10}
                                    markers={[
                                        ...(shipment.originLocation ? [{
                                            latitude: parseFloat(shipment.originLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.originLocation.split(',')[1]),
                                            title: 'Origin'
                                        }] : []),
                                        {
                                            latitude: parseFloat(shipment.gpsLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.gpsLocation.split(',')[1]),
                                            title: 'Current Location'
                                        },
                                        ...(shipment.destinationLocation ? [{
                                            latitude: parseFloat(shipment.destinationLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.destinationLocation.split(',')[1]),
                                            title: 'Destination'
                                        }] : []),
                                    ]}
                                    route={shipment.originLocation && shipment.destinationLocation ? [
                                        {
                                            latitude: parseFloat(shipment.originLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.originLocation.split(',')[1]),
                                        },
                                        {
                                            latitude: parseFloat(shipment.gpsLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.gpsLocation.split(',')[1]),
                                        },
                                        {
                                            latitude: parseFloat(shipment.destinationLocation.split(',')[0]),
                                            longitude: parseFloat(shipment.destinationLocation.split(',')[1]),
                                        }
                                    ] : []}
                                />
                            </View>
                        </>
                    )}

                    {/* Package info */}
                    <Text style={styles.sectionTitle}>Package Info</Text>
                    <View style={styles.card}>
                        <InfoRow icon="cube-outline" label="Order ID" value={shipment.orderId || 'N/A'} mono />
                        <InfoRow 
                            icon="person-outline" 
                            label="Shipper" 
                            value={shipment.shipper || 'Not Assigned'} 
                            mono
                            link={shipment.shipper ? BlockchainService.getSepoliaAddressUrl(shipment.shipper) : undefined} 
                        />
                        <InfoRow 
                            icon="bicycle-outline" 
                            label="Agent" 
                            value={shipment.agent || 'Not Assigned'} 
                            mono
                            link={shipment.agent ? BlockchainService.getSepoliaAddressUrl(shipment.agent) : undefined} 
                        />
                        <InfoRow icon="diamond-outline" label="Escrow" value={`${shipment.escrowAmount || '0'} ETH`} />
                    </View>

                    {/* Timeline */}
                    <Text style={styles.sectionTitle}>Delivery Timeline</Text>
                    <View style={styles.card}>
                        <StatusTimeline shipment={shipment} />
                    </View>

                    {/* Blockchain proof (if delivered) */}
                    {isDelivered && (
                        <>
                            <Text style={styles.sectionTitle}>Blockchain Proof</Text>
                            <View style={styles.card}>
                                {shipment.deliveryTxHash && (
                                    <InfoRow
                                        icon="receipt-outline"
                                        label="TX Hash"
                                        value={shipment.deliveryTxHash}
                                        mono
                                        link={BlockchainService.getSepoliaEtherscanUrl(shipment.deliveryTxHash)}
                                    />
                                )}
                                {shipment.gpsLocation && (
                                    <InfoRow icon="location-outline" label="GPS" value={shipment.gpsLocation} mono />
                                )}
                                {shipment.photoUrl && (
                                    <View style={styles.photoProofContainer}>
                                        <Text style={styles.infoLabel}>Delivery Proof Photo</Text>
                                        <TouchableOpacity onPress={() => Linking.openURL(shipment.photoUrl!)}>
                                            <View style={styles.photoProofWrapper}>
                                                <Ionicons name="image" size={32} color={Colors.primary} style={styles.photoPlaceholder} />
                                                <Text style={styles.photoLinkText}>View Proof Image</Text>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Verified badge */}
                                <View style={styles.verifiedBadge}>
                                    <LinearGradient colors={[`${Colors.success}20`, `${Colors.success}05`]} style={styles.verifiedGrad}>
                                        <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                                        <Text style={styles.verifiedText}>
                                            This delivery is cryptographically verified on the Ethereum Sepolia blockchain.
                                        </Text>
                                    </LinearGradient>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Disputed state */}
                    {isDisputed && (
                        <View style={styles.disputedBanner}>
                            <Ionicons name="warning" size={20} color={Colors.error} />
                            <Text style={styles.disputedText}>
                                This shipment has been disputed. Resolution is pending admin review.
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        paddingTop: Spacing.xxxl + 10, paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { ...Typography.h3, fontSize: 18 },
    headerSub: { ...Typography.caption, fontSize: 11, color: Colors.textMuted, fontFamily: 'monospace' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
    loadingText: { ...Typography.bodySmall, color: Colors.textMuted },
    errorTitle: { ...Typography.h3, color: Colors.error },
    errorText: { ...Typography.bodySmall, textAlign: 'center' },
    backToTrack: { padding: Spacing.md },
    backToTrackText: { color: Colors.primary, fontWeight: '600' },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg },
    sectionTitle: { ...Typography.label, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs, marginTop: Spacing.md },
    statusCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, marginBottom: 4, ...Shadows.md },
    statusGrad: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
    statusInfo: { gap: 8 },
    statusOrderId: { ...Typography.h3, fontSize: 17 },
    statusBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', borderWidth: 1 },
    statusBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm, ...Shadows.card },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { ...Typography.caption, width: 56, color: Colors.textMuted, textTransform: 'uppercase', fontSize: 10 },
    infoValue: { ...Typography.caption, flex: 1, color: Colors.text, fontSize: 12 },
    infoValueMono: { fontFamily: 'monospace' },
    infoValueLink: { color: Colors.primary },
    verifiedBadge: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.sm, borderWidth: 1, borderColor: `${Colors.success}30` },
    verifiedGrad: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.md },
    verifiedText: { ...Typography.caption, flex: 1, color: Colors.success, lineHeight: 18 },
    disputedBanner: {
        flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
        backgroundColor: `${Colors.error}15`, borderRadius: BorderRadius.md,
        padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.error}30`, marginTop: Spacing.sm,
    },
    disputedText: { ...Typography.bodySmall, flex: 1, color: Colors.error },
    photoProofContainer: { marginTop: Spacing.md, gap: Spacing.sm },
    photoProofWrapper: { 
        height: 120, 
        backgroundColor: Colors.surfaceLight, 
        borderRadius: BorderRadius.md, 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed'
    },
    photoPlaceholder: { marginBottom: 4 },
    photoLinkText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },
    qrSection: {
        marginBottom: Spacing.md,
    },
    qrCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        ...Shadows.card,
    },
    qrInfo: {
        flex: 1,
        gap: 4,
    },
    qrTitle: {
        ...Typography.h4,
        color: Colors.text,
    },
    qrSub: {
        ...Typography.caption,
        color: Colors.textMuted,
        lineHeight: 16,
    },
    mapContainer: {
        height: 250,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
});
