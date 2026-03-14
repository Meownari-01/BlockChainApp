// app/(auth)/connect.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    Animated,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../src/services/api';
import { BlockchainService } from '../../src/services/blockchain';
import { saveStoredSession, getRolePath } from '../../src/services/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { UserRole } from '../../src/types';

export default function ConnectScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [phase, setPhase] = useState<'idle' | 'connecting' | 'fetching_role' | 'done'>('idle');

    // Demo mode — simulate wallet connection with an address input
    const [walletAddress, setWalletAddress] = useState('');
    const [showDemoInput, setShowDemoInput] = useState(false);

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        ]).start();

        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
            ]),
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    async function handleConnectWithAddress(address: string) {
        if (!address || address.length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Address', text2: 'Enter a valid wallet address.' });
            return;
        }

        setLoading(true);
        setPhase('fetching_role');
        try {
            let role: UserRole = 'PUBLIC';
            try {
                const res = await ApiService.getUserRole(address);
                role = res.role;
            } catch {
                // If no role found, default to PUBLIC
                role = 'PUBLIC';
            }

            await saveStoredSession({ address, role });

            setPhase('done');
            Toast.show({ type: 'success', text1: 'Connected!', text2: `Logged in as ${role}` });

            setTimeout(() => {
                router.replace(getRolePath(role) as never);
            }, 600);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to connect';
            Toast.show({ type: 'error', text1: 'Connection Failed', text2: message });
            setPhase('idle');
        } finally {
            setLoading(false);
        }
    }

    async function handleDemoConnect(role: UserRole) {
        const demoAddresses: Record<UserRole, string> = {
            ADMIN: '0xAdminDemo1234567890AbcDef0000000000000001',
            SHIPPER: '0xShipperDemo1234567890AbcDef00000000000002',
            AGENT: '0xAgentDemo1234567890AbcDef000000000000003',
            PUBLIC: '0xPublicDemo1234567890AbcDef000000000000004',
        };

        const address = demoAddresses[role];
        setLoading(true);
        setPhase('connecting');
        await new Promise((r) => setTimeout(r, 800));
        await saveStoredSession({ address, role });
        setPhase('done');
        Toast.show({ type: 'success', text1: `Demo ${role}`, text2: 'Connected successfully!' });
        setTimeout(() => router.replace(getRolePath(role) as never), 600);
        setLoading(false);
    }

    const phaseText: Record<string, string> = {
        idle: 'Connect Wallet',
        connecting: 'Requesting account...',
        fetching_role: 'Verifying role...',
        done: 'Redirecting...',
    };

    return (
        <LinearGradient colors={[Colors.background, '#0D1427', '#111827']} style={styles.root}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

                    {/* Logo */}
                    <Animated.View style={[styles.logoWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <Animated.View style={[styles.logoOuter, { transform: [{ scale: pulseAnim }] }]}>
                            <Image 
                                source={require('../../assets/images/logo.png')} 
                                style={{ width: 140, height: 140, borderRadius: 24 }} 
                                resizeMode="contain"
                            />
                        </Animated.View>

                        <Text style={styles.appName}>ChainDeliver</Text>
                        <Text style={styles.tagline}>Immutable Delivery. Powered by Blockchain.</Text>

                        {/* Feature pills */}
                        <View style={styles.pillRow}>
                            {['🔒 Tamper-proof', '📍 GPS Verified', '🌐 IPFS Photos'].map((txt) => (
                                <View key={txt} style={styles.pill}>
                                    <Text style={styles.pillText}>{txt}</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* Connect section */}
                    <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
                        <Text style={styles.cardTitle}>Connect your wallet</Text>
                        <Text style={styles.cardSub}>
                            Your wallet address identifies your role — Shipper, Agent, or Admin.
                        </Text>

                        {/* Address input */}
                        <TouchableOpacity
                            style={styles.demoToggle}
                            onPress={() => setShowDemoInput(!showDemoInput)}
                        >
                            <Text style={styles.demoToggleText}>
                                {showDemoInput ? '▲ Hide address input' : '▼ Enter wallet address manually'}
                            </Text>
                        </TouchableOpacity>

                        {showDemoInput && (
                            <View style={styles.inputWrap}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0x..."
                                    placeholderTextColor={Colors.textMuted}
                                    value={walletAddress}
                                    onChangeText={setWalletAddress}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
                                    onPress={() => handleConnectWithAddress(walletAddress)}
                                    disabled={loading}
                                >
                                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                                        {loading ? (
                                            <Text style={styles.btnText}>{phaseText[phase]}</Text>
                                        ) : (
                                            <>
                                                <Ionicons name="wallet-outline" size={20} color={Colors.white} />
                                                <Text style={styles.btnText}>Connect Wallet</Text>
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Demo roles */}
                        <View style={styles.demoSection}>
                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>Role-based Login</Text>
                                <View style={styles.orLine} />
                            </View>
                            
                            <TouchableOpacity 
                                style={styles.emailLoginBtn}
                                onPress={() => router.push('/(auth)/login' as never)}
                            >
                                <Ionicons name="mail-outline" size={20} color={Colors.white} />
                                <Text style={styles.emailLoginText}>Login with Email (Driver)</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.adminPortalLink}
                                onPress={() => router.push('/(auth)/admin-login' as never)}
                            >
                                <Ionicons name="shield-checkmark-outline" size={14} color={Colors.primary} />
                                <Text style={styles.adminPortalLinkText}>Access Admin Portal</Text>
                            </TouchableOpacity>

                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>Quick Demo</Text>
                                <View style={styles.orLine} />
                            </View>
                            <Text style={styles.demoHint}>Select a role to explore the demo</Text>
                            <View style={styles.roleGrid}>
                                {(['ADMIN', 'SHIPPER', 'AGENT', 'PUBLIC'] as UserRole[]).map((role) => {
                                    const roleIcon: Record<UserRole, keyof typeof Ionicons.glyphMap> = {
                                        ADMIN: 'shield-checkmark-outline',
                                        SHIPPER: 'business-outline',
                                        AGENT: 'bicycle-outline',
                                        PUBLIC: 'search-outline',
                                    };
                                    const roleColor: Record<UserRole, string> = {
                                        ADMIN: '#8B5CF6',
                                        SHIPPER: '#2563EB',
                                        AGENT: '#10B981',
                                        PUBLIC: '#9CA3AF',
                                    };
                                    const roleDesc: Record<UserRole, string> = {
                                        ADMIN: 'Full control',
                                        SHIPPER: 'Create shipments',
                                        AGENT: 'Fulfill deliveries',
                                        PUBLIC: 'Track packages',
                                    };
                                    return (
                                        <TouchableOpacity
                                            key={role}
                                            style={[styles.roleCard, { borderColor: `${roleColor[role]}50` }]}
                                            onPress={() => handleDemoConnect(role)}
                                            disabled={loading}
                                        >
                                            <View style={[styles.roleIcon, { backgroundColor: `${roleColor[role]}20` }]}>
                                                <Ionicons name={roleIcon[role]} size={22} color={roleColor[role]} />
                                            </View>
                                            <Text style={[styles.roleName, { color: roleColor[role] }]}>{role}</Text>
                                            <Text style={styles.roleDesc}>{roleDesc[role]}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Animated.View>

                    {/* Security note */}
                    <Text style={styles.securityNote}>
                        🔐 Your private key never leaves your device. We only use your public address.
                    </Text>
                </KeyboardAvoidingView>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scroll: {
        flexGrow: 1,
        padding: Spacing.lg,
        justifyContent: 'center',
        paddingTop: Spacing.xxxl + 20,
    },
    logoWrap: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    logoOuter: {
        marginBottom: Spacing.md,
    },
    logoGrad: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    appName: {
        ...Typography.h1,
        fontSize: 32,
        marginBottom: Spacing.xs,
        letterSpacing: -1,
    },
    tagline: {
        ...Typography.bodySmall,
        textAlign: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.lg,
    },
    pillRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    pill: {
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    pillText: {
        ...Typography.caption,
        fontSize: 12,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
        ...Shadows.md,
    },
    cardTitle: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
    },
    cardSub: {
        ...Typography.bodySmall,
        marginBottom: Spacing.md,
    },
    demoToggle: {
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    demoToggleText: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '600',
    },
    inputWrap: {
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    input: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
        fontFamily: 'monospace',
        fontSize: 13,
    },
    connectBtn: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
    },
    connectBtnDisabled: { opacity: 0.6 },
    btnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md + 2,
    },
    btnText: {
        ...Typography.body,
        fontWeight: '700',
        color: Colors.white,
    },
    demoSection: {
        marginTop: Spacing.sm,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    orLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    orText: { ...Typography.caption, color: Colors.textMuted },
    demoHint: {
        ...Typography.caption,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    roleCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        gap: 6,
    },
    roleIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleName: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    roleDesc: {
        ...Typography.caption,
        fontSize: 11,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    securityNote: {
        ...Typography.caption,
        textAlign: 'center',
        color: Colors.textMuted,
        marginTop: Spacing.sm,
    },
    emailLoginBtn: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.primary,
        marginBottom: Spacing.lg,
    },
    emailLoginText: {
        ...Typography.body,
        color: Colors.white,
        fontWeight: '600',
    },
    adminPortalLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.sm,
        marginTop: -Spacing.md,
        marginBottom: Spacing.lg,
    },
    adminPortalLinkText: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '700',
    },
});
