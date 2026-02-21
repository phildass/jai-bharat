/**
 * Job Detail Screen
 * /jobs/:id – full job information
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getJob, Job } from '../../services/jobsService';

interface Props {
  route: { params: { jobId: string } };
  navigation: any;
}

export default function JobDetailScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJob(jobId)
      .then(setJob)
      .catch((e: any) => setError(e?.message || 'Failed to load job'))
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
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error || 'Job not found'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleApply = () => {
    if (job.apply_url) Linking.openURL(job.apply_url);
  };

  const handleNotification = () => {
    if (job.notification_url) Linking.openURL(job.notification_url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>{job.title}</Text>
          {job.organization ? (
            <Text style={styles.org}>{job.organization}</Text>
          ) : null}
          {job.board ? (
            <Text style={styles.board}>Board: {job.board}</Text>
          ) : null}
        </View>

        {/* Details */}
        <View style={styles.detailCard}>
          <Row label="Category"  value={job.category} />
          <Row label="Status"    value={job.status} highlight />
          <Row label="State"     value={job.state} />
          <Row label="District"  value={job.district} />
          <Row label="City"      value={job.city} />
          <Row label="Location"  value={job.location_text} />
          <Row label="Posted"    value={job.posted_at} />
          <Row label="Last Date" value={job.last_date} important />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {job.apply_url ? (
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </TouchableOpacity>
          ) : null}

          {job.notification_url ? (
            <TouchableOpacity style={styles.notifBtn} onPress={handleNotification}>
              <Text style={styles.notifBtnText}>📄 View Notification</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.footnote}>Job ID: {job.id}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
  important,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
  important?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          highlight && styles.highlight,
          important && styles.important,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  org: {
    fontSize: 15,
    color: '#FFE5D8',
    marginBottom: 2,
  },
  board: {
    fontSize: 13,
    color: '#FFE5D8',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    flex: 2,
    textAlign: 'right',
  },
  highlight: {
    color: '#10B981',
    fontWeight: '600',
  },
  important: {
    color: '#EF4444',
    fontWeight: '600',
  },
  actions: {
    gap: 10,
    marginBottom: 16,
  },
  applyBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notifBtn: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  notifBtnText: {
    color: '#4338CA',
    fontWeight: '600',
    fontSize: 14,
  },
  footnote: {
    fontSize: 11,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    margin: 16,
    fontSize: 14,
  },
  link: {
    color: '#FF6B35',
    margin: 16,
    fontSize: 14,
  },
});
