import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.jaibharat.cloud';

export async function register(data: {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Registration failed');
    }
    throw new Error('Network error. Please try again.');
  }
}

export async function login(data: { email: string; password: string }) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Login failed');
    }
    throw new Error('Network error. Please try again.');
  }
}

export async function logout() {
  await AsyncStorage.multiRemove(['user_id', 'jwt_token', 'user_email', 'user_name']);
}

export async function startPhoneOTP(phone: string): Promise<{ message: string }> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/otp/send`, { phone });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to send OTP');
    }
    throw new Error('Network error. Please try again.');
  }
}

export async function verifyPhoneOTP(data: {
  phone: string;
  otp: string;
  deviceId: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; phone: string; name?: string };
  entitlements: { hasAccess: boolean; reason: string; hoursRemaining?: number };
}> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/otp/verify`, data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'OTP verification failed');
    }
    throw new Error('Network error. Please try again.');
  }
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ token: string; refreshToken: string }> {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/token/refresh`, { refreshToken });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Token refresh failed');
    }
    throw new Error('Network error. Please try again.');
  }
}

export async function getMe(accessToken: string): Promise<{
  user: { id: string; phone: string; name?: string; email?: string };
  entitlements: { hasAccess: boolean; reason: string; hoursRemaining?: number };
}> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch profile');
    }
    throw new Error('Network error. Please try again.');
  }
}
