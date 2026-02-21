/**
 * JobsNearMeScreen
 * Gets the user's location, reverse-geocodes it via /api/geo/reverse,
 * then shows nearby government jobs within a chosen radius.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { getNearbyJobs, reverseGeocode, NearbyJob } from '../../services/jobsService';

const RADIUS_OPTIONS: Array<10 | 25 | 50 | 100> = [10, 25, 50, 100];

export default function JobsNearMeScreen({ navigation }: any) {
  const [locationLabel, setLocationLabel] = useState('');
  const [coords,        setCoords]        = useState<{ lat: number; lon: number } | null>(null);
  const [radius,        setRadius]        = useState<10 | 25 | 50 | 100>(25);
  const [jobs,          setJobs]          = useState<NearbyJob[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [locating,      setLocating]      = useState(false);
  const [error,         setError]         = useState('');

  // ── Request location permission (Android) ─────────────────────────────────
  const requestAndroidPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  // ── Get current location ──────────────────────────────────────────────────
  const enableLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const ok = await requestAndroidPermission();
      if (!ok) {
        setError('Location permission denied.');
        setLocating(false);
        return;
      }

      Geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords({ lat, lon });

          // Reverse geocode
          try {
            const geo = await reverseGeocode(lat, lon);
            const parts = [
              geo.address?.city,
              geo.address?.district,
              geo.address?.state,
            ].filter(Boolean);
            setLocationLabel(parts.length ? `Near: ${parts.join(', ')}` : 'Near: Your location');
          } catch {
            setLocationLabel('Near: Your location');
          }

          setLocating(false);
          fetchNearbyJobs(lat, lon, radius);
        },
        (err) => {
          setError('Could not get location. ' + err.message);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    } catch {
      setError('Location error. Please try again.');
      setLocating(false);
    }
  };

  // ── Fetch nearby jobs ─────────────────────────────────────────────────────
  const fetchNearbyJobs = useCallback(
    async (lat: number, lon: number, r: 10 | 25 | 50 | 100) => {
      setLoading(true);
      setError('');
      try {
        const res = await getNearbyJobs(lat, lon, r);
        setJobs(res.results);
      } catch {
        setError('Failed to load nearby jobs.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Radius change ─────────────────────────────────────────────────────────
  const changeRadius = (r: 10 | 25 | 50 | 100) => {
    setRadius(r);
    if (coords) fetchNearbyJobs(coords.lat, coords.lon, r);
  };

  // ── Render a job card ─────────────────────────────────────────────────────
  const renderJob = ({ item }: { item: NearbyJob }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.distance}>{item.distance_km} km</Text>
      </View>
      {item.organization ? <Text style={styles.cardOrg}>{item.organization}</Text> : null}
      <View style={styles.cardMeta}>
        {item.board    ? <Text style={styles.badge}>{item.board}</Text>    : null}
        {item.category ? <Text style={styles.badge}>{item.category}</Text> : null}
        {item.status   ? (
          <Text style={[styles.badge, item.status === 'open' && styles.badgeOpen]}>
            {item.status}
          </Text>
        ) : null}
      </View>
      <Text style={styles.location}>
        📍 {[item.city, item.district, item.state].filter(Boolean).join(', ')}
      </Text>
      {item.last_date ? (
        <Text style={styles.date}>🗓 Last date: {item.last_date}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📍 Jobs Near Me</Text>
        {locationLabel ? (
          <Text style={styles.locationLabel}>{locationLabel}</Text>
        ) : null}
      </View>

      {/* Enable location button */}
      {!coords ? (
        <View style={styles.enableBox}>
          <Text style={styles.enableHint}>
            Allow location access to discover government jobs near you.
          </Text>
          <TouchableOpacity
            style={[styles.enableBtn, locating && styles.btnDisabled]}
            onPress={enableLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.enableBtnText}>📍 Enable Location</Text>
            )}
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      ) : (
        <>
          {/* Radius selector */}
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Radius:</Text>
            {RADIUS_OPTIONS.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusPill, radius === r && styles.radiusPillActive]}
                onPress={() => changeRadius(r)}
              >
                <Text style={[styles.radiusPillText, radius === r && styles.radiusPillTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Refresh button */}
          <TouchableOpacity style={styles.refreshBtn} onPress={enableLocation}>
            <Text style={styles.refreshBtnText}>🔄 Refresh Location</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Results */}
          {!loading && jobs.length === 0 && !error ? (
            <Text style={styles.empty}>No jobs found within {radius} km.</Text>
          ) : null}

          <FlatList
            data={jobs}
            keyExtractor={item => item.id}
            renderItem={renderJob}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              loading ? <ActivityIndicator style={styles.spinner} color="#4F46E5" /> : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: '#F3F4F6' },
  header:                { backgroundColor: '#4F46E5', padding: 16 },
  headerTitle:           { fontSize: 20, fontWeight: '800', color: 'white' },
  locationLabel:         { fontSize: 13, color: '#C7D2FE', marginTop: 4 },
  enableBox:             { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  enableHint:            { fontSize: 15, color: '#374151', textAlign: 'center', marginBottom: 24 },
  enableBtn:             {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 200,
    alignItems: 'center',
  },
  btnDisabled:           { opacity: 0.6 },
  enableBtnText:         { color: 'white', fontSize: 16, fontWeight: '700' },
  radiusRow:             {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  radiusLabel:           { fontSize: 13, color: '#374151', fontWeight: '600' },
  radiusPill:            {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  radiusPillActive:      { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  radiusPillText:        { fontSize: 12, color: '#374151' },
  radiusPillTextActive:  { color: 'white', fontWeight: '600' },
  refreshBtn:            {
    marginHorizontal: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  refreshBtnText:        { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  list:                  { paddingHorizontal: 12, paddingBottom: 24 },
  card:                  {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle:             { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  distance:              { fontSize: 13, fontWeight: '700', color: '#4F46E5', marginLeft: 8 },
  cardOrg:               { fontSize: 12, color: '#4B5563', marginBottom: 6 },
  cardMeta:              { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  badge:                 {
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    color: '#374151',
    textTransform: 'capitalize',
  },
  badgeOpen:             { backgroundColor: '#D1FAE5', color: '#065F46' },
  location:              { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  date:                  { fontSize: 11, color: '#9CA3AF' },
  error:                 { color: '#EF4444', textAlign: 'center', margin: 12 },
  empty:                 { textAlign: 'center', marginTop: 40, color: '#9CA3AF', fontSize: 14, paddingHorizontal: 24 },
  spinner:               { marginVertical: 16 },
});
