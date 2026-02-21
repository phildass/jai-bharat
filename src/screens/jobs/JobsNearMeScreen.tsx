/**
 * Jobs Near Me Screen
 * Shows a Leaflet/OSM map (via WebView) with job markers and a results list.
 * Radius selector: 10 / 25 / 50 / 100 km
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { getNearbyJobs, NearbyJob } from '../../services/jobsService';

// WebView is conditionally imported to avoid crashes if the native module
// hasn't been linked yet (e.g. before `pod install` on iOS).
let WebView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

interface Props {
  navigation: any;
}

const RADIUS_OPTIONS = [10, 25, 50, 100];

/** Build the inline Leaflet HTML for the WebView */
function buildMapHtml(
  lat: number,
  lon: number,
  jobs: NearbyJob[]
): string {
  const markers = jobs
    .filter((j) => j.lat != null && j.lon != null)
    .map(
      (j) =>
        `L.marker([${j.lat}, ${j.lon}]).addTo(map)` +
        `.bindPopup("<b>${j.title.replace(/"/g, '&quot;')}</b><br>${
          j.organization || ''
        }<br>${j.distanceKm} km away");`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${lat}, ${lon}], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    // User location marker
    L.circleMarker([${lat}, ${lon}], {
      radius: 8, color: '#FF6B35', fillColor: '#FF6B35', fillOpacity: 0.9
    }).addTo(map).bindPopup('You are here');
    // Job markers
    ${markers}
  </script>
</body>
</html>`;
}

export default function JobsNearMeScreen({ navigation }: Props) {
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [jobs, setJobs] = useState<NearbyJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [locationName, setLocationName] = useState('');

  const requestLocation = useCallback(() => {
    setLocating(true);
    setError('');
    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLon(longitude);
        setLocating(false);
        fetchNearby(latitude, longitude, radiusKm);
      },
      (err) => {
        setLocating(false);
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, [radiusKm]);

  const fetchNearby = useCallback(
    async (latitude: number, longitude: number, radius: number) => {
      setLoading(true);
      setError('');
      try {
        const result = await getNearbyJobs(latitude, longitude, radius, 50);
        setJobs(result.jobs);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch nearby jobs');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleRadiusChange = (km: number) => {
    setRadiusKm(km);
    if (lat !== null && lon !== null) {
      fetchNearby(lat, lon, km);
    }
  };

  const renderItem = ({ item }: { item: NearbyJob }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>{item.distanceKm} km</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.jobOrg}>{item.organization || item.board || '–'}</Text>
        {item.city ? <Text style={styles.jobCity}>{item.city}, {item.state}</Text> : null}
        {item.last_date ? (
          <Text style={styles.dateText}>Last date: {item.last_date}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  const showMap = lat !== null && lon !== null && WebView !== null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>📍 Jobs Near Me</Text>
        {locationName ? (
          <Text style={styles.locationName}>{locationName}</Text>
        ) : null}
      </View>

      {/* Radius selector */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>Radius:</Text>
        {RADIUS_OPTIONS.map((km) => (
          <TouchableOpacity
            key={km}
            style={[styles.radiusBtn, radiusKm === km && styles.radiusBtnActive]}
            onPress={() => handleRadiusChange(km)}
          >
            <Text
              style={[styles.radiusBtnText, radiusKm === km && styles.radiusBtnTextActive]}
            >
              {km} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map (Leaflet via WebView) */}
      {showMap ? (
        <View style={styles.mapContainer}>
          <WebView
            source={{ html: buildMapHtml(lat!, lon!, jobs) }}
            style={styles.map}
            originWhitelist={['*']}
          />
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          {WebView === null ? (
            <Text style={styles.placeholderText}>
              Map requires react-native-webview.{'\n'}
              Run: npm install react-native-webview{'\n'}
              Then: cd ios && pod install
            </Text>
          ) : (
            <Text style={styles.placeholderText}>
              Enable location to see the map
            </Text>
          )}
        </View>
      )}

      {/* Enable Location button */}
      {lat === null && (
        <TouchableOpacity
          style={styles.enableBtn}
          onPress={requestLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.enableBtnText}>📍 Enable Location</Text>
          )}
        </TouchableOpacity>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Jobs list */}
      {lat !== null && (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            loading ? (
              <ActivityIndicator color="#FF6B35" style={{ marginVertical: 12 }} />
            ) : (
              <Text style={styles.resultCount}>
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} within {radiusKm} km
              </Text>
            )
          }
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>No jobs found within {radiusKm} km.</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#004E89',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  locationName: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  radiusLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  radiusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  radiusBtnActive: {
    backgroundColor: '#004E89',
    borderColor: '#004E89',
  },
  radiusBtnText: {
    fontSize: 12,
    color: '#374151',
  },
  radiusBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  mapContainer: {
    height: 220,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 12,
    borderRadius: 10,
  },
  placeholderText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  enableBtn: {
    backgroundColor: '#FF6B35',
    margin: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultCount: {
    marginHorizontal: 12,
    marginVertical: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  distanceBadge: {
    backgroundColor: '#004E89',
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 3,
  },
  jobOrg: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 2,
  },
  jobCity: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    margin: 12,
    fontSize: 13,
  },
});
