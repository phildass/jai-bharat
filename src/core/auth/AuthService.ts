/**
 * Authentication Service
 * Handles SSO authentication across all modules
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../../modules/interfaces';
import {
  login as apiLogin,
  logout as apiLogout,
  startPhoneOTP,
  verifyPhoneOTP,
  refreshAccessToken,
  getMe,
} from '../../services/authService';

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: AuthToken | null;
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
  };

  private listeners: Array<(state: AuthState) => void> = [];

  /**
   * Login with credentials
   */
  async login(email: string, password: string): Promise<AuthState> {
    try {
      const response = await apiLogin({ email, password });

      this.authState = {
        isAuthenticated: true,
        user: {
          id: response.user_id,
          name: response.full_name || '',
          email: response.email,
          phone: '',
          preferences: {
            language: 'hi',
            voiceEnabled: true,
            notificationsEnabled: true,
            targetExams: [],
          },
          documents: [],
          eligibility: {
            education: [],
            age: 0,
            category: 'GEN',
            state: '',
            district: '',
          },
          location: {
            state: '',
            district: '',
          },
        },
        token: {
          accessToken: response.token,
          refreshToken: '',
          expiresIn: 2592000, // 30 days in seconds
          tokenType: 'Bearer',
        },
      };

      this.notifyListeners();
      await this.persistAuthState();

      return this.authState;
    } catch (error) {
      throw new Error('Login failed: ' + (error as Error).message);
    }
  }

  /**
   * Send OTP to phone number
   */
  async startOTP(phone: string): Promise<void> {
    await startPhoneOTP(phone);
  }

  /**
   * Login with phone OTP
   */
  async loginWithOTP(phone: string, otp: string): Promise<AuthState> {
    try {
      const deviceId = (await AsyncStorage.getItem('device_id')) || 'unknown-device';
      const response = await verifyPhoneOTP({ phone, otp, deviceId });

      this.authState = {
        isAuthenticated: true,
        user: this.buildUserProfile({
          id: response.user.id,
          phone: response.user.phone,
          name: response.user.name,
        }),
        token: {
          accessToken: response.token,
          refreshToken: response.refreshToken,
          expiresIn: 2592000,
          tokenType: 'Bearer',
        },
      };

      this.notifyListeners();
      await this.persistAuthState();
      await AsyncStorage.setItem('refresh_token', response.refreshToken);
      await AsyncStorage.setItem('user_phone', response.user.phone);

      return this.authState;
    } catch (error) {
      throw new Error('OTP login failed: ' + (error as Error).message);
    }
  }

  /**
   * Restore auth state from AsyncStorage on app launch
   */
  async loadStoredAuth(): Promise<void> {
    try {
      const [accessToken, refreshToken, userId, userPhone] = await AsyncStorage.multiGet([
        'jwt_token',
        'refresh_token',
        'user_id',
        'user_phone',
      ]);

      const token = accessToken[1];
      if (!token) return;

      try {
        const profile = await getMe(token);
        this.authState = {
          isAuthenticated: true,
          user: this.buildUserProfile({
            id: profile.user.id,
            phone: profile.user.phone,
            name: profile.user.name,
            email: profile.user.email,
          }),
          token: {
            accessToken: token,
            refreshToken: refreshToken[1] || '',
            expiresIn: 2592000,
            tokenType: 'Bearer',
          },
        };
        this.notifyListeners();
      } catch {
        // Token may be expired; attempt a refresh
        const storedRefresh = refreshToken[1];
        if (storedRefresh) {
          await this.refreshAuth();
        }
      }
    } catch {
      // Storage read failed; stay unauthenticated
    }
  }

  /**
   * Refresh access token using stored refresh token
   */
  async refreshAuth(): Promise<void> {
    const storedRefresh = await AsyncStorage.getItem('refresh_token');
    if (!storedRefresh) throw new Error('No refresh token available');

    try {
      const result = await refreshAccessToken(storedRefresh);
      if (this.authState.token) {
        this.authState.token = {
          ...this.authState.token,
          accessToken: result.token,
          refreshToken: result.refreshToken,
        };
      }
      await AsyncStorage.setItem('jwt_token', result.token);
      await AsyncStorage.setItem('refresh_token', result.refreshToken);
      this.notifyListeners();
    } catch (error) {
      throw new Error('Token refresh failed: ' + (error as Error).message);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
    };

    this.notifyListeners();
    await apiLogout();
    await this.clearAuthState();
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return this.authState;
  }

  /**
   * Get current user
   */
  getCurrentUser(): UserProfile | null {
    return this.authState.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated;
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<AuthToken> {
    if (!this.authState.token) {
      throw new Error('No token to refresh');
    }

    try {
      const result = await refreshAccessToken(this.authState.token.refreshToken);
      this.authState.token = {
        ...this.authState.token,
        accessToken: result.token,
        refreshToken: result.refreshToken,
      };
      await this.persistAuthState();
      await AsyncStorage.setItem('refresh_token', result.refreshToken);
      return this.authState.token;
    } catch (error) {
      throw new Error('Token refresh failed: ' + (error as Error).message);
    }
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.authState));
  }

  /**
   * Build a UserProfile from partial API data
   */
  private buildUserProfile(data: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
  }): UserProfile {
    return {
      id: data.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone,
      preferences: {
        language: 'hi',
        voiceEnabled: true,
        notificationsEnabled: true,
        targetExams: [],
      },
      documents: [],
      eligibility: {
        education: [],
        age: 0,
        category: 'GEN',
        state: '',
        district: '',
      },
      location: {
        state: '',
        district: '',
      },
    };
  }

  /**
   * Persist auth state to storage
   */
  private async persistAuthState(): Promise<void> {
    if (this.authState.token) {
      await AsyncStorage.setItem('jwt_token', this.authState.token.accessToken);
    }
    if (this.authState.user) {
      await AsyncStorage.setItem('user_id', this.authState.user.id);
      await AsyncStorage.setItem('user_email', this.authState.user.email);
      if (this.authState.user.name) {
        await AsyncStorage.setItem('user_name', this.authState.user.name);
      }
    }
  }

  /**
   * Clear auth state from storage
   */
  private async clearAuthState(): Promise<void> {
    await AsyncStorage.multiRemove(['user_id', 'jwt_token', 'user_email', 'user_name']);
  }

  /**
   * Mock login implementation
   * TODO: Replace with actual API integration
   */
  private async mockLogin(email: string, password: string): Promise<{ user: UserProfile; token: AuthToken }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: {
            id: '1',
            name: 'Test User',
            email,
            phone: '+91-9876543210',
            preferences: {
              language: 'hi',
              voiceEnabled: true,
              notificationsEnabled: true,
              targetExams: ['ssc', 'upsc'],
            },
            documents: [],
            eligibility: {
              education: ['12th', 'graduate'],
              age: 25,
              category: 'GEN',
              state: 'Maharashtra',
              district: 'Pune',
            },
            location: {
              state: 'Maharashtra',
              district: 'Pune',
              taluk: 'Pune City',
            },
          },
          token: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        });
      }, 1000);
    });
  }

  /**
   * Mock OTP login implementation
   * TODO: Replace with actual API integration
   */
  private async mockOTPLogin(phone: string, otp: string): Promise<{ user: UserProfile; token: AuthToken }> {
    return this.mockLogin('user@example.com', 'password');
  }

  /**
   * Mock token refresh implementation
   * TODO: Replace with actual API integration
   */
  private async mockRefreshToken(refreshToken: string): Promise<AuthToken> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          accessToken: 'new-mock-access-token',
          refreshToken: 'new-mock-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        });
      }, 500);
    });
  }
}

// Singleton instance
export const authService = new AuthService();
