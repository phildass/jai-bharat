/**
 * Payment Required Screen
 * Shown when the user's 24-hour free trial has expired.
 * Guides the user through the payment flow with pre-payment OTP instructions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { initiatePayment } from '../../services/subscriptionService';

interface PaymentRequiredScreenProps {
  userId: string;
}

export default function PaymentRequiredScreen({ userId }: PaymentRequiredScreenProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  const handlePayClick = () => {
    setShowInstructions(true);
  };

  const proceedToPayment = async () => {
    try {
      const response = await initiatePayment(userId);
      await Linking.openURL(response.paymentUrl);
    } catch (error) {
      console.error('Payment initiation error:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  if (showInstructions) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Important Instructions</Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              After completing payment, you will receive an OTP
            </Text>
          </View>

          <View style={styles.stepsList}>
            <InstructionStep
              number="1"
              text="Complete your payment of ₹116.82 on the next page"
            />
            <InstructionStep
              number="2"
              text="You will receive an OTP (One-Time Password) within 5 minutes"
            />
            <InstructionStep
              number="3"
              text="Enter the OTP in the terminal/prompt when requested"
            />
            <InstructionStep
              number="4"
              text="Your subscription will be activated immediately after OTP verification"
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={proceedToPayment}>
            <Text style={styles.buttonText}>I Will Pay → Proceed to Payment</Text>
          </TouchableOpacity>

          <Text style={styles.secureText}>Secure payment powered by aienter.in</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        <Text style={styles.title}>Trial Period Ended</Text>
        <Text style={styles.subtitle}>Your 24-hour free trial has expired.</Text>
        <Text style={styles.ctaText}>Continue learning with a one-time payment!</Text>

        <View style={styles.pricingBox}>
          <Text style={styles.pricingLabel}>Lifetime Access</Text>
          <Text style={styles.priceAmount}>₹116.82</Text>
          <Text style={styles.pricingBreakdown}>(₹99 + 18% GST)</Text>

          <View style={styles.featuresList}>
            <Feature text="Lifetime access to all content" />
            <Feature text="All modules & courses" />
            <Feature text="Future updates included" />
            <Feature text="No recurring fees" />
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handlePayClick}>
          <Text style={styles.buttonText}>Pay Now</Text>
        </TouchableOpacity>

        <Text style={styles.paymentMethods}>
          Accepted: UPI, Cards, Net Banking & More
        </Text>
      </View>
    </ScrollView>
  );
}

function InstructionStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Text style={styles.checkmark}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  card: {
    margin: 20,
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
    alignItems: 'center',
    marginBottom: 16,
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  ctaText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 20,
  },
  pricingBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  pricingLabel: {
    fontSize: 13,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#111827',
  },
  pricingBreakdown: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  featuresList: {
    alignSelf: 'stretch',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkmark: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  paymentMethods: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 8,
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
  },
  stepsList: {
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  stepNumberText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    paddingTop: 4,
  },
  secureText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
