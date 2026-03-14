import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function LandingPage() {
    const router = useRouter();

    return (
        <LinearGradient colors={[Colors.background, '#0D1427', '#111827']} style={styles.root}>
            <View style={styles.content}>
                <View style={[styles.logoOuter, { alignItems: 'center' }]}>
                    <Image source={require('../assets/images/logo.png')} style={{ width: 160, height: 160, borderRadius: 28 }} resizeMode="contain" />
                </View>

                <View style={styles.textGroup}>
                    <Text style={styles.title}>Chain<Text style={{ color: Colors.primary }}>Deliver</Text></Text>
                    <Text style={styles.tagline}>The Future of Decentralized Logistics</Text>
                    <Text style={styles.description}>
                        Secure, transparent, and immutable delivery tracking powered by Ethereum blockchain.
                    </Text>
                </View>

                <View style={styles.buttonGroup}>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[styles.primaryBtn, { flex: 1 }]} 
                            onPress={() => router.push('/(auth)/login' as never)}
                        >
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                                <Text style={styles.btnText}>Login</Text>
                                <Ionicons name="log-in-outline" size={20} color={Colors.white} />
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.secondaryBtn, { flex: 1, paddingVertical: 18 }]}
                            onPress={() => router.push('/(auth)/signup' as never)}
                        >
                            <Text style={styles.secondaryBtnText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>© 2026 ChainDeliver Protocol · Built for Web3</Text>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, justifyContent: 'center' },
    content: { padding: Spacing.xl, alignItems: 'center' },
    logoOuter: { marginBottom: Spacing.xl, ...Shadows.lg },
    logoGrad: {
        width: 100,
        height: 100,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textGroup: { alignItems: 'center', marginBottom: 40 },
    title: { ...Typography.h1, fontSize: 48, marginBottom: Spacing.xs, letterSpacing: -1 },
    tagline: { ...Typography.h3, color: Colors.primary, marginBottom: Spacing.md, textAlign: 'center' },
    description: {
        ...Typography.body,
        textAlign: 'center',
        color: Colors.textSecondary,
        paddingHorizontal: Spacing.lg,
        lineHeight: 24,
    },
    buttonGroup: { width: '100%', gap: Spacing.sm },
    buttonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
    primaryBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.md },
    btnGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 12,
    },
    btnText: { color: Colors.white, fontSize: 18, fontWeight: '700' },
    secondaryBtn: {
        paddingVertical: 16,
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    secondaryBtnText: { color: Colors.text, fontSize: 16, fontWeight: '600' },
    tertiaryBtn: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    tertiaryBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '500' },
    footer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
    footerText: { ...Typography.caption, color: Colors.textMuted },
});
