// app/(shipper)/create.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../src/services/api';
import { BlockchainService } from '../../src/services/blockchain';
import { getStoredSession } from '../../src/services/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

type Step = 'FORM' | 'REVIEW' | 'TX';
type TxPhase = 'api' | 'sign1' | 'sign2' | 'done' | 'error';

function generateOrderId(): string {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
    return (
        <View style={styles.stepIndicator}>
            {Array.from({ length: total }).map((_, i) => (
                <View key={i} style={[styles.stepDot, i < current && styles.stepDotActive]} />
            ))}
        </View>
    );
}

function TxStep({ label, phase, done }: { label: string; phase: TxPhase; done: boolean }) {
    const spinAnim = useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        if (!done) {
            const loop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true }));
            loop.start();
            return () => loop.stop();
        }
    }, [done]);
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <View style={styles.txStepRow}>
            <View style={[styles.txStepIcon, done && styles.txStepIconDone]}>
                {done ? (
                    <Ionicons name="checkmark" size={14} color={Colors.success} />
                ) : (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="refresh" size={14} color={Colors.primary} />
                    </Animated.View>
                )}
            </View>
            <Text style={[styles.txStepLabel, done && styles.txStepLabelDone]}>{label}</Text>
        </View>
    );
}

export default function CreateShipment() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('FORM');

    // Form
    const [orderId, setOrderId] = useState(generateOrderId());
    const [receiverName, setReceiverName] = useState('');
    const [receiverEmail, setReceiverEmail] = useState('');
    const [agentAddress, setAgentAddress] = useState('');
    const [escrowEth, setEscrowEth] = useState('0.01');

    // TX
    const [txPhase, setTxPhase] = useState<TxPhase>('api');
    const [txModalVisible, setTxModalVisible] = useState(false);
    const [createdShipmentId, setCreatedShipmentId] = useState('');
    const [otp, setOtp] = useState('');
    const [txHash1, setTxHash1] = useState('');
    const [txHash2, setTxHash2] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    function validateForm(): boolean {
        if (!orderId.trim()) { Alert.alert('Missing Field', 'Order ID is required'); return false; }
        if (!receiverName.trim()) { Alert.alert('Missing Field', 'Receiver name is required'); return false; }
        if (!receiverEmail.trim() || !receiverEmail.includes('@')) { Alert.alert('Invalid Email', 'Enter a valid receiver email'); return false; }
        if (!agentAddress.trim() || agentAddress.length < 10) { Alert.alert('Invalid Agent', 'Enter a valid agent wallet address'); return false; }
        const eth = parseFloat(escrowEth);
        if (isNaN(eth) || eth <= 0) { Alert.alert('Invalid Escrow', 'Enter a valid ETH amount > 0'); return false; }
        return true;
    }

    async function handleCreateShipment() {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setStep('TX');
        setTxModalVisible(true);
        setTxPhase('api');
        setErrorMsg('');

        try {
            // Step 1 — API: Create metadata + OTP
            const session = await getStoredSession();
            const res = await ApiService.createShipmentMetadata({
                orderId: orderId.trim(),
                receiverName: receiverName.trim(),
                receiverEmail: receiverEmail.trim(),
                agentAddress: agentAddress.trim(),
                escrowAmount: escrowEth,
                shipper: session?.address || '',
            });
            setCreatedShipmentId(res.shipmentId);
            setOtp(res.otp);
            setTxPhase('sign1');

            // Step 2 — Blockchain: createShipment tx
            const tx1 = await BlockchainService.createShipment(res.orderId, res.otpHash, escrowEth);
            setTxHash1(tx1.hash);
            await BlockchainService.waitForTransaction(tx1);
            setTxPhase('sign2');

            // Step 3 — Blockchain: assignAgent tx
            const tx2 = await BlockchainService.assignAgent(res.shipmentId, agentAddress.trim());
            setTxHash2(tx2.hash);
            await BlockchainService.waitForTransaction(tx2);

            // Update metadata with txHash
            await ApiService.updateShipment(res.shipmentId, { txHash: tx1.hash });

            setTxPhase('done');
            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            Toast.show({ type: 'success', text1: '🎉 Shipment Created!', text2: `OTP: ${res.otp}` });
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Transaction failed');
            setTxPhase('error');
            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        }
    }

    const txSteps = [
        { label: 'Calling backend API & generating OTP', done: txPhase !== 'api' },
        { label: 'Sign TX #1 — createShipment + escrow', done: txPhase === 'sign2' || txPhase === 'done' },
        { label: 'Sign TX #2 — assignAgent', done: txPhase === 'done' },
    ];

    return (
        <View style={styles.root}>
            {/* Header */}
            <LinearGradient colors={['#0F1729', '#111827']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Create Shipment</Text>
                    <Text style={styles.headerSub}>On-chain escrow + agent assignment</Text>
                </View>
                <StepIndicator current={step === 'FORM' ? 1 : 2} total={2} />
            </LinearGradient>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {step === 'FORM' && (
                        <>
                            {/* Order ID */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>ORDER ID</Text>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={orderId}
                                        onChangeText={setOrderId}
                                        placeholder="ORD-ABC123..."
                                        placeholderTextColor={Colors.textMuted}
                                        autoCapitalize="characters"
                                    />
                                    <TouchableOpacity style={styles.genBtn} onPress={() => setOrderId(generateOrderId())}>
                                        <Ionicons name="refresh" size={18} color={Colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Receiver info */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>RECEIVER NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    value={receiverName}
                                    onChangeText={setReceiverName}
                                    placeholder="John Smith"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>RECEIVER EMAIL</Text>
                                <TextInput
                                    style={styles.input}
                                    value={receiverEmail}
                                    onChangeText={setReceiverEmail}
                                    placeholder="john@example.com"
                                    placeholderTextColor={Colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Agent */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>DELIVERY AGENT ADDRESS</Text>
                                <TextInput
                                    style={styles.input}
                                    value={agentAddress}
                                    onChangeText={setAgentAddress}
                                    placeholder="0x..."
                                    placeholderTextColor={Colors.textMuted}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <Text style={styles.fieldHint}>Must be a wallet authorized as AGENT_ROLE</Text>
                            </View>

                            {/* Escrow */}
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>ESCROW AMOUNT (ETH)</Text>
                                <View style={styles.inputRow}>
                                    <Ionicons name="diamond-outline" size={18} color={Colors.primary} style={{ marginLeft: Spacing.md }} />
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0 }]}
                                        value={escrowEth}
                                        onChangeText={setEscrowEth}
                                        placeholder="0.01"
                                        placeholderTextColor={Colors.textMuted}
                                        keyboardType="decimal-pad"
                                    />
                                    <Text style={styles.ethSuffix}>ETH</Text>
                                </View>
                                <Text style={styles.fieldHint}>This amount is locked until delivery is confirmed</Text>
                            </View>

                            {/* Summary before review */}
                            <TouchableOpacity
                                style={styles.reviewBtn}
                                onPress={() => { if (validateForm()) setStep('REVIEW'); }}
                            >
                                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.reviewBtnGrad}>
                                    <Text style={styles.reviewBtnText}>Review & Submit</Text>
                                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'REVIEW' && (
                        <>
                            <View style={styles.summaryCard}>
                                <Text style={styles.summaryTitle}>📦 Shipment Summary</Text>
                                {[
                                    { label: 'Order ID', value: orderId },
                                    { label: 'Receiver', value: receiverName },
                                    { label: 'Email', value: receiverEmail },
                                    { label: 'Agent', value: `${agentAddress.slice(0, 10)}...${agentAddress.slice(-6)}` },
                                    { label: 'Escrow', value: `${escrowEth} ETH` },
                                    { label: 'Network', value: 'Ethereum Sepolia' },
                                ].map((row) => (
                                    <View key={row.label} style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>{row.label}</Text>
                                        <Text style={styles.summaryValue}>{row.value}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.warningBox}>
                                <Ionicons name="information-circle-outline" size={16} color={Colors.warning} />
                                <Text style={styles.warningText}>
                                    Two wallet signatures required. Do not close app during transaction.
                                </Text>
                            </View>

                            <TouchableOpacity style={styles.reviewBtn} onPress={handleCreateShipment}>
                                <LinearGradient colors={[Colors.success, '#059669']} style={styles.reviewBtnGrad}>
                                    <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                                    <Text style={styles.reviewBtnText}>Create & Fund Escrow</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.editBtn} onPress={() => setStep('FORM')}>
                                <Text style={styles.editBtnText}>← Edit Details</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* TX Progress Modal */}
            <Modal visible={txModalVisible} transparent animationType="slide">
                <View style={styles.overlay}>
                    <View style={styles.txModal}>
                        <LinearGradient colors={['#0F1729', '#111827']} style={styles.txModalGrad}>
                            <View style={styles.txHeader}>
                                <Ionicons
                                    name={txPhase === 'done' ? 'checkmark-circle' : txPhase === 'error' ? 'close-circle' : 'cube-outline'}
                                    size={28}
                                    color={txPhase === 'done' ? Colors.success : txPhase === 'error' ? Colors.error : Colors.primary}
                                />
                                <Text style={styles.txTitle}>
                                    {txPhase === 'done' ? '✅ Shipment Created!' : txPhase === 'error' ? '❌ Failed' : 'Confirming on Blockchain...'}
                                </Text>
                            </View>

                            {txSteps.map((s, i) => (
                                <TxStep key={i} label={s.label} phase={txPhase} done={s.done} />
                            ))}

                            {txPhase === 'error' && (
                                <View style={styles.errBox}>
                                    <Text style={styles.errText}>{errorMsg}</Text>
                                </View>
                            )}

                            {txHash1 !== '' && (
                                <View style={styles.txHashBox}>
                                    <Text style={styles.txHashLabel}>TX #1 Hash</Text>
                                    <Text style={styles.txHashValue} numberOfLines={1}>{txHash1}</Text>
                                </View>
                            )}

                            {txPhase === 'done' && (
                                <>
                                    <View style={styles.otpBox}>
                                        <Text style={styles.otpLabel}>🔑 Customer OTP (share with receiver)</Text>
                                        <Text style={styles.otpValue}>{otp}</Text>
                                        <Text style={styles.otpHint}>The customer must provide this to the agent at delivery</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.doneBtn}
                                        onPress={() => {
                                            setTxModalVisible(false);
                                            router.push({ pathname: '/(shipper)/qrcode', params: { shipmentId: createdShipmentId, otp } } as never);
                                        }}
                                    >
                                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.doneBtnGrad}>
                                            <Text style={styles.doneBtnText}>View QR Code</Text>
                                            <Ionicons name="qr-code-outline" size={18} color={Colors.white} />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            )}

                            {txPhase === 'error' && (
                                <TouchableOpacity style={styles.closeBtn} onPress={() => { setTxModalVisible(false); setStep('REVIEW'); }}>
                                    <Text style={styles.closeBtnText}>Close & Retry</Text>
                                </TouchableOpacity>
                            )}
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
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
    headerTitle: { ...Typography.h3, fontSize: 20 },
    headerSub: { ...Typography.caption, fontSize: 12 },
    stepIndicator: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
    stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
    stepDotActive: { backgroundColor: Colors.primary, width: 20 },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg, paddingBottom: 60 },
    fieldGroup: { marginBottom: Spacing.md },
    label: {
        fontSize: 11, fontWeight: '700', color: Colors.textMuted,
        letterSpacing: 0.8, marginBottom: Spacing.xs, textTransform: 'uppercase',
    },
    input: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border, fontSize: 15,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border,
    },
    genBtn: {
        width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
        borderLeftWidth: 1, borderLeftColor: Colors.border,
    },
    ethSuffix: { paddingRight: Spacing.md, color: Colors.textMuted, fontWeight: '600' },
    fieldHint: { ...Typography.caption, marginTop: 4, color: Colors.textMuted, fontSize: 11 },
    reviewBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.sm },
    reviewBtnGrad: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingVertical: Spacing.md + 2,
    },
    reviewBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
    editBtn: { padding: Spacing.md, alignItems: 'center' },
    editBtnText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
    summaryCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, gap: 10,
    },
    summaryTitle: { ...Typography.h4, marginBottom: 4 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryLabel: { ...Typography.caption, width: 70, color: Colors.textMuted, textTransform: 'uppercase', fontSize: 11 },
    summaryValue: { ...Typography.caption, flex: 1, fontFamily: 'monospace', fontSize: 13 },
    warningBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: `${Colors.warning}15`, borderRadius: BorderRadius.md,
        padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.warning}30`, marginBottom: Spacing.md,
    },
    warningText: { ...Typography.caption, flex: 1, color: Colors.warning },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    txModal: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.lg },
    txModalGrad: { padding: Spacing.lg, paddingBottom: 40 },
    txHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
    txTitle: { ...Typography.h3, fontSize: 18, flex: 1 },
    txStepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    txStepIcon: {
        width: 26, height: 26, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    txStepIconDone: { borderColor: Colors.success, backgroundColor: `${Colors.success}15` },
    txStepLabel: { ...Typography.body, fontSize: 14, color: Colors.textSecondary },
    txStepLabelDone: { color: Colors.success },
    otpBox: {
        backgroundColor: `${Colors.warning}15`, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: `${Colors.warning}40`,
        marginTop: Spacing.md, alignItems: 'center', gap: 6,
    },
    otpLabel: { ...Typography.caption, color: Colors.warning, fontWeight: '600', textAlign: 'center' },
    otpValue: { fontSize: 36, fontWeight: '900', color: Colors.warning, letterSpacing: 6, fontFamily: 'monospace' },
    otpHint: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', fontSize: 11 },
    doneBtn: { marginTop: Spacing.lg, borderRadius: BorderRadius.lg, overflow: 'hidden' },
    doneBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
    doneBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
    errBox: { backgroundColor: `${Colors.error}15`, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm },
    errText: { ...Typography.caption, color: Colors.error },
    txHashBox: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.sm, marginTop: Spacing.sm },
    txHashLabel: { ...Typography.label, marginBottom: 2 },
    txHashValue: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
    closeBtn: { padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
    closeBtnText: { color: Colors.error, fontWeight: '600' },
});
