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
import { login } from '@services/authService';
import { ApiService } from '@services/api';
import { saveStoredSession, getRolePath } from '@hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@constants/theme';

export default function LoginScreen() {
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
                // Fetch user role and profile from Firestore
                try {
                    const { role, user: userData } = await ApiService.getUserRole(user.uid);
                    await saveStoredSession({ 
                        address: user.uid, 
                        role, 
                        email: user.email || undefined,
                        name: userData.name || user.displayName || undefined
                    });
                    
                    Toast.show({ type: 'success', text1: 'Welcome!', text2: `Logged in as ${role}` });
                    router.replace(getRolePath(role) as never);
                } catch (roleErr: any) {
                    console.error("Login Role Fetch Error:", roleErr);
                    // If user exists in Auth but not in Firestore, we might need to handle it
                    // Defaulting to AGENT or showing error
                    Toast.show({ 
                        type: 'error', 
                        text1: 'Profile Error', 
                        text2: 'Could not find your user profile in the database.' 
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
        <LinearGradient colors={[Colors.background, '#0D1427']} style={styles.root}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
                        <Image source={require('../../assets/images/logo.png')} style={{ width: 100, height: 100, borderRadius: 20 }} resizeMode="contain" />
                    </View>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Login to manage your deliveries</Text>
                </View>

                <View style={styles.form}>
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
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
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.loginBtn, loading && styles.disabled]} 
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Login</Text>}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.footerLabels}>
                        <Text style={styles.footerBrand}>ChainDeliver</Text>
                        <Text style={styles.footerTag}>Secure · Decentralized · Transparent</Text>
                    </View>

                    <TouchableOpacity onPress={() => router.push('/(auth)/signup' as any)} style={styles.signupLink}>
                        <Text style={styles.signupLinkLabel}>Don't have an account? <Text style={styles.signupLinkHighlight}>Sign Up</Text></Text>
                    </TouchableOpacity>
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
        color: Colors.primary,
        fontWeight: '600',
    },
    loginBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
    btnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
    btnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
    disabled: { opacity: 0.7 },
    footerLabels: {
        marginTop: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.xs,
    },
    footerBrand: {
        ...Typography.h4,
        color: Colors.primary,
        fontWeight: '800',
        letterSpacing: 1,
    },
    footerTag: {
        ...Typography.caption,
        color: Colors.textMuted,
        letterSpacing: 0.5,
    },
    signupLink: { marginTop: Spacing.md, alignItems: 'center' },
    signupLinkLabel: { ...Typography.caption, color: Colors.textMuted },
    signupLinkHighlight: { color: Colors.primary, fontWeight: '700' },
});
