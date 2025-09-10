// Firebase configuration for FibreField
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { log } from './logger';

// Firebase configuration - Uses standalone FibreField project
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Skip Firebase initialization if required config is missing
const hasRequiredConfig = firebaseConfig.apiKey && 
                         firebaseConfig.authDomain && 
                         firebaseConfig.projectId && 
                         firebaseConfig.appId;

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

// Initialize Firebase app (singleton pattern) - only if config is complete
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;
let analytics: Analytics | null = null;

if (hasRequiredConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  
  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
  
  // Initialize Analytics (client-side only)
  analytics = isClient ? getAnalytics(app) : null;
} else {
  log.warn('🔥 Firebase configuration incomplete - Firebase disabled', {}, "Firebase");
  log.warn('Missing required config values. Check .env.local', {}, "Firebase");
}

// Export Firebase services (may be null if config is incomplete)
export { auth, db, storage, functions, analytics };

// Enable offline persistence for Firestore (client-side only)
if (isClient && db) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      log.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.', {}, "Firebase");
    } else if (err.code === 'unimplemented') {
      log.warn('The current browser does not support offline persistence', {}, "Firebase");
    }
  });
}

// Connect to emulators in development (client-side only)
if (isClient && isDevelopment && auth && db && storage && functions && !window.__FIREBASE_EMULATORS_CONNECTED__) {
  const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';
  
  if (USE_EMULATOR) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', {
        disableWarnings: true
      });
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      connectFunctionsEmulator(functions, 'localhost', 5001);
      
      // Mark as connected to prevent reconnection
      (window as any).__FIREBASE_EMULATORS_CONNECTED__ = true;
      log.info('🔧 Connected to Firebase emulators', {}, "Firebase");
    } catch (error) {
      log.warn('⚠️ Failed to connect to Firebase emulators (using production, {}, "Firebase"):', error);
    }
  }
}

// Export Firebase types for convenience
export type {
  User,
  UserCredential,
  AuthError,
  Unsubscribe
} from 'firebase/auth';

export type {
  DocumentData,
  DocumentReference,
  QuerySnapshot,
  Timestamp,
  FieldValue
} from 'firebase/firestore';

export type {
  UploadTask,
  UploadTaskSnapshot,
  StorageReference
} from 'firebase/storage';

// Configuration object for services
export const firebaseServices = {
  app,
  auth,
  db,
  storage,
  functions,
  analytics,
  config: firebaseConfig,
  isDevelopment,
  isClient,
  hasRequiredConfig
};

// Firebase initialization status
export const getFirebaseStatus = () => ({
  initialized: !!app,
  hasRequiredConfig,
  services: {
    auth: !!auth,
    firestore: !!db,
    storage: !!storage,
    functions: !!functions,
    analytics: !!analytics
  },
  config: {
    projectId: firebaseConfig.projectId,
    environment: isDevelopment ? 'development' : 'production',
    emulators: isDevelopment && isClient && (window as any).__FIREBASE_EMULATORS_CONNECTED__
  }
});

// Helper function for error handling
export const getFirebaseErrorMessage = (error: any): string => {
  if (error?.code) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with this email address.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unavailable':
        return 'Service temporarily unavailable. Please try again.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }
  return error?.message || 'An unexpected error occurred.';
};

log.info('🔥 FibreField Firebase initialized:', getFirebaseStatus(), 'Firebase');

export default app;