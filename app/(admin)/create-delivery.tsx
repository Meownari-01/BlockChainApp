import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { createDelivery } from '@services/deliveryService';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@constants/theme';

export default function CreateDeliveryScreen() {
    const router = useRouter();
    const [orderId, setOrderId] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [receiverEmail, setReceiverEmail] = useState('');
    const [destination, setDestination] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleCreate() {
        if (!orderId || !receiverName || !receiverEmail || !destination) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'All fields are required.' });
            return;
        }

        setLoading(true);
        try {
            const { id, error } = await createDelivery({
                orderId,
                receiverName,
                receiverEmail,
                destination,
                status: 'PENDING'
            });

            if (error) {
                Toast.show({ type: 'error', text1: 'Error', text2: error });
            } else {
                Toast.show({ type: 'success', text1: 'Created!', text2: `Delivery ${id} created successfully.` });
                router.back();
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to create delivery.' });
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
                <Text style={styles.headerTitle}>New Delivery</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Order ID</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. ORD-12345"
                            placeholderTextColor={Colors.textMuted}
                            value={orderId}
                            onChangeText={setOrderId}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Receiver Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor={Colors.textMuted}
                            value={receiverName}
                            onChangeText={setReceiverName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Receiver Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="receiver@email.com"
                            placeholderTextColor={Colors.textMuted}
                            value={receiverEmail}
                            onChangeText={setReceiverEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Destination Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Street, City, State"
                            placeholderTextColor={Colors.textMuted}
                            value={destination}
                            onChangeText={setDestination}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.submitBtn, loading && styles.disabled]} 
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Create Delivery Order</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
    form: { backgroundColor: Colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.lg, gap: Spacing.lg, ...Shadows.md },
    inputGroup: { gap: Spacing.xs },
    label: { ...Typography.caption, color: Colors.textMuted, fontWeight: '700' },
    input: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    submitBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.sm },
    btnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
    btnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
    disabled: { opacity: 0.7 },
});
