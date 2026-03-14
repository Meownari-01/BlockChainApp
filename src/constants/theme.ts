// src/constants/theme.ts
export const Colors = {
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    background: '#0A0E1A',
    surface: '#111827',
    surfaceLight: '#1F2937',
    surfaceMedium: '#161D2F',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    success: '#10B981',
    successLight: '#D1FAE5',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    border: '#374151',
    borderLight: '#4B5563',
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    // Gradient colors
    gradientStart: '#0A0E1A',
    gradientMid: '#0F1729',
    gradientEnd: '#111827',
    // Status colors
    statusCreated: '#F59E0B',
    statusInTransit: '#3B82F6',
    statusDelivered: '#10B981',
    statusDisputed: '#EF4444',
};

export const Typography = {
    h1: { fontSize: 28, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700' as const, color: Colors.text, letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' as const, color: Colors.text },
    h4: { fontSize: 16, fontWeight: '600' as const, color: Colors.text },
    body: { fontSize: 16, fontWeight: '400' as const, color: Colors.text },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, color: Colors.textSecondary },
    caption: { fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary },
    captionBold: { fontSize: 13, fontWeight: '600' as const, color: Colors.textSecondary },
    label: { fontSize: 12, fontWeight: '500' as const, color: Colors.textMuted, letterSpacing: 0.5 },
    mono: { fontSize: 13, fontFamily: 'monospace' as const, color: Colors.text },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const BorderRadius = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
};

export const Shadows = {
    sm: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 3,
    },
};

export const StatusColors: Record<string, { bg: string; text: string; border: string }> = {
    Created: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
    OutForDelivery: { bg: '#EFF6FF', text: '#1E40AF', border: '#2563EB' },
    Delivered: { bg: '#D1FAE5', text: '#065F46', border: '#10B981' },
    Disputed: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
};

export const StatusColorsDark: Record<string, { bg: string; text: string; border: string }> = {
    Created: { bg: '#451A03', text: '#FCD34D', border: '#F59E0B' },
    OutForDelivery: { bg: '#1E3A8A', text: '#93C5FD', border: '#2563EB' },
    Delivered: { bg: '#064E3B', text: '#6EE7B7', border: '#10B981' },
    Disputed: { bg: '#7F1D1D', text: '#FCA5A5', border: '#EF4444' },
};
