/**
 * OTP Verification Screen
 * Allows users to enter the OTP received after payment to activate their subscription
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { verifyOTP } from '../../services/subscriptionService';

interface OTPVerificationScreenProps {
  userId: string;
  onSuccess: () => void;
}

export default function OTPVerificationScreen({ userId, onSuccess }: OTPVerificationScreenProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await verifyOTP(userId, otp);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const contactSupport = () => {
    Linking.openURL(
      `mailto:support@jaibharat.cloud?subject=OTP Verification Issue&body=User ID: ${userId}`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>
          Thank you for your payment. Please enter the OTP you received.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            <Text style={styles.bold}>Check your terminal/console</Text> for the OTP.{'\n'}
            It may take up to 5 minutes to arrive.
          </Text>
        </View>

        <Text style={styles.label}>Enter OTP</Text>
        <TextInput
          style={styles.otpInput}
          value={otp}
          onChangeText={(text) => setOtp(text.replace(/\D/g, ''))}
          placeholder="000000"
          maxLength={6}
          keyboardType="numeric"
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, (loading || otp.length < 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || otp.length < 6}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Verifying...' : 'Verify & Activate'}
          </Text>
        </TouchableOpacity>

        <View style={styles.supportSection}>
          <Text style={styles.supportText}>
            Didn't receive your OTP or having trouble verifying?
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={contactSupport}>
            <Text style={styles.secondaryButtonText}>📧 Contact Support</Text>
          </TouchableOpacity>
          <Text style={styles.supportEmail}>support@jaibharat.cloud</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successIcon: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  supportSection: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  supportText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  supportEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
