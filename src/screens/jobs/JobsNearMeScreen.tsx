/**
 * Jobs Near Me Screen
 *
 * Flow:
 *  1. Prompt user to enable location
 *  2. Get browser/device geolocation
 *  3. Reverse-geocode via /api/geo/reverse (server proxy – API key stays on server)
 *  4. Fetch nearby government jobs via /api/jobs/nearby
 *  5. Display jobs list with distance; allow radius/filter changes
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { reverseGeocode, fetchNearbyJobs, Job } from '../../services/jobsService';

type RadiusKm = 10 | 25 | 50 | 100;

const RADIUS_OPTIONS: RadiusKm[] = [10, 25, 50, 100];

type ScreenState = 'idle' | 'locating' | 'loading' | 'loaded' | 'error';

export default function JobsNearMeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [placeLabel, setPlaceLabel] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(25);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);

  // ── Request location & load jobs ──────────────────────────────────────────
  const enableLocation = useCallback(() => {
    setScreenState('locating');
    setErrorMsg('');

    Geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLat(latitude);
        setUserLon(longitude);

        try {
          setScreenState('loading');

          // Reverse-geocode (proxied through our server, key never on client)
          let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          try {
            const geo = await reverseGeocode(latitude, longitude);
            label = [geo.city, geo.district, geo.state].filter(Boolean).join(', ') || geo.displayName || label;
          } catch {
            // Non-fatal – use raw coordinates as label
          }
          setPlaceLabel(label);

          // Fetch nearby jobs
          const result = await fetchNearbyJobs({ lat: latitude, lon: longitude, radiusKm });
          setJobs(result.jobs);
          setTotal(result.total);
          setScreenState('loaded');
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to load jobs. Please try again.');
          setScreenState('error');
        }
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Location permission denied. Please allow location access in your device settings.',
          2: 'Location unavailable. Please check your GPS/network.',
          3: 'Location request timed out. Please try again.',
        };
        setErrorMsg(messages[err.code] || 'Failed to get location.');
        setScreenState('error');
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  }, [radiusKm]);

  // ── Reload when radius changes ────────────────────────────────────────────
  const changeRadius = useCallback(
    async (newRadius: RadiusKm) => {
      setRadiusKm(newRadius);
      if (userLat === null || userLon === null) return;

      setScreenState('loading');
      try {
        const result = await fetchNearbyJobs({ lat: userLat, lon: userLon, radiusKm: newRadius });
        setJobs(result.jobs);
        setTotal(result.total);
        setScreenState('loaded');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to reload jobs.');
        setScreenState('error');
      }
    },
    [userLat, userLon]
  );

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderJobCard = ({ item }: { item: Job }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceBadgeText}>{item.source}</Text>
        </View>
        <Text style={styles.distanceText}>{item.distance_km} km away</Text>
      </View>

      <Text style={styles.jobTitle}>{item.title}</Text>
      <Text style={styles.department}>{item.department}</Text>
      <Text style={styles.locationText}>📍 {item.location_text}</Text>

      {item.last_date && (
        <Text style={styles.lastDate}>
          ⏰ Last date: {new Date(item.last_date).toLocaleDateString('en-IN')}
        </Text>
      )}

      <TouchableOpacity
        style={styles.applyButton}
        onPress={() => Linking.openURL(item.apply_url)}
        accessibilityLabel={`Apply for ${item.title}`}
      >
        <Text style={styles.applyButtonText}>Apply Now →</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Idle state ────────────────────────────────────────────────────────────
  if (screenState === 'idle' || screenState === 'error') {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.heroEmoji}>📍</Text>
        <Text style={styles.heroTitle}>Jobs Near Me</Text>
        <Text style={styles.heroSubtitle}>
          Discover government job openings near your current location – UPSC, SSC, State PSC, RRB, PSUs and more.
        </Text>

        {screenState === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.enableButton} onPress={enableLocation}>
          <Text style={styles.enableButtonText}>
            {screenState === 'error' ? '🔄 Try Again' : '📡 Enable Location'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.privacyNote}>
          🔒 Your location is used only for this session and is never stored.
        </Text>
      </View>
    );
  }

  // ── Locating / loading ────────────────────────────────────────────────────
  if (screenState === 'locating' || screenState === 'loading') {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>
          {screenState === 'locating' ? 'Getting your location…' : 'Loading nearby jobs…'}
        </Text>
      </View>
    );
  }

  // ── Loaded ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Jobs Near Me</Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          📍 {placeLabel}
        </Text>
      </View>

      {/* Map placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderEmoji}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>
          {userLat?.toFixed(4)}, {userLon?.toFixed(4)}
        </Text>
        <Text style={styles.mapPlaceholderHint}>Map view requires react-native-maps setup</Text>
      </View>

      {/* Radius selector */}
      <View style={styles.radiusContainer}>
        <Text style={styles.radiusLabel}>Radius:</Text>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
            onPress={() => changeRadius(r)}
          >
            <Text style={[styles.radiusChipText, radiusKm === r && styles.radiusChipTextActive]}>
              {r} km
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results summary */}
      <Text style={styles.resultsSummary}>
        {total} job{total !== 1 ? 's' : ''} within {radiusKm} km
      </Text>

      {/* Jobs list */}
      {jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyText}>No jobs found within {radiusKm} km.</Text>
          <Text style={styles.emptyHint}>Try expanding the radius.</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.id}
          renderItem={renderJobCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  enableButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginBottom: 16,
  },
  enableButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  privacyNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#1E3A8A',
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#BFDBFE',
    marginTop: 4,
  },
  mapPlaceholder: {
    height: 120,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  mapPlaceholderEmoji: {
    fontSize: 32,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: '#1E40AF',
    marginTop: 4,
  },
  mapPlaceholderHint: {
    fontSize: 11,
    color: '#93C5FD',
    marginTop: 2,
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  radiusChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
  },
  radiusChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  radiusChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  radiusChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  resultsSummary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  distanceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  department: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  lastDate: {
    fontSize: 12,
    color: '#D97706',
    marginBottom: 8,
  },
  applyButton: {
    backgroundColor: '#004E89',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
