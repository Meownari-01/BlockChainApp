import React, { useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform } from 'react-native';
import { Colors } from '../constants/theme';

// Only require WebView on native platforms
let WebView: any = null;
if (Platform.OS !== 'web') {
    try {
        const { WebView: WV } = require('react-native-webview');
        WebView = WV;
    } catch (e) {
        console.warn("WebView could not be loaded on this platform:", e);
    }
}

interface Coordinate {
    latitude: number;
    longitude: number;
}

interface Marker extends Coordinate {
    title?: string;
}

interface MapProps {
    center?: Coordinate;
    zoom?: number;
    markers?: Marker[];
    route?: Coordinate[]; // New prop for route path
}

const LeafletMap: React.FC<MapProps> = ({ 
    center = { latitude: 11.8, longitude: 77.4 }, // Default to Hosur-Coimbatore center
    zoom = 8,
    markers = [],
    route = []
}) => {
    const mapHtml = useMemo(() => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                body { margin: 0; padding: 0; background-color: #0B0F1A; }
                #map { height: 100vh; width: 100vw; background: #0B0F1A; }
                .leaflet-tile-pane { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
                .leaflet-container { background: #0B0F1A !important; }
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map', {
                    zoomControl: false,
                    attributionControl: false
                }).setView([${center.latitude}, ${center.longitude}], ${zoom});
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                }).addTo(map);

                // Add Markers
                var markers = ${JSON.stringify(markers)};
                markers.forEach(function(m) {
                    L.marker([m.latitude, m.longitude]).addTo(map)
                        .bindPopup(m.title || "Location");
                });

                // Add Route Path (Polyline)
                var routePoints = ${JSON.stringify(route)};
                if (routePoints && routePoints.length > 1) {
                    var latlngs = routePoints.map(function(p) { return [p.latitude, p.longitude]; });
                    var polyline = L.polyline(latlngs, {
                        color: '${Colors.primary}',
                        weight: 4,
                        opacity: 0.8,
                        lineJoin: 'round'
                    }).addTo(map);

                    // Zoom map to fit the route
                    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
                }

                if (window.ReactNativeWebView) {
                    map.on('click', function(e) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            event: 'onPress',
                            payload: e.latlng
                        }));
                    });
                }
            </script>
        </body>
        </html>
    `, [center, zoom, markers, route]);

    if (Platform.OS === 'web') {
        return (
            <View style={styles.container}>
                <iframe
                    srcDoc={mapHtml}
                    style={{ border: 'none', width: '100%', height: '100%' }}
                    title="Leaflet Map"
                />
            </View>
        );
    }

    if (!WebView) {
        return (
            <View style={[styles.container, styles.loader]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.map}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loader}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        overflow: 'hidden',
        borderRadius: 12,
    },
    map: {
        flex: 1,
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default LeafletMap;
