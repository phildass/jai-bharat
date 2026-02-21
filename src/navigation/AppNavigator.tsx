/**
 * App Navigator
 * Top-level navigation for Jai Bharat: Core, Learn Govt Jobs, Learn IAS, Jobs Search
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import JobsNearMeScreen from '../screens/jobs/JobsNearMeScreen';
import JobsSearchScreen from '../screens/jobs/JobsSearchScreen';

type Screen = 'Home' | 'Jobs' | 'JobDetail' | 'JobsNearMe';

interface NavParams {
  jobId?: number;
}

export default function AppNavigator() {
  const [screen, setScreen] = React.useState<Screen>('Home');
  const [params, setParams] = React.useState<NavParams>({});

  const navigation = {
    navigate: (s: string, p?: Record<string, unknown>) => {
      setScreen(s as Screen);
      setParams((p as NavParams) ?? {});
    },
    goBack: () => setScreen('Home'),
  };

  if (screen === 'Jobs') {
    return <JobsSearchScreen navigation={navigation} />;
  }
  if (screen === 'JobDetail') {
    return (
      <JobDetailScreen
        route={{ params: { jobId: params.jobId } }}
        navigation={navigation}
      />
    );
  }
  if (screen === 'JobsNearMe') {
    return <JobsNearMeScreen navigation={navigation} />;
  }

  // Home screen
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🇮🇳 Jai Bharat</Text>
      <Text style={styles.subtitle}>India Govt. Jobs. Everywhere. Anywhere. Every Job.</Text>
      <TouchableOpacity
        style={styles.jobsButton}
        onPress={() => navigation.navigate('Jobs')}
        accessibilityRole="button"
        accessibilityLabel="Search government jobs"
      >
        <Text style={styles.jobsButtonText}>🔍 Search Govt Jobs</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.nearMeButton}
        onPress={() => navigation.navigate('JobsNearMe')}
        accessibilityRole="button"
        accessibilityLabel="Find government jobs near your location"
      >
        <Text style={styles.nearMeEmoji}>📍</Text>
        <View style={styles.nearMeTextContainer}>
          <Text style={styles.nearMeTitle}>Jobs Near Me</Text>
          <Text style={styles.nearMeSubtitle}>Find govt. jobs near your location</Text>
        </View>
        <Text style={styles.nearMeArrow}>→</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 32,
  },
  jobsButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  nearMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
    width: '100%',
  },
  nearMeEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  nearMeTextContainer: {
    flex: 1,
  },
  nearMeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  nearMeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  nearMeArrow: {
    fontSize: 20,
    color: '#93C5FD',
    marginLeft: 8,
  },
});

