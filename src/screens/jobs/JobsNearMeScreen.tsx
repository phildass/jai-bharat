/**
 * JobsNearMeScreen
 * Shows government jobs near the user's current location using a Leaflet map
 * rendered inside a WebView alongside a scrollable list.
 *
 * Map: Leaflet (CDN) embedded via react-native-webview
 * Geocoding: calls /api/geo/reverse server-side (LOCATIONIQ_API_KEY never exposed)
 * Nearby jobs: calls /api/jobs/nearby
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { WebView } from 'react-native-webview';

import { NearbyJob, getNearbyJobs, reverseGeocode } from '../../services/jobsService';

const RADIUS_OPTIONS: Array<10 | 25 | 50 | 100> = [10, 25, 50, 100];

/**
 * Generates the Leaflet HTML page with markers for nearby jobs.
 */
/** Escape a string for safe inclusion in HTML content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildLeafletHTML(
  userLat: number,
  userLon: number,
  jobs: NearbyJob[],
  selectedId: number | null
): string {
  const markers = jobs
    .filter((j) => j.lat !== null && j.lon !== null)
    .map((j) => {
      const color = j.id === selectedId ? 'red' : 'blue';
      const popupHtml = `<b>${escapeHtml(j.title)}</b><br>${escapeHtml(j.organisation)}<br>${j.distanceKm} km away`;
      return `L.circleMarker([${j.lat}, ${j.lon}], {
        radius: 8,
        color: '${color}',
        fillColor: '${color}',
        fillOpacity: 0.7
      }).addTo(map).bindPopup(${JSON.stringify(popupHtml)});`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map').setView([${userLat}, ${userLon}], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    L.marker([${userLat}, ${userLon}]).addTo(map)
      .bindPopup('<b>You are here</b>').openPopup();
    ${markers}
  </script>
</body>
</html>`;
}

interface Props {
  navigation?: { navigate: (screen: string, params?: Record<string, unknown>) => void };
}

export default function JobsNearMeScreen({ navigation }: Props) {
  const [locationLabel, setLocationLabel] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const [radius, setRadius] = useState<10 | 25 | 50 | 100>(25);
  const [jobs, setJobs] = useState<NearbyJob[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const webViewRef = useRef<WebView>(null);

  const fetchLocation = useCallback(() => {
    setLoading(true);
    setError('');

    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLat(latitude);
        setUserLon(longitude);

        try {
          const geo = await reverseGeocode(latitude, longitude);
          setLocationLabel(geo.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setLocationLabel(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }

        try {
          const data = await getNearbyJobs(latitude, longitude, radius);
          setJobs(data.results);
        } catch {
          setError('Failed to load nearby jobs.');
        }
        setLoading(false);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [radius]);

  const fetchNearby = useCallback(async () => {
    if (userLat === null || userLon === null) return;
    setLoading(true);
    setError('');
    try {
      const data = await getNearbyJobs(userLat, userLon, radius);
      setJobs(data.results);
    } catch {
      setError('Failed to load nearby jobs.');
    } finally {
      setLoading(false);
    }
  }, [userLat, userLon, radius]);

  const leafletHTML =
    userLat !== null && userLon !== null
      ? buildLeafletHTML(userLat, userLon, jobs, selectedId)
      : null;

  const renderJob = ({ item }: { item: NearbyJob }) => (
    <TouchableOpacity
      style={[styles.card, item.id === selectedId && styles.cardSelected]}
      onPress={() => {
        setSelectedId(item.id);
        navigation?.navigate('JobDetail', { jobId: item.id });
      }}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>{item.distanceKm} km</Text>
      </View>
      <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.orgName}>{item.organisation}</Text>
      {item.location_label ? (
        <Text style={styles.location}>📍 {item.location_label}</Text>
      ) : null}
      {item.apply_end_date ? (
        <Text style={styles.deadline}>⏰ Last date: {item.apply_end_date}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Map */}
      {leafletHTML ? (
        <WebView
          ref={webViewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          javaScriptEnabled
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderText}>🗺️ Map will appear here</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* Location label */}
        {locationLabel ? (
          <Text style={styles.locationLabel} numberOfLines={1}>
            📍 {locationLabel}
          </Text>
        ) : null}

        {/* Enable location button */}
        {!userLat && (
          <TouchableOpacity
            style={styles.enableButton}
            onPress={fetchLocation}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.enableButtonText}>📍 Enable Location</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Radius selector */}
        {userLat !== null && (
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Radius:</Text>
            {RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, r === radius && styles.radiusChipActive]}
                onPress={() => {
                  setRadius(r);
                }}
                accessibilityRole="button"
              >
                <Text style={[styles.radiusChipText, r === radius && styles.radiusChipTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.refreshButton} onPress={fetchNearby} disabled={loading}>
              <Text style={styles.refreshButtonText}>🔄</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Error */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Jobs list */}
      {loading && !jobs.length ? (
        <ActivityIndicator style={styles.loader} size="large" color="#FF6B35" />
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderJob}
          ListHeaderComponent={
            jobs.length > 0 ? (
              <Text style={styles.resultsCount}>
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} within {radius} km
              </Text>
            ) : null
          }
          ListEmptyComponent={
            userLat !== null && !loading ? (
              <Text style={styles.emptyText}>
                No open jobs found within {radius} km. Try a larger radius.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  map: {
    height: Platform.OS === 'ios' ? 280 : 260,
  },
  mapPlaceholder: {
    height: Platform.OS === 'ios' ? 280 : 260,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  controls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 6,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  enableButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  radiusLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  radiusChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  radiusChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF0EA',
  },
  radiusChipText: {
    fontSize: 12,
    color: '#374151',
  },
  radiusChipTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  refreshButton: {
    paddingHorizontal: 6,
  },
  refreshButtonText: {
    fontSize: 16,
  },
  errorText: {
    margin: 12,
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 13,
  },
  loader: {
    padding: 32,
  },
  resultsCount: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  distanceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0EA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: '700',
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  orgName: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#6B7280',
  },
  deadline: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 32,
    marginHorizontal: 24,
    fontSize: 14,
  },
});
