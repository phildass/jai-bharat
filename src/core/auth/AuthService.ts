/**
 * Authentication Service
 * Handles SSO authentication across all modules
 */

import { UserProfile } from '../../modules/interfaces';

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
      // TODO: Replace with actual API call
      const response = await this.mockLogin(email, password);
      
      this.authState = {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
      };

      this.notifyListeners();
      await this.persistAuthState();
      
      return this.authState;
    } catch (error) {
      throw new Error('Login failed: ' + (error as Error).message);
    }
  }

  /**
   * Login with phone OTP
   */
  async loginWithOTP(phone: string, otp: string): Promise<AuthState> {
    try {
      // TODO: Replace with actual API call
      const response = await this.mockOTPLogin(phone, otp);
      
      this.authState = {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
      };

      this.notifyListeners();
      await this.persistAuthState();
      
      return this.authState;
    } catch (error) {
      throw new Error('OTP login failed: ' + (error as Error).message);
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
      // TODO: Replace with actual API call
      const response = await this.mockRefreshToken(this.authState.token.refreshToken);
      
      this.authState.token = response;
      await this.persistAuthState();
      
      return response;
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
   * Persist auth state to storage
   */
  private async persistAuthState(): Promise<void> {
    // TODO: Implement secure storage (AsyncStorage with encryption)
    console.log('Auth state persisted');
  }

  /**
   * Clear auth state from storage
   */
  private async clearAuthState(): Promise<void> {
    // TODO: Implement storage clearing
    console.log('Auth state cleared');
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
