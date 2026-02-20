/**
 * Subscription Guard
 * Wraps the app to enforce subscription/trial access control.
 * Shows trial banner, payment screen, or OTP verification as appropriate.
 */

import React, { useEffect, useState, Fragment } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkSubscriptionStatus, SubscriptionStatus } from '../../services/subscriptionService';
import TrialBanner from './TrialBanner';
import PaymentRequiredScreen from './PaymentRequiredScreen';
import OTPVerificationScreen from './OTPVerificationScreen';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndCheckSubscription();
  }, []);

  const loadUserAndCheckSubscription = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('user_id');
      setUserId(storedUserId);

      if (storedUserId) {
        const status = await checkSubscriptionStatus(storedUserId);
        setSubscriptionStatus(status);
      }
      setLoading(false);
    } catch (error) {
      console.error('Subscription check error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (subscriptionStatus?.hasAccess) {
    return (
      <Fragment>
        {subscriptionStatus.isTrialActive && (
          <TrialBanner hoursRemaining={subscriptionStatus.hoursRemaining ?? 0} />
        )}
        {children}
      </Fragment>
    );
  }

  if (subscriptionStatus?.needsOTP && userId) {
    return (
      <OTPVerificationScreen
        userId={userId}
        onSuccess={loadUserAndCheckSubscription}
      />
    );
  }

  if (subscriptionStatus?.needsPayment && userId) {
    return <PaymentRequiredScreen userId={userId} />;
  }

  return <Fragment>{children}</Fragment>;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
