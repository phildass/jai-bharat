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
