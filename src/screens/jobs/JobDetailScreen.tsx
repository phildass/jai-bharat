/**
 * Job Detail Screen
 * Displays full details for a single government job.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  SafeAreaView,
} from 'react-native';
import { getJobById, Job } from '../../services/jobsService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Props {
  navigation: any;
  route: { params: { jobId: string } };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function JobDetailScreen({ route }: Props) {
  const { jobId } = route.params;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getJobById(jobId)
      .then((data) => {
        if (!cancelled) setJob(data);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || 'Failed to load job');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const openUrl = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }

  if (error || !job) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>{error || 'Job not found'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{job.title}</Text>
          <Text style={styles.org}>{job.organization}</Text>
          <View style={styles.badgeRow}>
            {job.category ? <Text style={styles.badge}>{job.category}</Text> : null}
            <Text style={[styles.statusBadge, statusStyle(job.status)]}>{job.status}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={styles.section}>
          {renderRow('📍 Location', [job.city, job.district, job.state].filter(Boolean).join(', '))}
          {renderRow('📅 Last Date', job.last_date)}
          {renderRow('💼 Vacancies', job.vacancies?.toString())}
        </View>

        {/* Description */}
        {job.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{job.description}</Text>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actions}>
          {job.apply_url ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => openUrl(job.apply_url)}
              accessibilityRole="link"
              accessibilityLabel="Apply online"
            >
              <Text style={styles.primaryBtnText}>Apply Online</Text>
            </TouchableOpacity>
          ) : null}
          {job.notification_url ? (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => openUrl(job.notification_url)}
              accessibilityRole="link"
              accessibilityLabel="Download notification"
            >
              <Text style={styles.secondaryBtnText}>📄 Download Notification</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderRow(label: string, value?: string) {
  if (!value) return null;
  return (
    <View style={styles.row} key={label}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function statusStyle(status: string) {
  switch (status) {
    case 'active':
      return styles.statusActive;
    case 'closed':
      return styles.statusClosed;
    case 'upcoming':
      return styles.statusUpcoming;
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  scroll: {
    padding: 16,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  org: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: 12,
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: '600',
    overflow: 'hidden',
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  statusUpcoming: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  rowValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
  },
});
