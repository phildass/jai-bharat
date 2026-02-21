/**
 * App Navigator
 * Top-level navigation for Jai Bharat: Core, Learn Govt Jobs, Learn IAS
 * TODO: Wire up full screen components for each module
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import JobsNearMeScreen from '../screens/jobs/JobsNearMeScreen';

export default function AppNavigator() {
  const [showJobsNearMe, setShowJobsNearMe] = useState(false);

  if (showJobsNearMe) {
    return (
      <View style={styles.fullScreen}>
        <TouchableOpacity style={styles.backButton} onPress={() => setShowJobsNearMe(false)}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <JobsNearMeScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🇮🇳 Jai Bharat</Text>
      <Text style={styles.subtitle}>India Govt. Jobs. Everywhere. Anywhere. Every Job.</Text>

      <TouchableOpacity
        style={styles.jobsNearMeButton}
        onPress={() => setShowJobsNearMe(true)}
        accessibilityLabel="Find government jobs near your location"
      >
        <Text style={styles.jobsNearMeEmoji}>📍</Text>
        <View style={styles.jobsNearMeTextContainer}>
          <Text style={styles.jobsNearMeTitle}>Jobs Near Me</Text>
          <Text style={styles.jobsNearMeSubtitle}>Find govt. jobs near your location</Text>
        </View>
        <Text style={styles.jobsNearMeArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E3A8A',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 40,
  },
  jobsNearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  jobsNearMeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  jobsNearMeTextContainer: {
    flex: 1,
  },
  jobsNearMeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  jobsNearMeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  jobsNearMeArrow: {
    fontSize: 20,
    color: '#93C5FD',
    marginLeft: 8,
  },
});
