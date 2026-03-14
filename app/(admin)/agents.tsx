// app/(admin)/agents.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Animated,
    ActivityIndicator,
    Alert,
    Platform,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { ApiService } from '../../src/services/api';
import { WalletHeader } from '../../src/components/WalletHeader';
import { getStoredSession, clearStoredSession } from '../../src/services/hooks/useAuth';
import { Agent } from '../../src/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

function AgentRow({ agent, onRevoke }: { agent: Agent; onRevoke: (addr: string) => void }) {
    const isActive = agent.status === 'Active';
    return (
        <View style={[styles.agentRow, !isActive && styles.agentRowRevoked]}>
            <View style={[styles.agentAvatar, { backgroundColor: isActive ? `${Colors.success}20` : Colors.surfaceLight }]}>
                <Ionicons name="person" size={20} color={isActive ? Colors.success : Colors.textMuted} />
            </View>
            <View style={styles.agentInfo}>
                <Text style={styles.agentName}>{agent.name || 'Unknown Agent'}</Text>
                <Text style={styles.agentAddr}>
                    {agent.address}
                </Text>
                <Text style={styles.agentDate}>
                    {isActive ? '✓ Authorized' : '✗ Revoked'} · {new Date(agent.authorizedAt).toLocaleDateString()}
                </Text>
            </View>
            <View style={styles.agentRight}>
                <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeRevoked]}>
                    <Text style={[styles.badgeText, { color: isActive ? Colors.success : Colors.textMuted }]}>
                        {agent.status}
                    </Text>
                </View>
                {isActive && (
                    <TouchableOpacity
                        style={styles.revokeBtn}
                        onPress={() => onRevoke(agent.address)}
                    >
                        <Ionicons name="ban-outline" size={18} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export default function AgentsScreen() {
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [newAddress, setNewAddress] = useState('');
    const [newName, setNewName] = useState('');
    const [authorizing, setAuthorizing] = useState(false);
    const [session, setSession] = useState<{ address: string } | null>(null);
    const fabAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        async function setupListener() {
            setLoading(true);
            const sess = await getStoredSession();
            setSession(sess);

            unsubscribe = ApiService.subscribeToAgents((data) => {
                setAgents(data);
                setLoading(false);
                setRefreshing(false);
            });
        }

        setupListener();
        Animated.spring(fabAnim, { toValue: 1, delay: 600, useNativeDriver: true }).start();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    async function handleAuthorize() {
        if (!newAddress.trim() || newAddress.trim().length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Address', text2: 'Enter a valid wallet address.' });
            return;
        }
        setAuthorizing(true);
        try {
            const agent = await ApiService.authorizeAgent(newAddress.trim(), newName.trim() || 'Agent');
            setAgents((prev) => [agent, ...prev]);
            setModalVisible(false);
            setNewAddress('');
            setNewName('');
            Toast.show({ type: 'success', text1: 'Agent Authorized!', text2: newAddress.trim() });
        } catch (err: unknown) {
            Toast.show({ type: 'error', text1: 'Authorization Failed', text2: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
            setAuthorizing(false);
        }
    }

    async function handleRevoke(address: string) {
        Alert.alert(
            'Revoke Agent',
            `Revoke access for ${address}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke', style: 'destructive',
                    onPress: async () => {
                        try {
                            await ApiService.revokeAgent(address);
                            setAgents((prev) =>
                                prev.map((a) => a.address === address ? { ...a, status: 'Revoked' } : a),
                            );
                            Toast.show({ type: 'success', text1: 'Agent Revoked', text2: address });
                        } catch (err: unknown) {
                            Toast.show({ type: 'error', text1: 'Revoke Failed', text2: err instanceof Error ? err.message : '' });
                        }
                    },
                },
            ],
        );
    }

    const activeCount = agents.filter((a) => a.status === 'Active').length;

    async function handleDisconnect() {
        const logout = async () => {
            await clearStoredSession();
            router.replace('/(auth)/connect' as never);
        };
        if (Platform.OS === 'web') {
            if (window.confirm('Disconnect?')) logout();
        } else {
            Alert.alert('Disconnect', 'Disconnect?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: logout },
            ]);
        }
    }

    return (
        <View style={styles.root}>
            <WalletHeader 
                title="Agent Management" 
                subtitle={`${activeCount} active agent${activeCount !== 1 ? 's' : ''}`} 
                address={session?.address || ''} 
                role="ADMIN" 
                onDisconnect={handleDisconnect}
            />

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
            ) : (
                <FlatList
                    data={agents}
                    keyExtractor={(a) => a.address}
                    renderItem={({ item }) => <AgentRow agent={item} onRevoke={handleRevoke} />}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>No agents authorized yet</Text>
                            <Text style={styles.emptyHint}>Tap the + button to authorize a new agent</Text>
                        </View>
                    }
                />
            )}

            {/* FAB */}
            <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabAnim }] }]}>
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.fabGrad}>
                        <Ionicons name="person-add" size={24} color={Colors.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* Authorize Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Authorize New Agent</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Wallet Address *</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="0x..."
                            placeholderTextColor={Colors.textMuted}
                            value={newAddress}
                            onChangeText={setNewAddress}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                        <Text style={styles.modalLabel}>Agent Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="John Doe"
                            placeholderTextColor={Colors.textMuted}
                            value={newName}
                            onChangeText={setNewName}
                        />

                        <View style={styles.modalNote}>
                            <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
                            <Text style={styles.modalNoteText}>
                                This will grant AGENT_ROLE on the smart contract via backend signer.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.authorizeBtn, authorizing && { opacity: 0.6 }]}
                            onPress={handleAuthorize}
                            disabled={authorizing}
                        >
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.authorizeBtnGrad}>
                                {authorizing
                                    ? <ActivityIndicator color={Colors.white} />
                                    : <>
                                        <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                                        <Text style={styles.authorizeBtnText}>Authorize Agent</Text>
                                    </>
                                }
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    list: { padding: Spacing.md, paddingBottom: 100 },
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
        ...Shadows.card,
    },
    agentRowRevoked: { opacity: 0.6 },
    agentAvatar: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    agentInfo: { flex: 1, gap: 3 },
    agentName: { ...Typography.body, fontSize: 15, fontWeight: '600' },
    agentAddr: { ...Typography.caption, fontFamily: 'monospace', fontSize: 11, color: Colors.textMuted },
    agentDate: { ...Typography.caption, fontSize: 11, color: Colors.textMuted },
    agentRight: { alignItems: 'flex-end', gap: Spacing.sm },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1 },
    badgeActive: { backgroundColor: `${Colors.success}15`, borderColor: `${Colors.success}50` },
    badgeRevoked: { backgroundColor: Colors.surfaceLight, borderColor: Colors.border },
    badgeText: { fontSize: 11, fontWeight: '700' },
    revokeBtn: {
        width: 32, height: 32, borderRadius: BorderRadius.full,
        backgroundColor: `${Colors.error}15`, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: `${Colors.error}30`,
    },
    empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.sm },
    emptyText: { ...Typography.h3, color: Colors.textSecondary },
    emptyHint: { ...Typography.caption, color: Colors.textMuted },
    fabWrap: { position: 'absolute', bottom: Spacing.xl, right: Spacing.lg },
    fab: { borderRadius: BorderRadius.full, overflow: 'hidden', ...Shadows.md },
    fabGrad: { width: 56, height: 56, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modal: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl,
        padding: Spacing.lg,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderColor: Colors.border,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
    modalTitle: { ...Typography.h3 },
    modalLabel: { ...Typography.label, marginBottom: Spacing.xs, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
    modalInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
        padding: Spacing.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border,
        fontFamily: 'monospace', fontSize: 13,
    },
    modalNote: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: `${Colors.primary}10`, padding: Spacing.sm,
        borderRadius: BorderRadius.sm, marginTop: Spacing.md, borderWidth: 1, borderColor: `${Colors.primary}25`,
    },
    modalNoteText: { ...Typography.caption, flex: 1, color: Colors.textSecondary },
    authorizeBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.lg },
    authorizeBtnGrad: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, paddingVertical: Spacing.md,
    },
    authorizeBtnText: { ...Typography.body, fontWeight: '700', color: Colors.white },
});
