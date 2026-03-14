// app/(shipper)/qrcode.tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { ApiService } from '../../src/services/api';
import { ShipmentMetadata } from '../../src/types';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function QRCodeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ shipmentId: string; otp: string }>();
    const { shipmentId, otp } = params;
    const [shipment, setShipment] = useState<ShipmentMetadata | null>(null);

    useEffect(() => {
        if (shipmentId) {
            ApiService.getShipment(shipmentId)
                .then(setShipment)
                .catch(console.error);
        }
    }, [shipmentId]);

    let trackingUrl = `chaindeliver://public/status/${shipmentId || 'DEMO123'}`;
    if (shipment) {
        const queryParams = new URLSearchParams({
            orderId: shipment.orderId,
            receiverName: shipment.receiverName || '',
            agent: shipment.agent || '',
        });
        trackingUrl += `?${queryParams.toString()}`;
    }

    const shareUrl = `${BACKEND_URL}/track/${shipmentId || 'DEMO123'}`;

    async function handleShare() {
        try {
            await Share.share({
                message: `Track your package with ChainDeliver!\n\nShipment ID: ${shipmentId}\nTracking URL: ${shareUrl}`,
                title: 'Track Your Shipment',
            });
        } catch (e) {
            Alert.alert('Share Failed', 'Unable to share at this time.');
        }
    }

    return (
        <View style={styles.root}>
            {/* Header */}
            <LinearGradient colors={['#0F1729', '#111827']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>QR Code</Text>
                    <Text style={styles.sub}>Share with your customer or agent</Text>
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* QR Card */}
                <View style={styles.qrCard}>
                    <View style={styles.qrWrap}>
                        <QRCode
                            value={trackingUrl}
                            size={220}
                            backgroundColor="#FFFFFF"
                            color="#0A0E1A"
                        />
                    </View>
                    <Text style={styles.qrSub}>Scan to track shipment</Text>
                </View>

                {/* Shipment info */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="cube-outline" size={16} color={Colors.primary} />
                        <Text style={styles.infoLabel}>Shipment ID</Text>
                        <Text style={styles.infoValue} selectable>{shipmentId || '—'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="link-outline" size={16} color={Colors.textMuted} />
                        <Text style={styles.infoLabel}>Track URL</Text>
                        <Text style={styles.infoValue} selectable numberOfLines={1}>{shareUrl}</Text>
                    </View>
                </View>

                {/* OTP display if available */}
                {otp ? (
                    <View style={styles.otpCard}>
                        <Text style={styles.otpTitle}>🔑 Customer OTP</Text>
                        <Text style={styles.otpValue}>{otp}</Text>
                        <Text style={styles.otpHint}>
                            Share this OTP with your customer. They must provide it to the delivery agent at handoff.
                        </Text>
                    </View>
                ) : null}

                {/* Instructions */}
                <View style={styles.instructionsCard}>
                    <Text style={styles.instructionsTitle}>Instructions</Text>
                    {[
                        '1. Share this QR code or the Shipment ID with your customer.',
                        '2. Share the OTP separately (not with the agent — only to the customer).',
                        '3. The agent will scan the QR or enter the Shipment ID to start delivery.',
                        '4. At delivery, the customer provides the OTP to the agent.',
                        '5. The agent confirms delivery on the blockchain.',
                    ].map((step, i) => (
                        <Text key={i} style={styles.instructionStep}>{step}</Text>
                    ))}
                </View>

                {/* Action buttons */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.shareBtnGrad}>
                            <Ionicons name="share-social-outline" size={20} color={Colors.white} />
                            <Text style={styles.shareBtnText}>Share Shipment</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.navBtn} onPress={() => router.replace('/(shipper)/dashboard' as never)}>
                        <Text style={styles.navBtnText}>View All Shipments →</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingTop: Spacing.xxxl + 10,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight, alignItems: 'center', justifyContent: 'center',
    },
    title: { ...Typography.h3, fontSize: 20 },
    sub: { ...Typography.caption, fontSize: 12 },
    content: { padding: Spacing.lg },
    qrCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
    qrWrap: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.md,
        padding: 16,
        marginBottom: Spacing.md,
    },
    qrSub: { ...Typography.bodySmall, color: Colors.textMuted, textAlign: 'center' },
    infoCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
        marginBottom: Spacing.md, gap: Spacing.sm,
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoLabel: { ...Typography.caption, width: 80, color: Colors.textMuted, textTransform: 'uppercase', fontSize: 11 },
    infoValue: { ...Typography.caption, flex: 1, fontFamily: 'monospace' },
    otpCard: {
        backgroundColor: `${Colors.warning}15`, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: `${Colors.warning}40`,
        marginBottom: Spacing.md, alignItems: 'center', gap: 6,
    },
    otpTitle: { ...Typography.body, fontWeight: '700', color: Colors.warning },
    otpValue: { fontSize: 38, fontWeight: '900', color: Colors.warning, letterSpacing: 8, fontFamily: 'monospace' },
    otpHint: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
    instructionsCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, gap: 6,
    },
    instructionsTitle: { ...Typography.h4, marginBottom: 4 },
    instructionStep: { ...Typography.bodySmall, fontSize: 13, lineHeight: 20, color: Colors.textSecondary },
    actions: { gap: Spacing.sm },
    shareBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    shareBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
    shareBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
    navBtn: { padding: Spacing.md, alignItems: 'center' },
    navBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
});
