// src/components/TransactionModal.tsx
import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Animated,
    TouchableOpacity,
    ScrollView,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { TransactionStep } from '../types';

interface TransactionModalProps {
    visible: boolean;
    title?: string;
    steps: TransactionStep[];
    txHash?: string;
    escrowAmount?: string;
    onClose?: () => void;
    onDone?: () => void;
    isComplete?: boolean;
    isError?: boolean;
    errorMessage?: string;
}

const StepRow: React.FC<{ step: TransactionStep; index: number }> = ({ step, index }) => {
    const spinAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 100, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (step.status === 'loading') {
            Animated.loop(
                Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ).start();
        } else {
            spinAnim.stopAnimation();
        }
    }, [step.status]);

    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const iconAndColor = (): { icon: keyof typeof Ionicons.glyphMap; color: string } => {
        switch (step.status) {
            case 'success': return { icon: 'checkmark-circle', color: Colors.success };
            case 'error': return { icon: 'close-circle', color: Colors.error };
            case 'loading': return { icon: 'refresh', color: Colors.primary };
            default: return { icon: 'ellipse-outline', color: Colors.textMuted };
        }
    };

    const { icon, color } = iconAndColor();

    return (
        <Animated.View style={[styles.stepRow, { opacity: fadeAnim }]}>
            <View style={[styles.stepIcon, { borderColor: `${color}50` }]}>
                {step.status === 'loading' ? (
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="refresh" size={16} color={color} />
                    </Animated.View>
                ) : (
                    <Ionicons name={icon} size={16} color={color} />
                )}
            </View>
            <View style={styles.stepInfo}>
                <Text
                    style={[
                        styles.stepLabel,
                        step.status === 'success' && styles.stepLabelDone,
                        step.status === 'error' && styles.stepLabelError,
                        step.status === 'pending' && styles.stepLabelPending,
                    ]}
                >
                    {step.label}
                </Text>
                {step.detail && (
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                )}
            </View>
        </Animated.View>
    );
};

export const TransactionModal: React.FC<TransactionModalProps> = ({
    visible,
    title = 'Processing Transaction',
    steps,
    txHash,
    escrowAmount,
    onClose,
    onDone,
    isComplete = false,
    isError = false,
    errorMessage,
}) => {
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Animated.View style={[styles.sheet, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
                    <LinearGradient colors={['#0F1729', '#111827']} style={styles.gradient}>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <Ionicons
                                    name={isComplete ? 'checkmark-circle' : isError ? 'close-circle' : 'cube-outline'}
                                    size={28}
                                    color={isComplete ? Colors.success : isError ? Colors.error : Colors.primary}
                                />
                            </View>
                            <View style={styles.headerText}>
                                <Text style={styles.title}>{isComplete ? '✅ Transaction Complete!' : isError ? '❌ Transaction Failed' : title}</Text>
                                {isComplete && escrowAmount && (
                                    <Text style={styles.escrowMsg}>Escrow Released: {escrowAmount} ETH</Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Steps */}
                        <ScrollView style={styles.steps} showsVerticalScrollIndicator={false}>
                            {steps.map((step, i) => (
                                <StepRow key={step.id} step={step} index={i} />
                            ))}

                            {/* Error message */}
                            {isError && errorMessage && (
                                <View style={styles.errorBox}>
                                    <Ionicons name="warning-outline" size={16} color={Colors.error} />
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            )}

                            {/* Tx Hash */}
                            {txHash && (
                                <TouchableOpacity
                                    style={styles.txBox}
                                    onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`)}
                                >
                                    <Text style={styles.txLabel}>Transaction Hash</Text>
                                    <Text style={styles.txHash} numberOfLines={1}>{txHash}</Text>
                                    <Text style={styles.txLink}>View on Etherscan →</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>

                        {/* Footer buttons */}
                        <View style={styles.footer}>
                            {isComplete && onDone && (
                                <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
                                    <LinearGradient
                                        colors={[Colors.primary, Colors.primaryDark]}
                                        style={styles.doneBtnGrad}
                                    >
                                        <Text style={styles.doneBtnText}>Done</Text>
                                        <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                            {isError && onClose && (
                                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                                    <Text style={styles.closeBtnText}>Close</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    sheet: {
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.lg,
        maxHeight: '80%',
    },
    gradient: {
        padding: Spacing.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        ...Typography.h3,
        fontSize: 17,
    },
    escrowMsg: {
        ...Typography.caption,
        color: Colors.success,
        marginTop: 2,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.border,
        marginBottom: Spacing.md,
    },
    steps: {
        maxHeight: 300,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    stepIcon: {
        width: 28,
        height: 28,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        backgroundColor: Colors.surface,
    },
    stepInfo: {
        flex: 1,
        paddingTop: 4,
    },
    stepLabel: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.text,
    },
    stepLabelDone: {
        color: Colors.success,
    },
    stepLabelError: {
        color: Colors.error,
    },
    stepLabelPending: {
        color: Colors.textMuted,
    },
    stepDetail: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: 2,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: `${Colors.error}15`,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: `${Colors.error}30`,
        marginTop: Spacing.sm,
    },
    errorText: {
        ...Typography.caption,
        color: Colors.error,
        flex: 1,
    },
    txBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginTop: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    txLabel: {
        ...Typography.label,
        marginBottom: 4,
    },
    txHash: {
        ...Typography.mono,
        fontSize: 11,
        color: Colors.primary,
        marginBottom: 4,
    },
    txLink: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '600',
    },
    footer: {
        marginTop: Spacing.md,
    },
    doneBtn: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    doneBtnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    doneBtnText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
    closeBtn: {
        padding: Spacing.md,
        alignItems: 'center',
    },
    closeBtnText: {
        ...Typography.body,
        color: Colors.error,
        fontWeight: '600',
    },
});
