import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    KeyboardAvoidingView, 
    Platform, 
    ActivityIndicator,
    Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Colors, Typography, Spacing, BorderRadius } from '../../src/constants/theme';
import { resetUserPassword } from '../../src/services/authService';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleResetLink = async () => {
        if (!email) {
            Toast.show({ type: 'error', text1: 'Missing Email', text2: 'Please enter your email address.' });
            return;
        }

        setLoading(true);
        const { success, error } = await resetUserPassword(email);
        setLoading(false);

        if (success) {
            setSent(true);
            Toast.show({ 
                type: 'success', 
                text1: 'Email Sent', 
                text2: 'Check your inbox for the reset link.' 
            });
        } else {
            console.error("Reset Link Error:", error);
            Alert.alert("Reset Error", error || "Failed to send reset email.");
            Toast.show({ 
                type: 'error', 
                text1: 'Reset Failed', 
                text2: error || 'Failed to send reset email.' 
            });
        }
    };

    const handleGoToLogin = () => {
        router.replace('/(auth)/login' as any);
    };

    return (
        <LinearGradient colors={[Colors.background, '#0D1427']} style={styles.root}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>
                        {sent 
                            ? "Check your email for instructions to create a new password." 
                            : "Enter your email to receive a password reset link."}
                    </Text>
                </View>

                <View style={styles.form}>
                    {!sent ? (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter valid email"
                                    placeholderTextColor={Colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.btn, loading && styles.disabled]} 
                                onPress={handleResetLink}
                                disabled={loading}
                            >
                                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                                    {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Send Reset Link</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.successContainer}>
                            <Ionicons name="mail-open" size={80} color={Colors.primary} />
                            <Text style={styles.successText}>
                                A reset link has been sent to {email}. If you don't see it, please check your spam folder.
                            </Text>
                            <TouchableOpacity style={styles.loginBtn} onPress={handleGoToLogin}>
                                <Text style={styles.loginBtnText}>Return to Login</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
    header: { marginBottom: Spacing.xl },
    backBtn: { marginBottom: Spacing.md },
    title: { 
        color: Colors.white, 
        marginBottom: Spacing.xs, 
        fontSize: 32, 
        fontWeight: '700',
        letterSpacing: -0.5
    },
    subtitle: { color: Colors.textMuted, fontSize: 16 },
    form: { gap: Spacing.md },
    inputGroup: { gap: Spacing.xs },
    label: { color: Colors.text, fontWeight: '600', fontSize: 14 },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    btn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.sm },
    btnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
    btnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
    disabled: { opacity: 0.7 },
    successContainer: { alignItems: 'center', gap: Spacing.lg },
    successText: { 
        color: Colors.text, 
        textAlign: 'center', 
        fontSize: 16, 
        lineHeight: 24 
    },
    loginBtn: {
        marginTop: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    loginBtnText: { color: Colors.primary, fontWeight: '700' }
});
