/**
 * App Navigator
 * Top-level navigation for Jai Bharat: Core, Learn Govt Jobs, Learn IAS
 * TODO: Wire up full screen components for each module
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppNavigator() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🇮🇳 Jai Bharat</Text>
      <Text style={styles.subtitle}>India Govt. Jobs. Everywhere. Anywhere. Every Job.</Text>
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
  },
});
