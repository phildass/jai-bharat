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
      >
        <Text style={styles.jobsButtonText}>🔍 Search Govt Jobs</Text>
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
  },
  jobsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
