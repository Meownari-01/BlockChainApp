import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { ApiService } from '../../src/services/api';
import { getStoredSession } from '../../src/services/hooks/useAuth';

export default function AgentScannerScreen() {
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, [permission]);

    const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
        if (scanned || processing) return;
        setScanned(true);
        setProcessing(true);

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            // Extract shipment ID from various possible formats
            let shipmentId = '';
            let queryPart = '';

            // Handle schema URL: chaindeliver://public/status/SHIPMENT_ID
            if (data.includes('chaindeliver://public/status/')) {
                const rawPath = data.split('chaindeliver://public/status/')[1] || '';
                const parts = rawPath.split('?');
                shipmentId = parts[0] || '';
                queryPart = parts[1] || '';
            } else if (data.includes('/track/')) {
                // Handle web URL: https://.../track/SHIPMENT_ID
                const rawPath = data.split('/track/')[1] || '';
                const parts = rawPath.split('?');
                shipmentId = parts[0] || '';
                queryPart = parts[1] || '';
            } else {
                // Assume the scanned data is literally just the raw shipment ID
                shipmentId = data.trim();
            }

            if (!shipmentId) {
                throw new Error("Invalid QR Code format.");
            }

            // Verify the shipment exists and is assigned to this agent (or can be claimed)
            const shipment = await ApiService.getShipment(shipmentId);
            const session = await getStoredSession();

            if (!session?.address) {
                throw new Error("You are not logged in.");
            }

            if (shipment.agent.toLowerCase() !== session.address.toLowerCase()) {
                Alert.alert("Permission Denied", "This shipment is not assigned to you.");
                setTimeout(() => setScanned(false), 2000);
                return;
            }

            // Optional: Alert the user of the scanned shipment values found via QR or DB
            const qrParams = new URLSearchParams(queryPart || '');
            const orderId = qrParams.get('orderId') || shipment.orderId;
            const receiverName = qrParams.get('receiverName') || shipment.receiverName;

            Alert.alert(
                "Shipment Scanned",
                `Order: ${orderId}\nCustomer: ${receiverName}`,
                [
                    {
                        text: "Continue",
                        onPress: () => router.replace(`/(agent)/deliver/${shipmentId}` as never)
                    }
                ]
            );

        } catch (error: any) {
            Alert.alert("Scan Error", error.message || "Could not process QR Code.");
            // Reset scan state after 2 seconds to allow rescanning
            setTimeout(() => setScanned(false), 2000);
        } finally {
            setProcessing(false);
        }
    };

    if (!permission) {
        return <View style={styles.root} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.root}>
                <View style={styles.permissionWrap}>
                    <Ionicons name="camera-outline" size={64} color={Colors.textMuted} />
                    <Text style={styles.permissionText}>We need camera access to scan delivery QR codes.</Text>
                    <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.permissionBtnGrad}>
                            <Text style={styles.permissionBtnText}>Grant Permission</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <CameraView 
                style={StyleSheet.absoluteFillObject} 
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />
            
            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="close" size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Scan Shipment</Text>
                    <View style={styles.iconBtnPlaceholder} />
                </View>

                {/* Scan Frame */}
                <View style={styles.scanFrameWrap}>
                    <View style={styles.scanFrame} />
                    {processing ? (
                        <View style={styles.processingBadge}>
                            <Text style={styles.processingText}>Processing...</Text>
                        </View>
                    ) : (
                        <Text style={styles.scanInstruction}>Point camera at the shipment's QR code</Text>
                    )}
                </View>

                <View style={styles.footer}>
                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color={Colors.primary} />
                        <Text style={styles.infoText}>
                            Scanning the QR code verifies physical presence and allows you to start the delivery.
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.lg },
    permissionText: { ...Typography.body, textAlign: 'center', color: Colors.textSecondary },
    permissionBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', width: '100%' },
    permissionBtnGrad: { paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
    permissionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
    backBtn: { padding: Spacing.md },
    backBtnText: { color: Colors.textMuted, fontWeight: '600' },
    
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl, 
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
    iconBtnPlaceholder: { width: 40, height: 40 },
    headerTitle: { ...Typography.h3, color: Colors.white },
    
    scanFrameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
    scanFrame: { 
        width: 250, 
        height: 250, 
        borderWidth: 2, 
        borderColor: Colors.primary, 
        borderRadius: BorderRadius.xl,
        backgroundColor: 'rgba(255,255,255,0.05)',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    scanInstruction: { ...Typography.body, color: Colors.white, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' },
    processingBadge: { backgroundColor: Colors.warning, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    processingText: { color: '#000', fontWeight: '700' },
    
    footer: { padding: Spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.xl },
    infoBox: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    infoText: { ...Typography.caption, color: Colors.white, flex: 1, lineHeight: 18 },
});
