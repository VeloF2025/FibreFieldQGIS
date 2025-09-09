// Configuration management for FibreField
export interface AppConfig {
  env: 'development' | 'production';
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId: string;
  };
  app: {
    name: string;
    version: string;
    startUrl: string;
    scope: string;
  };
  fibreflow: {
    apiUrl: string;
    webUrl: string;
  };
  offline: {
    cacheVersion: string;
    syncIntervalMinutes: number;
  };
  photo: {
    maxSizeMB: number;
    compressionQuality: number;
    maxDimension: number;
  };
  useEmulator: boolean;
}

// Validate environment variable exists
const requireEnv = (key: string): string => {
  // In Next.js, environment variables might not be available during build time
  // but will be available at runtime
  if (typeof window === 'undefined') {
    // Server-side: use process.env
    const value = process.env[key];
    if (!value && process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || '';
  } else {
    // Client-side: environment variables are injected by Next.js
    // Access them from the window object if Next.js hasn't hydrated yet
    const value = process.env[key];
    if (!value) {
      // Only warn in development and if not during initial hydration
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
        console.warn(`Missing environment variable: ${key}`);
      }
      return '';
    }
    return value;
  }
};

// Get environment variable with default
const getEnv = (key: string, defaultValue: string): string => {
  if (typeof window === 'undefined') {
    return process.env[key] || defaultValue;
  }
  return process.env[key] || defaultValue;
};

// Get number environment variable
const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Get boolean environment variable
const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  
  return value.toLowerCase() === 'true';
};

// Build configuration lazily to ensure environment variables are loaded
let _config: AppConfig | null = null;

export const getConfig = (): AppConfig => {
  if (_config) return _config;
  
  _config = {
    env: (getEnv('NEXT_PUBLIC_ENV', 'development') as 'development' | 'production'),
    
    firebase: {
      apiKey: requireEnv('NEXT_PUBLIC_FIREBASE_API_KEY') || 'AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc',
      authDomain: requireEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || 'fibreflow-73daf.firebaseapp.com',
      projectId: requireEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || 'fibreflow-73daf',
      storageBucket: requireEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET') || 'fibreflow-73daf.firebasestorage.app',
      messagingSenderId: requireEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID') || '296054249427',
      appId: requireEnv('NEXT_PUBLIC_FIREBASE_APP_ID') || '1:296054249427:web:2f0d6482daa6beb0624126',
      measurementId: requireEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID') || 'G-J0P7YRLGPW'
    },
    
    app: {
      name: getEnv('NEXT_PUBLIC_APP_NAME', 'FibreField'),
      version: getEnv('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
      startUrl: getEnv('NEXT_PUBLIC_PWA_START_URL', '/'),
      scope: getEnv('NEXT_PUBLIC_PWA_SCOPE', '/')
    },
    
    fibreflow: {
      apiUrl: requireEnv('NEXT_PUBLIC_FIBREFLOW_API_URL') || 'https://us-central1-fibreflow-73daf.cloudfunctions.net',
      webUrl: requireEnv('NEXT_PUBLIC_FIBREFLOW_WEB_URL') || 'https://fibreflow-73daf.web.app'
    },
    
    offline: {
      cacheVersion: getEnv('NEXT_PUBLIC_OFFLINE_CACHE_VERSION', 'v1'),
      syncIntervalMinutes: getEnvNumber('NEXT_PUBLIC_SYNC_INTERVAL_MINUTES', 5)
    },
    
    photo: {
      maxSizeMB: getEnvNumber('NEXT_PUBLIC_MAX_PHOTO_SIZE_MB', 10),
      compressionQuality: getEnvNumber('NEXT_PUBLIC_PHOTO_COMPRESSION_QUALITY', 0.8),
      maxDimension: getEnvNumber('NEXT_PUBLIC_MAX_PHOTO_DIMENSION', 1920)
    },
    
    useEmulator: getEnvBoolean('NEXT_PUBLIC_USE_FIREBASE_EMULATOR', false)
  };
  
  return _config;
};

// Export config as a getter for backward compatibility
export const config: AppConfig = new Proxy({} as AppConfig, {
  get(target, prop) {
    return getConfig()[prop as keyof AppConfig];
  }
});

// Validate configuration on startup
export const validateConfig = () => {
  const errors: string[] = [];
  
  // Validate Firebase config
  if (!config.firebase.apiKey) errors.push('Firebase API key is required');
  if (!config.firebase.projectId) errors.push('Firebase project ID is required');
  
  // Validate FibreFlow integration
  if (!config.fibreflow.apiUrl) errors.push('FibreFlow API URL is required');
  if (!config.fibreflow.webUrl) errors.push('FibreFlow web URL is required');
  
  // Validate photo settings
  if (config.photo.maxSizeMB <= 0) errors.push('Photo max size must be positive');
  if (config.photo.compressionQuality <= 0 || config.photo.compressionQuality > 1) {
    errors.push('Photo compression quality must be between 0 and 1');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration. Check environment variables.');
  }
  
  console.log('✅ Configuration validated successfully');
};

// Development helper - log config (without sensitive data)
export const logConfig = () => {
  if (config.env === 'development') {
    console.log('🔧 FibreField Configuration:', {
      env: config.env,
      firebase: {
        projectId: config.firebase.projectId,
        authDomain: config.firebase.authDomain
      },
      app: config.app,
      fibreflow: config.fibreflow,
      offline: config.offline,
      photo: config.photo,
      useEmulator: config.useEmulator
    });
  }
};