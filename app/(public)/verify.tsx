import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { getDelivery } from '@services/deliveryService';
import { BlockchainService } from '@services/blockchain';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@constants/theme';

export default function VerifyScreen() {
    const router = useRouter();
    const [deliveryId, setDeliveryId] = useState('');
    const [loading, setLoading] = useState(false);
    const [delivery, setDelivery] = useState<any>(null);

    async function handleVerify() {
        if (!deliveryId) {
            Toast.show({ type: 'error', text1: 'ID Required', text2: 'Please enter a Delivery ID.' });
            return;
        }

        setLoading(true);
        setDelivery(null);
        try {
            const { data, error } = await getDelivery(deliveryId);
            if (error) {
                Toast.show({ type: 'error', text1: 'Not Found', text2: 'No delivery record found for this ID.' });
            } else {
                setDelivery(data);
                Toast.show({ type: 'success', text1: 'Record Found!', text2: 'Verification data retrieved.' });
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to retrieve record.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.root}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verify Delivery</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Blockchain Verification</Text>
                    <Text style={styles.cardDesc}>Enter a Delivery ID to verify its immutable record on the blockchain.</Text>
                    
                    <View style={styles.inputWrap}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter Delivery ID..."
                            placeholderTextColor={Colors.textMuted}
                            value={deliveryId}
                            onChangeText={setDeliveryId}
                        />
                        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                                {loading ? <ActivityIndicator color={Colors.white} /> : <Ionicons name="search" size={20} color={Colors.white} />}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {delivery && (
                    <View style={styles.resultCard}>
                        <View style={styles.statusBadge}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                            <Text style={styles.statusText}>AUTHENTIC RECORD</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.label}>Order ID:</Text>
                            <Text style={styles.value}>{delivery.orderId}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.label}>Status:</Text>
                            <Text style={[styles.value, { color: Colors.primary, fontWeight: '700' }]}>{delivery.status}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.label}>Blockchain Hash:</Text>
                            <Text style={styles.hashValue} numberOfLines={1}>{delivery.blockchainHash || 'N/A'}</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={styles.sectionTitle}>Immutable Evidence</Text>
                        <TouchableOpacity 
                            style={styles.evidenceBtn}
                            onPress={() => delivery.photoUrl && Linking.openURL(delivery.photoUrl)}
                        >
                            <Ionicons name="image-outline" size={20} color={Colors.primary} />
                            <Text style={styles.evidenceText}>View Proof Photo</Text>
                            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                        </TouchableOpacity>

                        {delivery.deliveryTxHash && (
                            <TouchableOpacity 
                                style={styles.evidenceBtn}
                                onPress={() => Linking.openURL(BlockchainService.getSepoliaEtherscanUrl(delivery.deliveryTxHash))}
                            >
                                <Ionicons name="link-outline" size={20} color={Colors.primary} />
                                <Text style={styles.evidenceText}>View On Blockchain</Text>
                                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: { padding: Spacing.xl, paddingTop: Spacing.xxl, flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: Spacing.md },
    headerTitle: { ...Typography.h2, color: Colors.white },
    scroll: { padding: Spacing.lg },
    card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.md, marginBottom: Spacing.lg },
    cardTitle: { ...Typography.h3, marginBottom: Spacing.xs },
    cardDesc: { ...Typography.bodySmall, color: Colors.textMuted, marginBottom: Spacing.lg },
    inputWrap: { flexDirection: 'row', gap: Spacing.sm },
    input: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
    verifyBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', width: 56 },
    btnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    resultCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.md, borderLeftWidth: 4, borderLeftColor: Colors.success },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
    statusText: { fontSize: 13, fontWeight: '800', color: Colors.success, letterSpacing: 0.5 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
    label: { ...Typography.bodySmall, color: Colors.textMuted },
    value: { ...Typography.bodySmall, color: Colors.text, fontWeight: '500' },
    hashValue: { flex: 1, marginLeft: 20, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
    divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
    sectionTitle: { ...Typography.caption, fontWeight: '700', color: Colors.textMuted, marginBottom: Spacing.md, textTransform: 'uppercase' },
    evidenceBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceLight },
    evidenceText: { ...Typography.bodySmall, flex: 1, fontWeight: '600' },
});
