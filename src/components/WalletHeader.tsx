// src/components/WalletHeader.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface WalletHeaderProps {
    title: string;
    subtitle?: string;
    address: string;
    role?: string;
    onDisconnect?: () => void;
    onPressBack?: () => void;
    showBack?: boolean;
}

function truncateAddress(addr: string): string {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const ROLE_COLOR: Record<string, string> = {
    ADMIN: '#8B5CF6',
    SHIPPER: '#2563EB',
    AGENT: '#10B981',
    PUBLIC: '#9CA3AF',
};

export const WalletHeader: React.FC<WalletHeaderProps> = ({
    title,
    subtitle,
    address,
    role,
    onDisconnect,
    onPressBack,
    showBack = false,
}) => {
    return (
        <LinearGradient
            colors={['#0F1729', '#111827']}
            style={styles.container}
        >
            <View style={styles.topRow}>
                {showBack && onPressBack ? (
                    <TouchableOpacity style={styles.backBtn} onPress={onPressBack}>
                        <Ionicons name="arrow-back" size={22} color={Colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.logoMark}>
                        <Ionicons name="cube" size={18} color={Colors.primary} />
                    </View>
                )}

                <View style={styles.walletInfo}>
                    <View style={styles.addressRow}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.address}>{address}</Text>
                    </View>
                    {role && (
                        <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLOR[role] || Colors.primary}22`, borderColor: ROLE_COLOR[role] || Colors.primary }]}>
                            <Text style={[styles.roleText, { color: ROLE_COLOR[role] || Colors.primary }]}>
                                {role}
                            </Text>
                        </View>
                    )}
                </View>

                {onDisconnect && (
                    <TouchableOpacity style={styles.disconnectBtn} onPress={onDisconnect}>
                        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.titleRow}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: Spacing.xxxl,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    logoMark: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: `${Colors.primary}22`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${Colors.primary}44`,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.success,
    },
    address: {
        ...Typography.caption,
        fontFamily: 'monospace',
        fontSize: 12,
    },
    roleBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    disconnectBtn: {
        width: 36,
        height: 36,
        borderRadius: BorderRadius.md,
        backgroundColor: `${Colors.error}15`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: `${Colors.error}30`,
    },
    titleRow: {
        gap: 4,
    },
    title: {
        ...Typography.h1,
        fontSize: 26,
    },
    subtitle: {
        ...Typography.bodySmall,
    },
});
