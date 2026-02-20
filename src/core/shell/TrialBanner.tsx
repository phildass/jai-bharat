/**
 * Trial Banner Component
 * Displays a countdown banner during the 24-hour free trial period
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TrialBannerProps {
  hoursRemaining: number;
}

export default function TrialBanner({ hoursRemaining }: TrialBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        ⏰ Free Trial: {hoursRemaining.toFixed(1)} hours remaining
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F59E0B',
    padding: 12,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
