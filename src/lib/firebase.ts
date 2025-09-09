// Firebase configuration for FibreField
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';
import { getAnalytics, Analytics } from 'firebase/analytics';

// Firebase configuration - shared with main FibreFlow project
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com", 
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126",
  measurementId: "G-J0P7YRLGPW"
};

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

// Initialize Firebase app (singleton pattern)
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);

// Initialize Analytics (client-side only)
export const analytics: Analytics | null = isClient ? getAnalytics(app) : null;

// Enable offline persistence for Firestore (client-side only)
if (isClient) {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support offline persistence');
    }
  });
}

// Connect to emulators in development (client-side only)
if (isClient && isDevelopment && !window.__FIREBASE_EMULATORS_CONNECTED__) {
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
      console.log('🔧 Connected to Firebase emulators');
    } catch (error) {
      console.warn('⚠️ Failed to connect to Firebase emulators (using production):', error);
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
  isClient
};

// Firebase initialization status
export const getFirebaseStatus = () => ({
  initialized: !!app,
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

console.log('🔥 Firebase initialized:', getFirebaseStatus());

export default app;