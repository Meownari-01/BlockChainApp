import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Colors, Typography, Spacing } from '../../src/constants/theme';
import LeafletMap from '../../src/components/Map';
import { ApiService } from '../../src/services/api';
import { getStoredSession } from '../../src/services/hooks/useAuth';
import { ShipmentMetadata } from '../../src/types';

export default function TrackingScreen() {
    const [loading, setLoading] = useState(true);
    const [shipment, setShipment] = useState<ShipmentMetadata | null>(null);

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        async function init() {
            const session = await getStoredSession();
            if (session?.address) {
                unsubscribe = ApiService.subscribeToShipmentsByShipper(session.address, (shipments) => {
                    // Find the most relevant shipment (In Transit or the latest created one)
                    const active = shipments.find(s => s.status === 'OutForDelivery') || shipments[0];
                    setShipment(active || null);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        }

        init();
        return () => unsubscribe?.();
    }, []);

    // Parse GPS location if available
    const gps = shipment?.gpsLocation ? shipment.gpsLocation.split(',') : null;
    const currentLoc = gps ? { latitude: parseFloat(gps[0]), longitude: parseFloat(gps[1]) } : null;

    // Use actual data if available, otherwise fallback to a demo route for UI testing
    const displayMarkers = currentLoc ? [
        { ...currentLoc, title: `Shipment ${shipment?.orderId}` }
    ] : [
        { latitude: 12.7409, longitude: 77.8253, title: "Pickup Point (Hosur)" },
        { latitude: 11.0168, longitude: 76.9558, title: "Destination (Coimbatore)" },
    ];

    const displayRoute = currentLoc ? [
        { latitude: 12.7409, longitude: 77.8253 }, // Assuming Hosur as start for demo
        currentLoc
    ] : [
        { latitude: 12.7409, longitude: 77.8253 }, // Hosur
        { latitude: 12.1211, longitude: 78.1582 }, // Dharmapuri
        { latitude: 11.6643, longitude: 78.1460 }, // Salem
        { latitude: 11.3410, longitude: 77.7172 }, // Erode
        { latitude: 11.0168, longitude: 76.9558 }, // Coimbatore
    ];

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Track Shipments</Text>
                <Text style={styles.subtitle}>
                    {shipment ? `Tracking Order ${shipment.orderId}` : "No active shipments found"}
                </Text>
            </View>

            <View style={styles.mapContainer}>
                <LeafletMap 
                    center={currentLoc || { latitude: 11.8, longitude: 77.4 }} 
                    zoom={currentLoc ? 12 : 8}
                    markers={displayMarkers}
                    route={displayRoute}
                />
            </View>

            <View style={styles.infoCard}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <Text style={[styles.statusValue, shipment?.status === 'Delivered' && { color: Colors.success }]}>
                        {shipment?.status || "Idle"}
                    </Text>
                </View>
                <View style={styles.routeRow}>
                    <View style={styles.routePoint}>
                        <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                        <Text style={styles.routeText}>Hosur</Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routePoint}>
                        <View style={[styles.dot, { backgroundColor: shipment?.status === 'Delivered' ? Colors.success : Colors.textMuted }]} />
                        <Text style={styles.routeText}>Coimbatore</Text>
                    </View>
                </View>
                <Text style={styles.description}>
                    {shipment 
                        ? `Order ${shipment.orderId} is currently ${shipment.status.toLowerCase()}. Tracking is live via OpenStreetMap.`
                        : "Start a shipment to see real-time tracking in action."}
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: Spacing.xl,
    },
    title: {
        ...Typography.h2,
        color: Colors.white,
    },
    subtitle: {
        ...Typography.caption,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
    },
    mapContainer: {
        flex: 1,
        marginHorizontal: Spacing.md,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    infoCard: {
        backgroundColor: Colors.surface,
        margin: Spacing.md,
        padding: Spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    statusLabel: {
        ...Typography.body,
        color: Colors.textMuted,
    },
    statusValue: {
        ...Typography.h3,
        color: Colors.primary,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingHorizontal: Spacing.xs,
    },
    routePoint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    routeText: {
        ...Typography.body,
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    routeLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
        marginHorizontal: 12,
        borderStyle: 'dashed',
    },
    description: {
        ...Typography.caption,
        color: Colors.text,
        lineHeight: 20,
    }
});
