// src/components/StatusTimeline.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { ShipmentMetadata } from '../types';

interface TimelineEvent {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    timestamp?: string;
    detail?: string;
    link?: string;
    linkLabel?: string;
    completed: boolean;
    disputed?: boolean;
}

interface StatusTimelineProps {
    shipment: ShipmentMetadata;
}

function formatTimestamp(ts: any): string {
    if (!ts) return '';
    
    let date: Date;
    if (ts && typeof ts.toDate === 'function') {
        // Handle Firestore Timestamp
        date = ts.toDate();
    } else if (typeof ts === 'number') {
        // Handle numeric timestamp (seconds or ms)
        date = new Date(ts > 1e12 ? ts : ts * 1000);
    } else {
        date = new Date(ts);
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function buildEvents(shipment: ShipmentMetadata): TimelineEvent[] {
    const events: TimelineEvent[] = [
        {
            id: 'created',
            icon: 'add-circle-outline',
            label: 'Shipment Created',
            timestamp: formatTimestamp(shipment.createdAt),
            completed: true,
            detail: `Order ID: ${shipment.orderId}`,
        },
        {
            id: 'transit',
            icon: 'bicycle-outline',
            label: 'Out For Delivery',
            timestamp: shipment.status === 'Created' ? undefined : formatTimestamp(shipment.createdAt),
            completed: shipment.status === 'OutForDelivery' || shipment.status === 'Delivered' || shipment.status === 'Disputed',
        },
        {
            id: 'delivered',
            icon: 'checkmark-circle-outline',
            label: 'Delivered',
            timestamp: formatTimestamp(shipment.deliveredAt),
            completed: shipment.status === 'Delivered',
            detail: shipment.gpsLocation
                ? `GPS: ${shipment.gpsLocation}`
                : undefined,
            link: shipment.photoUrl,
            linkLabel: 'View IPFS Photo',
        },
    ];

    if (shipment.status === 'Disputed') {
        events.push({
            id: 'disputed',
            icon: 'alert-circle-outline',
            label: 'Disputed',
            timestamp: '',
            completed: true,
            disputed: true,
        });
    }

    return events;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ shipment }) => {
    const events = buildEvents(shipment);

    return (
        <View style={styles.container}>
            {events.map((event, index) => {
                const isLast = index === events.length - 1;
                return (
                    <View key={`${event.id}-${index}`} style={styles.row}>
                        {/* Left column: icon + line */}
                        <View style={styles.iconCol}>
                            <View
                                style={[
                                    styles.iconCircle,
                                    event.completed && (event.disputed ? styles.iconDisputed : styles.iconCompleted),
                                    !event.completed && styles.iconPending,
                                ]}
                            >
                                <Ionicons
                                    name={event.icon}
                                    size={16}
                                    color={
                                        event.disputed
                                            ? Colors.error
                                            : event.completed
                                                ? Colors.success
                                                : Colors.textMuted
                                    }
                                />
                            </View>
                            {!isLast && (
                                <View
                                    style={[
                                        styles.line,
                                        event.completed ? styles.lineCompleted : styles.linePending,
                                    ]}
                                />
                            )}
                        </View>

                        {/* Right column: content */}
                        <View style={[styles.content, !isLast && styles.contentSpaced]}>
                            <Text
                                style={[
                                    styles.label,
                                    event.completed && !event.disputed && styles.labelCompleted,
                                    event.disputed && styles.labelDisputed,
                                ]}
                            >
                                {event.label}
                            </Text>
                            {event.timestamp ? (
                                <Text style={styles.timestamp}>{event.timestamp}</Text>
                            ) : (
                                !event.completed && <Text style={styles.pending}>Pending</Text>
                            )}
                            {event.detail && (
                                <Text style={styles.detail}>{event.detail}</Text>
                            )}
                            {event.link && event.linkLabel && (
                                <TouchableOpacity onPress={() => Linking.openURL(event.link!)}>
                                    <Text style={styles.link}>{event.linkLabel} →</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    iconCol: {
        alignItems: 'center',
        width: 32,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    iconCompleted: {
        backgroundColor: '#064E3B30',
        borderColor: Colors.success,
    },
    iconDisputed: {
        backgroundColor: '#7F1D1D30',
        borderColor: Colors.error,
    },
    iconPending: {
        backgroundColor: Colors.surfaceLight,
        borderColor: Colors.border,
    },
    line: {
        width: 2,
        flex: 1,
        minHeight: 20,
        marginVertical: 2,
        borderRadius: 1,
    },
    lineCompleted: {
        backgroundColor: Colors.success,
    },
    linePending: {
        backgroundColor: Colors.border,
    },
    content: {
        flex: 1,
        paddingBottom: Spacing.md,
    },
    contentSpaced: {
        paddingBottom: Spacing.lg,
    },
    label: {
        ...Typography.body,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    labelCompleted: {
        color: Colors.text,
    },
    labelDisputed: {
        color: Colors.error,
    },
    timestamp: {
        ...Typography.caption,
        marginTop: 3,
        color: Colors.textMuted,
    },
    pending: {
        ...Typography.caption,
        marginTop: 3,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },
    detail: {
        ...Typography.caption,
        marginTop: 4,
        color: Colors.textSecondary,
        fontFamily: 'monospace',
        fontSize: 11,
    },
    link: {
        ...Typography.caption,
        marginTop: 4,
        color: Colors.primary,
        fontWeight: '600',
    },
});
