// app/(admin)/dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Animated,
    Alert,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Rect, Text as SvgText, G } from 'react-native-svg';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../src/services/api';
import { WalletHeader } from '../../src/components/WalletHeader';
import { getStoredSession, clearStoredSession } from '../../src/services/hooks/useAuth';
import { Analytics, AuthSession } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

const SKELETON_BG = Colors.surfaceLight;

function SkeletonBox({ width, height }: { width: number | string; height: number }) {
    const anim = React.useRef(new Animated.Value(0.4)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
            ]),
        ).start();
    }, []);
    return (
        <Animated.View
            style={{ width: width as number, height, borderRadius: 6, backgroundColor: SKELETON_BG, opacity: anim }}
        />
    );
}

interface StatCard {
    label: string;
    value: string | number;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    sub?: string;
}

function StatsCard({ card, loading }: { card: StatCard; loading: boolean }) {
    return (
        <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: `${card.color}20` }]}>
                <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            {loading ? (
                <>
                    <SkeletonBox width={60} height={28} />
                    <SkeletonBox width={80} height={12} />
                </>
            ) : (
                <>
                    <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
                    <Text style={styles.statLabel}>{card.label}</Text>
                    {card.sub && <Text style={styles.statSub}>{card.sub}</Text>}
                </>
            )}
        </View>
    );
}

export default function AdminDashboard() {
    const router = useRouter();
    const [session, setSession] = useState<AuthSession | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        let unsubscribeShipments: (() => void) | undefined;
        let unsubscribeAgents: (() => void) | undefined;

        async function setupListener() {
            setLoading(true);
            const sess = await getStoredSession();
            setSession(sess);

            unsubscribeShipments = ApiService.subscribeToAllShipments((shipments) => {
                setAnalytics(prev => ({
                    ...(prev || { totalAgents: 0 }),
                    totalShipments: shipments.length,
                    delivered: shipments.filter(s => s.status === 'Delivered').length,
                    disputed: shipments.filter(s => s.status === 'Disputed').length,
                    inTransit: shipments.filter(s => s.status === 'OutForDelivery').length,
                    created: shipments.filter(s => s.status === 'Created').length,
                    totalVolumeEth: shipments.reduce((acc, s) => acc + parseFloat(s.escrowAmount || '0'), 0).toFixed(4),
                }));
                setLoading(false);
                setRefreshing(false);
            });

            unsubscribeAgents = ApiService.subscribeToAgents((agents) => {
                setAnalytics(prev => ({
                    ...(prev || {
                        totalShipments: 0,
                        delivered: 0,
                        disputed: 0,
                        inTransit: 0,
                        created: 0,
                        totalVolumeEth: '0.0000'
                    }),
                    totalAgents: agents.length
                }));
            });
        }

        setupListener();

        return () => {
            if (unsubscribeShipments) unsubscribeShipments();
            if (unsubscribeAgents) unsubscribeAgents();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    async function handleDisconnect() {
        const logout = async () => {
            await clearStoredSession();
            router.replace('/(auth)/connect' as never);
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to disconnect?')) logout();
        } else {
            Alert.alert('Disconnect', 'Are you sure you want to disconnect?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: logout },
            ]);
        }
    }

    async function handleExport() {
        if (!analytics) return;
        
        try {
            setLoading(true);
            const shipments = await ApiService.getAllShipments();
            
            // Generate CSV
            const header = 'Shipment ID,Order ID,Receiver,Status,Amount,Shipper,Agent,Created At\n';
            const rows = shipments.map(s => 
                `"${s.shipmentId}","${s.orderId}","${s.receiverName}","${s.status}","${s.escrowAmount}","${s.shipper}","${s.agent}","${s.createdAt}"`
            ).join('\n');
            const csvContent = header + rows;
            
            if (Platform.OS === 'web') {
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics_export_${Date.now()}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
                Toast.show({ type: 'success', text1: 'Export Complete', text2: 'CSV file downloaded.' });
            } else {
                const fileUri = `${FileSystem.documentDirectory}analytics_export_${Date.now()}.csv`;
                await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
                
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert('Export Complete', `File saved to: ${fileUri}`);
                }
            }
        } catch (err: any) {
            console.error('Export Error:', err);
            Alert.alert('Export Failed', err.message || 'Could not export data.');
        } finally {
            setLoading(false);
        }
    }

    const chartData = [
        { label: 'Delivered', value: analytics?.delivered ?? 0, color: Colors.success },
        { label: 'In Transit', value: analytics?.inTransit ?? 0, color: Colors.primary },
        { label: 'Created', value: analytics?.created ?? 0, color: '#F59E0B' }, // Warning color
        { label: 'Disputed', value: analytics?.disputed ?? 0, color: Colors.error },
    ];

    const statCards: StatCard[] = [
        { label: 'Total Shipments', value: analytics?.totalShipments ?? 0, icon: 'cube-outline', color: Colors.primary },
        { label: 'Network Agents', value: analytics?.totalAgents ?? 0, icon: 'people-outline', color: '#8B5CF6' },
        { label: 'Delivered', value: analytics?.delivered ?? 0, icon: 'checkmark-circle-outline', color: Colors.success },
        { label: 'Disputed', value: analytics?.disputed ?? 0, icon: 'alert-circle-outline', color: Colors.error },
        // { label: 'ETH Volume', value: `${analytics?.totalVolumeEth ?? '0.00'} ETH`, icon: 'diamond-outline', color: '#8B5CF6', sub: '≈ Sepolia Testnet' },
    ];

    return (
        <View style={styles.root}>
            <WalletHeader
                title="Admin Control Center"
                subtitle="Full system overview and management"
                address={session?.address || ''}
                role="ADMIN"
                onDisconnect={handleDisconnect}
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats grid */}
                <Text style={styles.sectionTitle}>System Analytics</Text>
                <View style={styles.statsGrid}>
                    {statCards.map((card) => (
                        <StatsCard key={card.label} card={card} loading={loading} />
                    ))}
                </View>

                {/* In transit stat */}
                {!loading && analytics && (
                    <View style={styles.inTransitBanner}>
                        <LinearGradient colors={[`${Colors.primary}20`, `${Colors.primary}05`]} style={styles.inTransitGrad}>
                            <Ionicons name="bicycle" size={20} color={Colors.primary} />
                            <Text style={styles.inTransitText}>
                                <Text style={{ color: Colors.primary, fontWeight: '700' }}>{analytics.inTransit}</Text>
                                {' '}shipments currently in transit
                            </Text>
                        </LinearGradient>
                    </View>
                )}

                {/* Quick actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/agents' as never)}>
                        <LinearGradient colors={['#8B5CF620', '#8B5CF605']} style={styles.actionGrad}>
                            <Ionicons name="people" size={26} color="#8B5CF6" />
                            <Text style={[styles.actionLabel, { color: '#8B5CF6' }]}>Agent{'\n'}Manager</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/shippers' as never)}>
                        <LinearGradient colors={['#EC489920', '#EC489905']} style={styles.actionGrad}>
                            <Ionicons name="car" size={26} color="#EC4899" />
                            <Text style={[styles.actionLabel, { color: '#EC4899' }]}>Shipper{'\n'}Manager</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/shipments' as never)}>
                        <LinearGradient colors={[`${Colors.primary}20`, `${Colors.primary}05`]} style={styles.actionGrad}>
                            <Ionicons name="cube" size={26} color={Colors.primary} />
                            <Text style={[styles.actionLabel, { color: Colors.primary }]}>Shipment{'\n'}Manager</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(admin)/create-delivery' as never)}>
                        <LinearGradient colors={['#F59E0B20', '#F59E0B05']} style={styles.actionGrad}>
                            <Ionicons name="add-circle" size={26} color="#F59E0B" />
                            <Text style={[styles.actionLabel, { color: '#F59E0B' }]}>Create{'\n'}Delivery</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={handleExport} disabled={loading}>
                        <LinearGradient colors={[`${Colors.success}20`, `${Colors.success}05`]} style={styles.actionGrad}>
                            {loading ? (
                                <ActivityIndicator color={Colors.success} />
                                ) : (
                                <>
                                    <Ionicons name="bar-chart" size={26} color={Colors.success} />
                                    <Text style={[styles.actionLabel, { color: Colors.success }]}>Export{'\n'}Analysis</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(agent)/dashboard' as never)}>
                        <LinearGradient colors={['#10B98120', '#10B98105']} style={styles.actionGrad}>
                            <Ionicons name="bicycle" size={26} color="#10B981" />
                            <Text style={[styles.actionLabel, { color: '#10B981' }]}>My{'\n'}Deliveries</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Graphical Analytics */}
                <Text style={styles.sectionTitle}>Volume Visualization</Text>
                <View style={styles.chartCard}>
                    <Svg height="180" width="100%">
                        {chartData.map((item, index) => {
                            const maxVal = Math.max(...chartData.map(d => d.value), 1);
                            const barHeight = (item.value / maxVal) * 120;
                            const x = index * (100 / chartData.length);
                            return (
                                <G key={item.label}>
                                    <Rect
                                        x={`${x + 2}%`}
                                        y={140 - barHeight}
                                        width="18%"
                                        height={barHeight}
                                        fill={item.color}
                                        rx="4"
                                    />
                                    <SvgText
                                        x={`${x + 11}%`}
                                        y="155"
                                        fill={Colors.textMuted}
                                        fontSize="10"
                                        textAnchor="middle"
                                    >
                                        {item.label}
                                    </SvgText>
                                    <SvgText
                                        x={`${x + 11}%`}
                                        y={135 - barHeight}
                                        fill={Colors.white}
                                        fontSize="12"
                                        fontWeight="700"
                                        textAnchor="middle"
                                    >
                                        {item.value}
                                    </SvgText>
                                </G>
                            );
                        })}
                    </Svg>
                </View>

                {/* System info */}
                <Text style={styles.sectionTitle}>System Info</Text>
                <View style={styles.infoCard}>
                    {[
                        { label: 'Network', value: 'Ethereum Sepolia', icon: 'globe-outline' },
                        { label: 'Contract', value: process.env.EXPO_PUBLIC_CONTRACT_ADDRESS || '0x...', icon: 'document-text-outline' },
                        { label: 'Backend', value: process.env.EXPO_PUBLIC_BACKEND_URL || 'localhost:3001', icon: 'server-outline' },
                    ].map((item) => (
                        <View key={item.label} style={styles.infoRow}>
                            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={15} color={Colors.textMuted} />
                            <Text style={styles.infoLabel}>{item.label}</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.bottomPad} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    scroll: { flex: 1 },
    content: { padding: Spacing.lg },
    sectionTitle: {
        ...Typography.h4,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
        marginTop: Spacing.md,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 26,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    statLabel: {
        ...Typography.caption,
        color: Colors.textSecondary,
    },
    statSub: {
        fontSize: 10,
        color: Colors.textMuted,
    },
    inTransitBanner: {
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        marginTop: Spacing.sm,
        borderWidth: 1,
        borderColor: `${Colors.primary}30`,
    },
    inTransitGrad: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
    },
    inTransitText: {
        ...Typography.body,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    actionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    actionBtn: {
        width: '31%',
        borderRadius: BorderRadius.md,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionGrad: {
        padding: Spacing.md,
        alignItems: 'center',
        gap: 8,
        minHeight: 90,
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    infoLabel: {
        ...Typography.caption,
        width: 70,
        color: Colors.textMuted,
    },
    infoValue: {
        ...Typography.caption,
        flex: 1,
        fontFamily: 'monospace',
        fontSize: 12,
    },
    chartCard: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.card,
        alignItems: 'center',
        paddingTop: 30,
    },
    bottomPad: { height: 40 },
});
