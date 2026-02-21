/**
 * JobDetailScreen
 * Displays full details of a government job posting.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { getJobById, Job } from '../../services/jobsService';

export default function JobDetailScreen({ route, navigation }: any) {
  const { jobId } = route.params;

  const [job,     setJob]     = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getJobById(jobId);
        setJob(data);
        navigation.setOptions({ title: data.title });
      } catch {
        setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, navigation]);

  const openUrl = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Job not found.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Title block */}
      <Text style={styles.title}>{job.title}</Text>
      {job.organization ? <Text style={styles.org}>{job.organization}</Text> : null}

      {/* Badges */}
      <View style={styles.badgeRow}>
        {job.board    ? <Text style={styles.badge}>{job.board}</Text>    : null}
        {job.category ? <Text style={styles.badge}>{job.category}</Text> : null}
        {job.status   ? (
          <Text style={[styles.badge, job.status === 'open' && styles.badgeOpen]}>
            {job.status}
          </Text>
        ) : null}
      </View>

      {/* Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <Text style={styles.detail}>
          {[job.city, job.district, job.state].filter(Boolean).join(', ') || 'Pan India'}
        </Text>
        {job.location_text ? <Text style={styles.detailSub}>{job.location_text}</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Important Dates</Text>
        {job.posted_at  ? <Text style={styles.detail}>Posted: {job.posted_at}</Text>    : null}
        {job.last_date  ? (
          <Text style={[styles.detail, styles.lastDate]}>Last Date: {job.last_date}</Text>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {job.apply_url ? (
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => openUrl(job.apply_url)}
          >
            <Text style={styles.applyBtnText}>Apply Now →</Text>
          </TouchableOpacity>
        ) : null}

        {job.notification_url ? (
          <TouchableOpacity
            style={styles.notifyBtn}
            onPress={() => openUrl(job.notification_url)}
          >
            <Text style={styles.notifyBtnText}>📄 View Notification</Text>
          </TouchableOpacity>
        ) : null}

        {job.source_url ? (
          <TouchableOpacity
            style={styles.sourceBtn}
            onPress={() => openUrl(job.source_url)}
          >
            <Text style={styles.sourceBtnText}>🔗 Official Source</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F3F4F6' },
  content:        { padding: 16, paddingBottom: 40 },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title:          { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  org:            { fontSize: 15, color: '#4B5563', marginBottom: 10 },
  badgeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  badge:          {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    color: '#374151',
    textTransform: 'capitalize',
  },
  badgeOpen:      { backgroundColor: '#D1FAE5', color: '#065F46' },
  section:        {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle:   { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 },
  detail:         { fontSize: 14, color: '#1F2937', marginBottom: 2 },
  detailSub:      { fontSize: 12, color: '#6B7280', marginTop: 2 },
  lastDate:       { color: '#DC2626', fontWeight: '600' },
  actions:        { gap: 10, marginTop: 8 },
  applyBtn:       {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  applyBtnText:   { color: 'white', fontSize: 16, fontWeight: '700' },
  notifyBtn:      {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  notifyBtnText:  { color: '#374151', fontSize: 14, fontWeight: '600' },
  sourceBtn:      {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sourceBtnText:  { color: '#374151', fontSize: 14, fontWeight: '600' },
  error:          { color: '#EF4444', fontSize: 16, marginBottom: 12 },
  back:           { color: '#4F46E5', fontSize: 14 },
});
