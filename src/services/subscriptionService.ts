/**
 * Subscription Service
 * Frontend API service for subscription management:
 * - Check trial/subscription status
 * - Initiate payment redirect to aienter.in
 * - Verify OTP to activate lifetime subscription
 */

import axios from 'axios';
import { AppConfig } from '../../config/app.config';

const API_BASE_URL = AppConfig.api.baseUrl;

export interface SubscriptionStatus {
  hasAccess: boolean;
  reason: 'trial_active' | 'trial_expired' | 'subscription_active' | 'pending_otp';
  trialEndsAt?: string;
  hoursRemaining?: number;
  isTrialActive?: boolean;
  needsPayment: boolean;
  needsOTP: boolean;
}

export interface InitiatePaymentResponse {
  paymentUrl: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message?: string;
}

export async function checkSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const response = await axios.get<SubscriptionStatus>(
    `${API_BASE_URL}/api/subscription/status`,
    { params: { user_id: userId } }
  );
  return response.data;
}

export async function initiatePayment(userId: string): Promise<InitiatePaymentResponse> {
  const response = await axios.post<InitiatePaymentResponse>(
    `${API_BASE_URL}/api/subscription/initiate-payment`,
    { user_id: userId }
  );
  return response.data;
}

export async function verifyOTP(userId: string, otp: string): Promise<VerifyOTPResponse> {
  const response = await axios.post<VerifyOTPResponse>(
    `${API_BASE_URL}/api/subscription/verify-otp`,
    { user_id: userId, otp }
  );
  return response.data;
}
