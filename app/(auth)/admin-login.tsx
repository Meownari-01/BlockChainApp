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
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { login } from '../../src/services/authService';
import { ApiService } from '../../src/services/api';
import { saveStoredSession, getRolePath } from '../../src/services/hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';

export default function AdminLoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleLogin() {
        if (!email || !password) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please enter email and password.' });
            return;
        }

        setLoading(true);
        try {
            const { user, error } = await login(email, password);
            if (error) {
                Toast.show({ type: 'error', text1: 'Login Failed', text2: error });
            } else if (user) {
                try {
                    const { role, user: userData } = await ApiService.getUserRole(user.uid);
                    
                    if (role !== 'ADMIN') {
                        Toast.show({ 
                            type: 'error', 
                            text1: 'Access Denied', 
                            text2: 'Only administrators can log in here.' 
                        });
                        setLoading(false);
                        return;
                    }

                    await saveStoredSession({ 
                        address: user.uid, 
                        role, 
                        email: user.email || undefined,
                        name: userData.name || user.displayName || undefined
                    });
                    
                    Toast.show({ type: 'success', text1: 'Admin Verified', text2: `Welcome back, ${userData.name || 'Admin'}` });
                    router.replace('/(admin)/dashboard');
                } catch (roleErr: any) {
                    console.error("Admin Login Role Fetch Error:", roleErr);
                    Toast.show({ 
                        type: 'error', 
                        text1: 'Profile Error', 
                        text2: 'Credential valid, but no admin profile found.' 
                    });
                }
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Login Error', text2: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <LinearGradient colors={['#0F172A', '#1E1B4B']} style={styles.root}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Image source={require('../../assets/images/logo.png')} style={{ width: 60, height: 60, borderRadius: 12 }} resizeMode="contain" />
                    </View>
                    <View style={styles.adminBadge}>
                        <Ionicons name="shield-checkmark" size={16} color={Colors.white} />
                        <Text style={styles.adminBadgeText}>ADMIN PORTAL</Text>
                    </View>
                    <Text style={styles.title}>Secure Access</Text>
                    <Text style={styles.subtitle}>Unauthorized access is strictly prohibited</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="admin@chaindeliver.com"
                            placeholderTextColor={Colors.textMuted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Access Key (Password)</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity 
                                style={styles.eyeBtn} 
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={20} 
                                    color={Colors.textMuted} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.forgotBtn} 
                        onPress={() => router.push('/(auth)/forgot-password' as any)}
                    >
                        <Text style={styles.forgotText}>Request Key Reset</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.loginBtn, loading && styles.disabled]} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient colors={['#4F46E5', '#3730A3']} style={styles.btnGrad}>
                            {loading ? <ActivityIndicator color={Colors.white} /> : (
                                <View style={styles.btnContent}>
                                    <Ionicons name="lock-closed" size={18} color={Colors.white} />
                                    <Text style={styles.btnText}>Authorize Entry</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>© 2026 ChainDeliver Protocol</Text>
                    <Text style={styles.footerSub}>End-to-end encrypted session</Text>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1, padding: Spacing.xl, justifyContent: 'center' },
    header: { marginBottom: Spacing.xxl },
    backBtn: { marginBottom: Spacing.md },
    adminBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: '#4F46E5', 
        paddingHorizontal: 12, 
        paddingVertical: 4, 
        borderRadius: BorderRadius.full,
        alignSelf: 'flex-start',
        marginBottom: Spacing.md
    },
    adminBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
    title: { ...Typography.h1, color: Colors.white, marginBottom: Spacing.xs },
    subtitle: { ...Typography.body, color: Colors.textMuted },
    form: { gap: Spacing.lg },
    inputGroup: { gap: Spacing.xs },
    label: { ...Typography.caption, color: Colors.white, fontWeight: '700' },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    eyeBtn: {
        padding: Spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: -Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    forgotText: {
        ...Typography.caption,
        color: '#818CF8',
        fontWeight: '600',
    },
    loginBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
    btnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
    btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    btnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
    disabled: { opacity: 0.7 },
    footer: {
        marginTop: Spacing.xxxl,
        alignItems: 'center',
        gap: 4,
    },
    footerText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' },
    footerSub: { ...Typography.caption, color: Colors.textMuted, fontSize: 10 },
});
