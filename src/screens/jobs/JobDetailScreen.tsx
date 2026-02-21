/**
 * JobDetailScreen
 * Shows full details for a single government job.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Job, getJobById } from '../../services/jobsService';

const STATUS_LABELS: Record<string, string> = {
  open: '🟢 Open',
  closed: '🔴 Closed',
  result_out: '📋 Result Out',
  upcoming: '🔵 Upcoming',
};

interface Props {
  route?: { params?: { jobId?: number } };
  navigation?: { goBack: () => void };
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

export default function JobDetailScreen({ route, navigation }: Props) {
  const jobId = route?.params?.jobId;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided.');
      setLoading(false);
      return;
    }
    getJobById(jobId)
      .then(setJob)
      .catch(() => setError('Failed to load job details.'))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Job not found.'}</Text>
        <TouchableOpacity onPress={() => navigation?.goBack()} accessibilityRole="button">
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status + Category header */}
      <View style={styles.headerRow}>
        <Text style={styles.statusBadge}>{STATUS_LABELS[job.status] ?? job.status}</Text>
        {job.category ? <Text style={styles.categoryBadge}>{job.category}</Text> : null}
      </View>

      <Text style={styles.title}>{job.title}</Text>
      <Text style={styles.org}>{job.organisation}</Text>
      {job.location_label ? (
        <Text style={styles.location}>📍 {job.location_label}</Text>
      ) : null}

      {/* Key details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <InfoRow label="Vacancies" value={job.vacancies?.toLocaleString('en-IN')} />
        <InfoRow label="Salary / Pay Scale" value={job.salary} />
        <InfoRow label="Qualification" value={job.qualification} />
        <InfoRow label="Age Limit" value={job.age_limit} />
        <InfoRow label="State" value={job.state} />
        <InfoRow label="District" value={job.district} />
      </View>

      {/* Dates */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Important Dates</Text>
        <InfoRow label="Apply From" value={job.apply_start_date} />
        <InfoRow label="Last Date to Apply" value={job.apply_end_date} />
        <InfoRow label="Exam Date" value={job.exam_date} />
        <InfoRow label="Published On" value={new Date(job.published_at).toLocaleDateString('en-IN')} />
      </View>

      {/* Description */}
      {job.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Post</Text>
          <Text style={styles.description}>{job.description}</Text>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.buttonGroup}>
        {job.official_notification_url ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => Linking.openURL(job.official_notification_url!)}
            accessibilityRole="link"
            accessibilityLabel="View official notification"
          >
            <Text style={styles.primaryButtonText}>📄 View Notification</Text>
          </TouchableOpacity>
        ) : null}

        {job.source_url && job.source_url !== job.official_notification_url ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => Linking.openURL(job.source_url!)}
            accessibilityRole="link"
            accessibilityLabel="Apply online"
          >
            <Text style={styles.secondaryButtonText}>🌐 Apply Online</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  backLink: {
    color: '#004E89',
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryBadge: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 26,
  },
  org: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  buttonGroup: {
    gap: 10,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#004E89',
  },
  secondaryButtonText: {
    color: '#004E89',
    fontSize: 15,
    fontWeight: '600',
  },
});
