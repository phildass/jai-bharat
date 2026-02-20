/**
 * Jai Bharat Super-App Configuration
 */

export const AppConfig = {
  // App Information
  appName: 'Jai Bharat',
  appVersion: '1.0.0',
  appDescription: 'India Govt. Jobs. Everywhere. Anywhere. Every Job.',
  
  // API Configuration
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/v1',
    timeout: 10000,
    retryAttempts: 3,
  },
  
  // Authentication
  auth: {
    tokenExpiry: 3600, // 1 hour
    refreshTokenExpiry: 604800, // 7 days
    storageKey: 'jai_bharat_auth',
  },
  
  // Features
  features: {
    voiceSearch: true,
    locationServices: true,
    offlineMode: false, // Coming soon
    digiLockerIntegration: true,
    whatsAppNotifications: true,
  },
  
  // Voice Configuration
  voice: {
    defaultLanguage: 'hi',
    supportedLanguages: [
      'hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'kn', 'ml', 'or', 'pa', 'as', 'ur'
    ],
    maxRecordingDuration: 60, // seconds
  },
  
  // Location Configuration
  location: {
    defaultRadius: 50, // km
    maxRadius: 200, // km
    enableGeofencing: true,
  },
  
  // Modules
  modules: {
    'learn-govt-jobs': {
      enabled: true,
      icon: '📚',
      color: '#4A90E2',
    },
    'learn-ias': {
      enabled: true,
      icon: '🎓',
      color: '#E24A90',
    },
  },
  
  // Content Sync
  contentSync: {
    syncInterval: 3600000, // 1 hour in ms
    batchSize: 50,
  },
  
  // Progress Sync
  progressSync: {
    syncInterval: 300000, // 5 minutes in ms
    autoSync: true,
  },
  
  // Analytics
  analytics: {
    enabled: true,
    trackScreenViews: true,
    trackUserActions: true,
  },
  
  // Cache
  cache: {
    ttl: 3600, // 1 hour
    maxSize: 100, // MB
  },
  
  // UI Configuration
  ui: {
    theme: 'light', // 'light' | 'dark' | 'auto'
    primaryColor: '#FF6B35',
    secondaryColor: '#004E89',
    accentColor: '#F7931E',
  },
  
  // External Services
  externalServices: {
    bhashini: {
      enabled: true,
      apiUrl: process.env.BHASHINI_BASE_URL || 'https://api.bhashini.gov.in',
    },
    digiLocker: {
      enabled: true,
      clientId: process.env.DIGILOCKER_CLIENT_ID,
    },
    whatsapp: {
      enabled: true,
      businessId: process.env.WHATSAPP_BUSINESS_ID,
    },
  },
  
  // Contact
  contact: {
    website: 'https://jaibharat.cloud',
    email: 'support@jaibharat.cloud',
    phone: '+91-XXXX-XXXXXX',
  },

  // Subscription & Payment (24-hour trial + one-time lifetime payment)
  subscription: {
    trialDurationHours: 24,
    paymentUrl: process.env.PAYMENT_URL || 'https://aienter.in/payments/jaibharatpay',
    paymentAmount: 116.82, // ₹99 + 18% GST
    supportEmail: 'support@iiskills.cloud',
    otpExpiryMinutes: 10,
    otpMaxAttempts: 5,
  },
};

export default AppConfig;
