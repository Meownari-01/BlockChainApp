// app/(agent)/deliver/[id].tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
    Linking,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../../src/services/api';
import { BlockchainService } from '../../../src/services/blockchain';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../../src/constants/theme';
import { uploadDeliveryPhoto, updateDeliveryStatus } from '../../../src/services/deliveryService';
import { generateDeliveryHash } from '../../../src/utils/cryptoUtils';

type DeliveryStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ['OTP Entry', 'Photo', 'Signature', 'GPS', 'Confirm'];

function StepHeader({ current }: { current: DeliveryStep | 0 }) {
    if (current === 0) return null; // Don't show progress steps until delivery is started
    return (
        <View style={styles.stepHeader}>
            {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <React.Fragment key={label}>
                        <View style={styles.stepItem}>
                            <View style={[styles.stepCircle, done && styles.stepCircleDone, active && styles.stepCircleActive]}>
                                {done
                                    ? <Ionicons name="checkmark" size={12} color={Colors.white} />
                                    : <Text style={[styles.stepNum, active && { color: Colors.white }]}>{n}</Text>}
                            </View>
                            <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
                        </View>
                        {i < STEP_LABELS.length - 1 && (
                            <View style={[styles.stepLine, done && styles.stepLineDone]} />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

export default function DeliverScreen() {
    const router = useRouter();
    const { id: shipmentId } = useLocalSearchParams<{ id: string }>();

    const [shipment, setShipment] = useState<any>(null);
    const [loadingShipment, setLoadingShipment] = useState(true);

    useEffect(() => {
        if (!shipmentId) return;
        ApiService.getShipment(shipmentId as string)
            .then(data => {
                setShipment(data);
                // If it's still created, we start at step 0 (Start Delivery)
                if (data.status === 'Created') {
                    setStep(0);
                } else {
                    setStep(1);
                }
            })
            .catch(err => {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load shipment' });
            })
            .finally(() => setLoadingShipment(false));
    }, [shipmentId]);

    const [step, setStep] = useState<DeliveryStep | 0>(1);

    // Step 1 — OTP
    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');

    // Step 2 — Camera
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [photoUri, setPhotoUri] = useState('');
    const cameraRef = useRef<CameraView>(null);
    const captureAnim = useRef(new Animated.Value(1)).current;

    // Step 3 — Signature
    const [signatureUri, setSignatureUri] = useState('');

    // Step 4 — GPS
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [locationStatus, setLocationStatus] = useState<'acquiring' | 'accurate' | 'error'>('acquiring');

    // Step 5 — Submit
    const [submitting, setSubmitting] = useState(false);
    const [txPhase, setTxPhase] = useState<'idle' | 'upload' | 'hash' | 'sign' | 'broadcast' | 'confirm' | 'done' | 'error'>('idle');
    const [txHash, setTxHash] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [escrowReleased, setEscrowReleased] = useState('');

    useEffect(() => {
        if (step === 4) startGpsAcquisition();
    }, [step]);

    // --- Step 1: OTP ---
    function handleOtpNext() {
        if (!/^\d{6}$/.test(otp)) {
            setOtpError('OTP must be exactly 6 digits.');
            return;
        }
        setOtpError('');
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setStep(2);
    }

    // --- Step 2: Camera ---
    async function handleCapture() {
        if (!cameraRef.current) return;
        Animated.sequence([
            Animated.timing(captureAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
            Animated.timing(captureAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        try {
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            if (photo?.uri) {
                setPhotoUri(photo.uri);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        } catch {
            Toast.show({ type: 'error', text1: 'Camera Error', text2: 'Failed to capture photo.' });
        }
    }

    // --- Step 4: GPS ---
    async function startGpsAcquisition() {
        setLocationStatus('acquiring');
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { setLocationStatus('error'); return; }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            setLocation(loc);
            setLocationStatus('accurate');

            // --- REAL-TIME TRACKING INJECTION ---
            // Periodically update the global shipment GPS location while the agent is active
            const updateLoc = async (l: Location.LocationObject) => {
                const gpsStr = `${l.coords.latitude.toFixed(6)},${l.coords.longitude.toFixed(6)}`;
                await ApiService.updateShipment(shipmentId!, { gpsLocation: gpsStr });
            };
            updateLoc(loc); // Initial update
            // ------------------------------------

            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch {
            setLocationStatus('error');
        }
    }

    // --- Step 5: Submit ---
    async function handleConfirmDelivery() {
        if (!location) { Alert.alert('GPS Required', 'GPS location is required.'); return; }
        if (!photoUri) { Alert.alert('Photo Required', 'Photo is required.'); return; }

        setSubmitting(true);
        setErrorMsg('');

        try {
            // 1. Upload photo to Firebase Storage
            setTxPhase('upload');
            const { url: photoUrl } = await ApiService.uploadToIPFS(photoUri);
            if (!photoUrl) throw new Error('Photo upload failed');

            // 2. Generate Blockchain Hash (SHA256)
            setTxPhase('hash');
            const gpsString = `${location.coords.latitude.toFixed(6)},${location.coords.longitude.toFixed(6)}`;
            const deliveryData = {
                shipmentId,
                photoUrl,
                gpsLocation: gpsString,
                timestamp: new Date().toISOString(),
                otp
            };
            const deliveryHash = generateDeliveryHash(deliveryData);
            await new Promise((r) => setTimeout(r, 800));

            // 3. Sign & broadcast (Interaction with contract)
            setTxPhase('sign');
            const tx = await BlockchainService.confirmDelivery(
                shipmentId!,
                gpsString,
                deliveryHash, 
                otp,
            );
            setTxHash(tx.hash);
            setTxPhase('broadcast');

            // 4. Wait for confirmation
            setTxPhase('confirm');
            await BlockchainService.waitForTransaction(tx);

            // 5. Update Firestore metadata directly
            await ApiService.updateShipment(shipmentId!, {
                status: 'Delivered',
                deliveryTxHash: tx.hash,
                photoUrl: photoUrl,
                gpsLocation: gpsString,
                deliveredAt: new Date().toISOString(),
                blockchainHash: deliveryHash
            });

            setTxPhase('done');
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Transaction failed');
            setTxPhase('error');
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
        } finally {
            setSubmitting(false);
        }
    }

    const gpsString = location
        ? `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
        : null;

    return (
        <View style={styles.root}>
            {/* Header */}
            <LinearGradient colors={['#0F1729', '#111827']} style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Confirm Delivery</Text>
                    <Text style={styles.headerSub} numberOfLines={1}>ID: {shipmentId}</Text>
                </View>
            </LinearGradient>

            <StepHeader current={step as DeliveryStep | 0} />

            {/* ===== STEP 0: START DELIVERY ===== */}
            {step === 0 && (
                <View style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.stepContent}>
                        <View style={styles.stepCard}>
                            <View style={styles.stepIconWrap}>
                                <Ionicons name="bicycle-outline" size={64} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>Ready to Deliver?</Text>
                            <Text style={styles.stepDesc}>
                                You are at the pickup location. Tap below to broadcast the start on-chain and begin the delivery process.
                            </Text>
                            <TouchableOpacity
                                style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
                                onPress={async () => {
                                    setSubmitting(true);
                                    try {
                                        if (Platform.OS !== 'web') {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        }
                                        const tx = await BlockchainService.markOutForDelivery(shipmentId as string);
                                        Toast.show({ type: 'info', text1: 'Broadcasting...', text2: 'Waiting for blockchain confirmation' });
                                        await BlockchainService.waitForTransaction(tx);
                                        await ApiService.updateShipment(shipmentId as string, { status: 'OutForDelivery' });
                                        Toast.show({ type: 'success', text1: '📦 Started!', text2: 'Delivery is now in transit.' });
                                        setStep(1);
                                    } catch (err: any) {
                                        Toast.show({ type: 'error', text1: 'Failed to start', text2: err.message });
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                disabled={submitting}
                            >
                                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtnGrad}>
                                    {submitting ? (
                                        <ActivityIndicator size="small" color={Colors.white} />
                                    ) : (
                                        <>
                                            <Text style={styles.nextBtnText}>Start Delivery</Text>
                                            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* ===== STEP 1: OTP ===== */}
            {step === 1 && (
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.stepContent}>
                        <View style={styles.stepCard}>
                            <View style={styles.stepIconWrap}>
                                <Ionicons name="keypad-outline" size={40} color={Colors.primary} />
                            </View>
                            <Text style={styles.stepTitle}>Customer OTP</Text>
                            <Text style={styles.stepDesc}>
                                Ask the customer for their 6-digit OTP. Enter it here to prove physical handoff.
                            </Text>
                            
                            <TouchableOpacity 
                                style={{
                                    backgroundColor: `${Colors.primary}15`,
                                    padding: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: `${Colors.primary}40`
                                }}
                                onPress={() => {
                                    Toast.show({
                                        type: 'success',
                                        text1: 'OTP Sent',
                                        text2: `A notification was sent to the customer's email at ${shipment?.receiverEmail}.`
                                    });
                                }}
                            >
                                <Text style={{ color: Colors.primary, fontWeight: '600' }}>
                                    <Ionicons name="mail" size={14} /> Send OTP SMS/Email
                                </Text>
                            </TouchableOpacity>

                            <TextInput
                                style={styles.otpInput}
                                value={otp}
                                onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                                keyboardType="number-pad"
                                placeholder="• • • • • •"
                                placeholderTextColor={Colors.textMuted}
                                maxLength={6}
                                textAlign="center"
                            />
                            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
                            <TouchableOpacity
                                style={[styles.nextBtn, otp.length !== 6 && styles.nextBtnDisabled]}
                                onPress={handleOtpNext}
                                disabled={otp.length !== 6}
                            >
                                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtnGrad}>
                                    <Text style={styles.nextBtnText}>Continue</Text>
                                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* ===== STEP 2: CAMERA ===== */}
            {step === 2 && (
                <View style={{ flex: 1 }}>
                    {!cameraPermission?.granted ? (
                        <View style={styles.permissionWrap}>
                            <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.permissionText}>Camera access is required to capture delivery proof.</Text>
                            <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
                                <Text style={styles.permissionBtnText}>Grant Camera Access</Text>
                            </TouchableOpacity>
                        </View>
                    ) : photoUri ? (
                        // Preview
                        <View style={styles.previewWrap}>
                            <Text style={styles.previewLabel}>📸 Photo Captured</Text>
                            <View style={styles.previewPlaceholder}>
                                <Ionicons name="image" size={64} color={Colors.primary} />
                                <Text style={styles.previewUri} numberOfLines={2}>{photoUri}</Text>
                            </View>
                            <View style={styles.photoActions}>
                                <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhotoUri('')}>
                                    <Text style={styles.retakeBtnText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.usePhotoBtn} onPress={() => setStep(3)}>
                                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.usePhotoBtnGrad}>
                                        <Ionicons name="checkmark" size={18} color={Colors.white} />
                                        <Text style={styles.usePhotoBtnText}>Use Photo</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        // Camera
                        <View style={{ flex: 1 }}>
                            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} flash={flash}>
                                {/* Frame overlay */}
                                <View style={styles.cameraOverlay}>
                                    <View style={styles.frameGuide} />
                                    <Text style={styles.cameraTip}>Position package within frame</Text>
                                </View>
                                {/* Controls */}
                                <View style={styles.cameraControls}>
                                    <TouchableOpacity style={styles.camControlBtn} onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}>
                                        <Ionicons name={flash === 'on' ? 'flash' : 'flash-off-outline'} size={22} color={Colors.white} />
                                    </TouchableOpacity>

                                    <Animated.View style={{ transform: [{ scale: captureAnim }] }}>
                                        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
                                            <View style={styles.captureBtnInner} />
                                        </TouchableOpacity>
                                    </Animated.View>

                                    <TouchableOpacity style={styles.camControlBtn} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                                        <Ionicons name="camera-reverse-outline" size={22} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>
                            </CameraView>
                        </View>
                    )}
                </View>
            )}

            {/* ===== STEP 3: SIGNATURE ===== */}
            {step === 3 && (
                <View style={styles.stepContent}>
                    <View style={styles.stepCard}>
                        <View style={styles.stepIconWrap}>
                            <Ionicons name="pencil" size={40} color={Colors.primary} />
                        </View>
                        <Text style={styles.stepTitle}>Customer Signature</Text>
                        <Text style={styles.stepDesc}>Ask the receiver to sign here.</Text>
                        
                        <View style={styles.signaturePad}>
                            {/* In a real app, use react-native-signature-canvas here */}
                            <Text style={{ fontSize: 48 }}>✏️</Text>
                            <Text style={styles.signaturePlaceholder}>Signature Area</Text>
                        </View>

                        <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(4)}>
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtnGrad}>
                                <Text style={styles.nextBtnText}>Save Signature</Text>
                                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ===== STEP 4: GPS ===== */}
            {step === 4 && (
                <ScrollView contentContainerStyle={styles.stepContent}>
                    <View style={styles.stepCard}>
                        <View style={styles.stepIconWrap}>
                            <Ionicons
                                name="location"
                                size={40}
                                color={locationStatus === 'accurate' ? Colors.success : locationStatus === 'error' ? Colors.error : Colors.warning}
                            />
                        </View>
                        <Text style={styles.stepTitle}>GPS Verification</Text>
                        <View style={styles.gpsStatusRow}>
                            <View style={[styles.statusDot, {
                                backgroundColor: locationStatus === 'accurate' ? Colors.success : locationStatus === 'error' ? Colors.error : Colors.warning,
                            }]} />
                            <Text style={styles.gpsStatusText}>
                                {locationStatus === 'accurate' ? '✓ Location Accurate'
                                    : locationStatus === 'error' ? '✗ Location Error'
                                        : 'Acquiring location...'}
                            </Text>
                        </View>

                        {gpsString ? (
                            <View style={styles.coordBox}>
                                <Text style={styles.coordLabel}>Coordinates</Text>
                                <Text style={styles.coordValue}>{gpsString}</Text>
                                {location?.coords.accuracy && (
                                    <Text style={styles.coordAccuracy}>±{location.coords.accuracy.toFixed(1)}m accuracy</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.coordBox}>
                                <Text style={styles.coordLabel}>Coordinates</Text>
                                <Text style={[styles.coordValue, { color: Colors.error }]}>Map Error</Text>
                                <Text style={styles.coordAccuracy}>Ensure location services are enabled.</Text>
                            </View>
                        )}

                        {locationStatus === 'error' && (
                            <TouchableOpacity style={styles.retryBtn} onPress={startGpsAcquisition}>
                                <Text style={styles.retryBtnText}>Retry GPS</Text>
                            </TouchableOpacity>
                        )}

                        {locationStatus === 'acquiring' && <ActivityIndicator color={Colors.warning} style={{ marginTop: Spacing.md }} />}

                        {locationStatus === 'accurate' && (
                            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(5)}>
                                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtnGrad}>
                                    <Text style={styles.nextBtnText}>Looks Good</Text>
                                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            )}

            {/* ===== STEP 5: BLOCKCHAIN SUBMISSION ===== */}
            {step === 5 && (
                <ScrollView contentContainerStyle={styles.stepContent}>
                    <View style={styles.stepCard}>
                        {txPhase === 'done' ? (
                            <>
                                {/* Success state */}
                                <View style={styles.successIcon}>
                                    <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
                                </View>
                                <Text style={[styles.stepTitle, { color: Colors.success }]}>Delivery Confirmed! 🎉</Text>
                                {escrowReleased && (
                                    <View style={styles.escrowBadge}>
                                        <Ionicons name="diamond" size={16} color={Colors.warning} />
                                        <Text style={styles.escrowText}>Escrow Released: {escrowReleased} ETH</Text>
                                    </View>
                                )}
                                {txHash && (
                                    <TouchableOpacity
                                        style={styles.txHashBtn}
                                        onPress={() => Linking.openURL(BlockchainService.getSepoliaEtherscanUrl(txHash))}
                                    >
                                        <Text style={styles.txHashLabel}>Transaction Hash</Text>
                                        <Text style={styles.txHashValue} numberOfLines={1}>{txHash}</Text>
                                        <Text style={styles.txHashLink}>View on Etherscan →</Text>
                                    </TouchableOpacity>
                                )}
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="shield-checkmark" size={16} color={Colors.primary} />
                                    <Text style={styles.verifiedText}>This delivery is cryptographically verified on Sepolia.</Text>
                                </View>
                                <TouchableOpacity style={styles.doneBtn} onPress={() => router.replace('/(agent)/dashboard' as never)}>
                                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextBtnGrad}>
                                        <Text style={styles.nextBtnText}>Back to Deliveries</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : txPhase === 'error' ? (
                            <>
                                <View style={styles.stepIconWrap}>
                                    <Ionicons name="close-circle" size={40} color={Colors.error} />
                                </View>
                                <Text style={[styles.stepTitle, { color: Colors.error }]}>Transaction Failed</Text>
                                <View style={styles.errBox}>
                                    <Text style={styles.errText}>{errorMsg}</Text>
                                </View>
                                <TouchableOpacity style={styles.nextBtn} onPress={() => { setTxPhase('idle'); setErrorMsg(''); }}>
                                    <LinearGradient colors={[Colors.error, '#DC2626']} style={styles.nextBtnGrad}>
                                        <Text style={styles.nextBtnText}>Try Again</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                {/* Summary + progress */}
                                <Text style={styles.stepTitle}>Blockchain Submission</Text>
                                <Text style={styles.stepDesc}>Review and confirm your delivery proof on-chain.</Text>

                                {/* Proof summary */}
                                <View style={styles.proofSummary}>
                                    {[
                                        { icon: 'keypad-outline', label: 'OTP', value: '✓ Verified', color: Colors.success },
                                        { icon: 'camera-outline', label: 'Photo', value: photoUri ? '✓ Captured' : '✗ Missing', color: photoUri ? Colors.success : Colors.error },
                                        { icon: 'pencil-outline', label: 'Signature', value: '✓ Signed', color: Colors.success },
                                        { icon: 'location-outline', label: 'GPS', value: gpsString || 'Pending', color: Colors.success },
                                    ].map((item) => (
                                        <View key={item.label} style={styles.proofRow}>
                                            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.color} />
                                            <Text style={styles.proofLabel}>{item.label}</Text>
                                            <Text style={[styles.proofValue, { color: item.color }]}>{item.value}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Progress steps */}
                                {txPhase !== 'idle' && (
                                    <View style={styles.txProgress}>
                                        {[
                                            { ph: 'upload', label: '⬆️ Uploading photo to IPFS...' },
                                            { ph: 'hash', label: '🔐 Computing hashes...' },
                                            { ph: 'sign', label: '✍️ Awaiting wallet signature...' },
                                            { ph: 'broadcast', label: '📡 Broadcasting transaction...' },
                                            { ph: 'confirm', label: '⏳ Waiting for confirmation...' },
                                        ].map((s) => {
                                            const phases = ['upload', 'hash', 'sign', 'broadcast', 'confirm', 'done'];
                                            const currentIdx = phases.indexOf(txPhase);
                                            const thisDone = phases.indexOf(s.ph) < currentIdx;
                                            const isActive = s.ph === txPhase;
                                            return (
                                                <View key={s.ph} style={styles.txProgressRow}>
                                                    {thisDone
                                                        ? <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                                        : isActive
                                                            ? <ActivityIndicator size="small" color={Colors.primary} />
                                                            : <Ionicons name="ellipse-outline" size={16} color={Colors.textMuted} />
                                                    }
                                                    <Text style={[styles.txProgressLabel, thisDone && { color: Colors.success }]}>{s.label}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                {txPhase === 'idle' && (
                                    <TouchableOpacity
                                        style={[styles.nextBtn, submitting && { opacity: 0.6 }]}
                                        onPress={handleConfirmDelivery}
                                        disabled={submitting}
                                    >
                                        <LinearGradient colors={[Colors.success, '#059669']} style={styles.nextBtnGrad}>
                                            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                                            <Text style={styles.nextBtnText}>Confirm Delivery on Blockchain</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            )}
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
    headerSub: { ...Typography.caption, fontSize: 11, color: Colors.textMuted },
    stepHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    stepItem: { alignItems: 'center', gap: 3 },
    stepCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceLight },
    stepCircleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    stepCircleDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    stepNum: { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
    stepLabel: { ...Typography.caption, fontSize: 10, color: Colors.textMuted },
    stepLabelActive: { color: Colors.primary, fontWeight: '700' },
    stepLine: { flex: 1, height: 1.5, backgroundColor: Colors.border, marginHorizontal: 4, marginBottom: 10 },
    stepLineDone: { backgroundColor: Colors.success },
    stepContent: { padding: Spacing.lg, paddingBottom: 60 },
    stepCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border, ...Shadows.md, gap: Spacing.md },
    stepIconWrap: { alignItems: 'center' },
    stepTitle: { ...Typography.h2, textAlign: 'center' },
    stepDesc: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 22 },
    otpInput: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, fontSize: 32, fontWeight: '800', letterSpacing: 12, color: Colors.text, borderWidth: 1.5, borderColor: Colors.primary, fontFamily: 'monospace' },
    errorText: { color: Colors.error, fontSize: 13, textAlign: 'center' },
    nextBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
    permissionWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
    permissionText: { ...Typography.body, textAlign: 'center', color: Colors.textSecondary },
    permissionBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
    permissionBtnText: { color: Colors.white, fontWeight: '700' },
    previewWrap: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
    previewLabel: { ...Typography.h4, textAlign: 'center' },
    previewPlaceholder: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, gap: 8 },
    previewUri: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.lg },
    photoActions: { flexDirection: 'row', gap: Spacing.md },
    retakeBtn: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    retakeBtnText: { color: Colors.text, fontWeight: '600' },
    usePhotoBtn: { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
    usePhotoBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: Spacing.md },
    usePhotoBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
    cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    frameGuide: { width: 240, height: 180, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
    cameraTip: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
    cameraControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: Spacing.xl, backgroundColor: 'rgba(0,0,0,0.6)' },
    camControlBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
    captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.white },
    gpsStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    gpsStatusText: { ...Typography.body, fontWeight: '600' },
    coordBox: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 4 },
    coordLabel: { ...Typography.label, textTransform: 'uppercase' },
    coordValue: { fontFamily: 'monospace', fontSize: 15, color: Colors.success, fontWeight: '700' },
    coordAccuracy: { ...Typography.caption, color: Colors.textMuted },
    retryBtn: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
    retryBtnText: { color: Colors.primary, fontWeight: '600' },
    proofSummary: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, gap: 10, borderWidth: 1, borderColor: Colors.border },
    proofRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    proofLabel: { ...Typography.body, fontSize: 14, flex: 1 },
    proofValue: { fontWeight: '700', fontSize: 13 },
    txProgress: { gap: Spacing.sm },
    txProgressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    txProgressLabel: { ...Typography.body, fontSize: 13, color: Colors.textSecondary },
    successIcon: { alignItems: 'center' },
    escrowBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', backgroundColor: `${Colors.warning}15`, borderRadius: BorderRadius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: `${Colors.warning}40` },
    escrowText: { color: Colors.warning, fontWeight: '700' },
    txHashBtn: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: 4 },
    txHashLabel: { ...Typography.label },
    txHashValue: { fontFamily: 'monospace', fontSize: 11, color: Colors.primary },
    txHashLink: { color: Colors.primary, fontWeight: '600', fontSize: 12 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    verifiedText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
    doneBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    errBox: { backgroundColor: `${Colors.error}15`, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.error}30` },
    errText: { ...Typography.caption, color: Colors.error },
    signaturePad: {
        height: 200,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: Spacing.md,
    },
    signaturePlaceholder: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
});
