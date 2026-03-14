// app/(public)/track.tsx
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearStoredSession } from '../../src/services/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const RECENT_KEY = 'recent_shipments';

export default function TrackScreen() {
    const router = useRouter();
    const [shipmentId, setShipmentId] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<TextInput>(null);

    React.useEffect(() => {
        AsyncStorage.getItem(RECENT_KEY).then((val) => {
            if (val) setRecentSearches(JSON.parse(val));
        });
    }, []);

    async function saveRecent(id: string) {
        const updated = [id, ...recentSearches.filter((r) => r !== id)].slice(0, 5);
        setRecentSearches(updated);
        await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    }

    function handleTrack(id?: string) {
        const target = (id || shipmentId).trim();
        if (!target) return;
        saveRecent(target);
        router.push(`/(public)/status/${target}` as never);
    }

    return (
        <LinearGradient colors={[Colors.background, '#0D1427', '#111827']} style={styles.root}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backBtn} 
                        onPress={async () => {
                            await clearStoredSession();
                            router.replace('/(auth)/connect' as never);
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                    {/* Hero */}
                    <View style={styles.hero}>
                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.heroIcon}>
                            <Ionicons name="cube" size={40} color={Colors.white} />
                        </LinearGradient>
                        <Text style={styles.heroTitle}>Track Your Package</Text>
                        <Text style={styles.heroSub}>
                            Enter your Shipment ID to view real-time delivery status with blockchain-verified proof.
                        </Text>
                    </View>

                    {/* Search card */}
                    <View style={styles.searchCard}>
                        <Text style={styles.searchLabel}>SHIPMENT ID</Text>
                        <View style={styles.searchRow}>
                            <Ionicons name="search-outline" size={20} color={Colors.textMuted} style={styles.searchIcon} />
                            <TextInput
                                ref={inputRef}
                                style={styles.searchInput}
                                value={shipmentId}
                                onChangeText={setShipmentId}
                                placeholder="Enter shipment ID..."
                                placeholderTextColor={Colors.textMuted}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                returnKeyType="search"
                                onSubmitEditing={() => handleTrack()}
                            />
                            {shipmentId.length > 0 && (
                                <TouchableOpacity onPress={() => setShipmentId('')}>
                                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.trackBtn, !shipmentId.trim() && styles.trackBtnDisabled]}
                            onPress={() => handleTrack()}
                            disabled={!shipmentId.trim()}
                        >
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.trackBtnGrad}>
                                <Ionicons name="search" size={18} color={Colors.white} />
                                <Text style={styles.trackBtnText}>Track Shipment</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Recent searches */}
                    {recentSearches.length > 0 && (
                        <View style={styles.recentCard}>
                            <Text style={styles.recentTitle}>Recent Searches</Text>
                            {recentSearches.map((id) => (
                                <TouchableOpacity key={id} style={styles.recentRow} onPress={() => handleTrack(id)}>
                                    <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                                    <Text style={styles.recentId}>{id}</Text>
                                    <Ionicons name="arrow-forward" size={14} color={Colors.textMuted} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Info section */}
                    <View style={styles.infoSection}>
                        <Text style={styles.infoTitle}>Why ChainDeliver?</Text>
                        {[
                            { icon: 'shield-checkmark-outline', text: 'Immutable on-chain delivery records' },
                            { icon: 'camera-outline', text: 'IPFS-stored proof photos' },
                            { icon: 'location-outline', text: 'Cryptographic GPS verification' },
                            { icon: 'key-outline', text: 'OTP-based physical handoff proof' },
                        ].map((item) => (
                            <View key={item.text} style={styles.infoRow}>
                                <View style={styles.infoIconWrap}>
                                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={Colors.primary} />
                                </View>
                                <Text style={styles.infoText}>{item.text}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: Spacing.lg,
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    content: { padding: Spacing.lg, paddingTop: Spacing.md, paddingBottom: 60 },
    hero: { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.md },
    heroIcon: { width: 80, height: 80, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', ...Shadows.lg },
    heroTitle: { ...Typography.h1, textAlign: 'center' },
    heroSub: { ...Typography.bodySmall, textAlign: 'center', paddingHorizontal: Spacing.lg, lineHeight: 22 },
    searchCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
        marginBottom: Spacing.md, gap: Spacing.md, ...Shadows.md,
    },
    searchLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
        borderWidth: 1, borderColor: Colors.border, paddingRight: Spacing.md,
    },
    searchIcon: { padding: Spacing.md },
    searchInput: { flex: 1, color: Colors.text, fontSize: 15, paddingVertical: Spacing.md, fontFamily: 'monospace' },
    trackBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    trackBtnDisabled: { opacity: 0.4 },
    trackBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md },
    trackBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
    recentCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, gap: Spacing.sm,
    },
    recentTitle: { ...Typography.caption, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    recentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
    recentId: { flex: 1, fontFamily: 'monospace', fontSize: 13, color: Colors.text },
    infoSection: { gap: Spacing.sm },
    infoTitle: { ...Typography.h4, marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    infoIconWrap: { width: 36, height: 36, borderRadius: BorderRadius.md, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
    infoText: { ...Typography.bodySmall, flex: 1 },
});
