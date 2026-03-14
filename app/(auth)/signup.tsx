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
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { signup } from '@services/authService';
import { ApiService } from '@services/api';
import { saveStoredSession, getRolePath } from '@hooks/useAuth';
import { Colors, Typography, Spacing, BorderRadius } from '@constants/theme';
import { UserRole } from '../../src/types';

export default function SignupScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('AGENT');
    const [loading, setLoading] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    async function handleSignup() {
        if (!name || !email || !password || !confirmPassword) {
            Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill in all fields.' });
            return;
        }

        // Complex Password Validation: Numbers and Underscores
        const passwordRegex = /^(?=.*_)(?=.*\d)[A-Za-z\d_]{6,}$/;
        if (!passwordRegex.test(password)) {
            Toast.show({ 
                type: 'error', 
                text1: 'Weak Password', 
                text2: 'Password must be at least 6 characters and contain at least one underscore (_) and one number.' 
            });
            return;
        }

        if (password !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Password Mismatch', text2: 'Passwords do not match.' });
            return;
        }

        setLoading(true);
        try {
            // 1. Firebase Auth Signup
            const { user, error } = await signup(email, password);
            
            if (error) {
                Toast.show({ type: 'error', text1: 'Signup Failed', text2: error });
                setLoading(false);
                return;
            }

            if (user) {
                // 2. Backend API Registration
                try {
                    await ApiService.registerUser({
                        address: user.uid,
                        role,
                        name,
                        email: user.email || email,
                    });

                    // 3. Save session locally
                    await saveStoredSession({
                        address: user.uid,
                        role,
                        email: user.email || email,
                        name: name
                    });

                    Toast.show({ type: 'success', text1: 'Account Created', text2: `Signed up as ${role}` });
                    router.replace(getRolePath(role) as never);
                } catch (apiErr: any) {
                    console.error("API Registration Error:", apiErr);
                    Toast.show({ 
                        type: 'error', 
                        text1: 'Registration Error', 
                        text2: apiErr.message || 'Failed to sync with backend.' 
                    });
                }
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Signup Error', text2: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <LinearGradient colors={[Colors.background, '#0D1427']} style={styles.root}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={Colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join the decentralized delivery network</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="John Doe"
                                placeholderTextColor={Colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

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
                            <Text style={styles.label}>Select Role</Text>
                            <View style={styles.roleContainer}>
                                <TouchableOpacity 
                                    style={[styles.roleBtn, role === 'AGENT' && styles.roleBtnActive]} 
                                    onPress={() => setRole('AGENT')}
                                >
                                    <Ionicons name="bicycle" size={20} color={role === 'AGENT' ? Colors.white : Colors.textMuted} />
                                    <Text style={[styles.roleText, role === 'AGENT' && styles.roleTextActive]}>Agent</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.roleBtn, role === 'SHIPPER' && styles.roleBtnActive]} 
                                    onPress={() => setRole('SHIPPER')}
                                >
                                    <Ionicons name="business" size={20} color={role === 'SHIPPER' ? Colors.white : Colors.textMuted} />
                                    <Text style={[styles.roleText, role === 'SHIPPER' && styles.roleTextActive]}>Shipper</Text>
                                </TouchableOpacity>
                            </View>
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirm Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={Colors.textMuted}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirmPassword}
                                />
                                <TouchableOpacity 
                                    style={styles.eyeBtn} 
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons 
                                        name={showConfirmPassword ? "eye-off" : "eye"} 
                                        size={20} 
                                        color={Colors.textMuted} 
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.signupBtn, loading && styles.disabled]} 
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.btnGrad}>
                                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Sign Up</Text>}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footerLabels}>
                            <Text style={styles.footerBrand}>ChainDeliver</Text>
                            <Text style={styles.footerTag}>Secure · Decentralized · Transparent</Text>
                        </View>

                        <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)} style={styles.loginLink}>
                            <Text style={styles.loginLinkLabel}>Already have an account? <Text style={styles.loginLinkHighlight}>Login</Text></Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: { flex: 1 },
    scrollContent: { padding: Spacing.xl, paddingTop: Spacing.xxl },
    header: { marginBottom: Spacing.xl },
    backBtn: { marginBottom: Spacing.md },
    title: { ...Typography.h1, color: Colors.white, marginBottom: Spacing.xs },
    subtitle: { ...Typography.body, color: Colors.textMuted },
    form: { gap: Spacing.md },
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
    roleContainer: { flexDirection: 'row', gap: Spacing.md },
    roleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        padding: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    roleBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    roleText: { ...Typography.body, color: Colors.textMuted, fontWeight: '600' },
    roleTextActive: { color: Colors.white },
    signupBtn: { borderRadius: BorderRadius.md, overflow: 'hidden', marginTop: Spacing.md },
    btnGrad: { paddingVertical: Spacing.md, alignItems: 'center' },
    btnText: { ...Typography.body, color: Colors.white, fontWeight: '700' },
    disabled: { opacity: 0.7 },
    footerLabels: {
        marginTop: Spacing.md,
        alignItems: 'center',
        gap: 2,
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
    loginLink: { marginTop: Spacing.md, alignItems: 'center' },
    loginLinkLabel: { ...Typography.caption, color: Colors.textMuted },
    loginLinkHighlight: { color: Colors.primary, fontWeight: '700' },
});
