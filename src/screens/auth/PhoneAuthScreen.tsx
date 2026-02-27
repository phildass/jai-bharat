import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { authService } from '../../core/auth/AuthService';

interface PhoneAuthScreenProps {
  onSuccess: () => void;
}

export default function PhoneAuthScreen({ onSuccess }: PhoneAuthScreenProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    setLoading(true);
    try {
      await authService.startOTP(trimmed);
      setStep('otp');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authService.loginWithOTP(phone.trim(), trimmedOtp);
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🇮🇳</Text>
          </View>
          <Text style={styles.title}>Jai Bharat</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' ? 'Sign in with your phone number' : `Enter the OTP sent to ${phone}`}
          </Text>
        </View>

        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+91 XXXXX XXXXX"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                  maxLength={15}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>6-digit OTP</Text>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="• • • • • •"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading}
                />
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => { setStep('phone'); setOtp(''); }}
                disabled={loading}
              >
                <Text style={styles.linkButtonText}>← Change phone number</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
    fontSize: 22,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: '#A5B4FC',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '500',
  },
});
