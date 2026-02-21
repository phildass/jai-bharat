/**
 * Jobs Near Me Screen
 * Shows a map centered on the user's location with job markers + list below.
 * Uses react-native-maps and react-native-geolocation-service.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  SafeAreaView,
  Dimensions,
  ScrollView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { getNearbyJobs, reverseGeocode, NearbyJob } from '../../services/jobsService';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RADIUS_OPTIONS: Array<10 | 25 | 50 | 100> = [10, 25, 50, 100];
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.42;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  navigation: any;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function JobsNearMeScreen({ navigation }: Props) {
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<10 | 25 | 50 | 100>(25);
  const [jobs, setJobs] = useState<NearbyJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList<NearbyJob>>(null);

  // ---------------------------------------------------------------------------
  // Get location + fetch jobs
  // ---------------------------------------------------------------------------
  const fetchLocation = useCallback(() => {
    setLocating(true);
    setError(null);

    Geolocation.requestAuthorization('whenInUse')
      .then((status) => {
        if (status !== 'granted') {
          throw new Error('Location permission denied. Please enable it in Settings.');
        }
        return new Promise<{ lat: number; lon: number }>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(new Error(err.message)),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });
      })
      .then(async (loc) => {
        setLocation(loc);
        setLocating(false);

        // Reverse geocode for display name
        reverseGeocode(loc.lat, loc.lon)
          .then((geo) => setLocationName(geo.city || geo.district || geo.state || ''))
          .catch(() => {});

        // Fetch nearby jobs
        setLoading(true);
        const result = await getNearbyJobs(loc.lat, loc.lon, radiusKm);
        setJobs(result.results);
      })
      .catch((err: Error) => {
        setLocating(false);
        setLoading(false);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [radiusKm]);

  // Re-fetch when radius changes (only if location is known)
  const handleRadiusChange = useCallback(
    async (r: 10 | 25 | 50 | 100) => {
      setRadiusKm(r);
      if (!location) return;
      setLoading(true);
      setError(null);
      try {
        const result = await getNearbyJobs(location.lat, location.lon, r);
        setJobs(result.results);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch jobs');
      } finally {
        setLoading(false);
      }
    },
    [location]
  );

  // ---------------------------------------------------------------------------
  // Marker ↔ list sync
  // ---------------------------------------------------------------------------
  const handleMarkerPress = useCallback(
    (job: NearbyJob, index: number) => {
      setSelectedJobId(job.id);
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    },
    []
  );

  const handleCardPress = useCallback(
    (job: NearbyJob) => {
      setSelectedJobId(job.id);
      if (job.lat != null && job.lon != null && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: job.lat,
            longitude: job.lon,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          },
          400
        );
      }
      navigation.navigate('JobDetail', { jobId: job.id });
    },
    [navigation]
  );

  // ---------------------------------------------------------------------------
  // Map region
  // ---------------------------------------------------------------------------
  const mapRegion: Region | undefined = location
    ? {
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: radiusKm * 0.018,
        longitudeDelta: radiusKm * 0.018,
      }
    : undefined;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Initial state: no location yet
  if (!location && !locating && !error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.illustrationEmoji}>📍</Text>
        <Text style={styles.ctaTitle}>Find Jobs Near You</Text>
        <Text style={styles.ctaSubtitle}>
          Discover government job opportunities within your chosen radius.
        </Text>
        <TouchableOpacity
          style={styles.enableBtn}
          onPress={fetchLocation}
          accessibilityRole="button"
        >
          <Text style={styles.enableBtnText}>Enable Location</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
        {locating ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.mapPlaceholderText}>Getting your location…</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton={Platform.OS === 'android'}
            accessibilityLabel="Jobs map"
          >
            {/* Radius circle */}
            {location && (
              <Circle
                center={{ latitude: location.lat, longitude: location.lon }}
                radius={radiusKm * 1000}
                strokeColor="rgba(255,107,53,0.6)"
                fillColor="rgba(255,107,53,0.08)"
              />
            )}

            {/* Job markers */}
            {jobs.map((job, index) =>
              job.lat != null && job.lon != null ? (
                <Marker
                  key={job.id}
                  coordinate={{ latitude: job.lat, longitude: job.lon }}
                  title={job.title}
                  description={`${job.organization} · ${job.distanceKm.toFixed(1)} km`}
                  pinColor={selectedJobId === job.id ? '#FF6B35' : '#004E89'}
                  onPress={() => handleMarkerPress(job, index)}
                />
              ) : null
            )}
          </MapView>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Location name + refresh */}
        <View style={styles.locationRow}>
          <Text style={styles.locationText} numberOfLines={1}>
            {locationName ? `📍 ${locationName}` : '📍 Current location'}
          </Text>
          <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>↺ Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Radius selector */}
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Radius:</Text>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
              onPress={() => handleRadiusChange(r)}
              accessibilityRole="radio"
              accessibilityState={{ checked: radiusKm === r }}
            >
              <Text
                style={[styles.radiusChipText, radiusKm === r && styles.radiusChipTextActive]}
              >
                {r} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Job list */}
      {loading ? (
        <View style={styles.listLoader}>
          <ActivityIndicator color="#FF6B35" />
          <Text style={styles.loadingText}>Finding jobs…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLocation}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, selectedJobId === item.id && styles.cardSelected]}
              onPress={() => handleCardPress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${item.distanceKm.toFixed(1)} km away`}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>
                    {item.distanceKm.toFixed(1)} km
                  </Text>
                </View>
              </View>
              <Text style={styles.cardOrg}>{item.organization}</Text>
              <View style={styles.cardMeta}>
                {item.city ? <Text style={styles.metaTag}>{item.city}</Text> : null}
                {item.category ? <Text style={styles.metaTag}>{item.category}</Text> : null}
              </View>
              {item.last_date ? (
                <Text style={styles.cardDate}>Last date: {item.last_date}</Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>No jobs found nearby</Text>
              <Text style={styles.emptySubtitle}>
                Try increasing the search radius or check back later.
              </Text>
            </View>
          }
          onScrollToIndexFailed={() => {}}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  illustrationEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  enableBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  enableBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  mapContainer: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mapPlaceholderText: {
    color: '#6B7280',
    fontSize: 14,
  },
  controls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radiusLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 4,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  radiusChipActive: {
    backgroundColor: '#FF6B35',
  },
  radiusChipText: {
    fontSize: 12,
    color: '#374151',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  distanceBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  distanceText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '700',
  },
  cardOrg: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 3,
  },
  metaTag: {
    fontSize: 11,
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
