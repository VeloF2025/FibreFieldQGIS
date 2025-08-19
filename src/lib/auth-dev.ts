// Development mode authentication bypass for testing
// This file provides mock authentication without requiring Firebase Auth

import { User } from 'firebase/auth';
import { UserProfile } from './auth';

// Enable dev mode by setting this to true
export const DEV_MODE_ENABLED = true;

// Mock user for development
export const mockUser: User = {
  uid: 'dev-user-001',
  email: 'dev@fibrefield.test',
  displayName: 'Dev User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString()
  },
  providerData: [],
  refreshToken: 'mock-token',
  tenantId: null,
  phoneNumber: null,
  providerId: 'password',
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({
    token: 'mock-id-token',
    claims: { role: 'admin' },
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    signInProvider: 'password',
    signInSecondFactor: null
  }),
  reload: async () => {},
  toJSON: () => ({
    uid: 'dev-user-001',
    email: 'dev@fibrefield.test',
    displayName: 'Dev User'
  })
} as User;

// Mock user profile for development
export const mockUserProfile: UserProfile = {
  uid: 'dev-user-001',
  email: 'dev@fibrefield.test',
  displayName: 'Dev User',
  photoURL: undefined,
  role: 'admin', // Full admin access in dev mode
  contractorId: 'contractor-001',
  permissions: ['all'], // All permissions in dev mode
  lastLogin: new Date(),
  isActive: true,
  offlineCapable: true,
  syncPreferences: {
    autoSync: true,
    syncInterval: 5,
    wifiOnly: false
  }
};

// Helper to check if dev mode is active
export const isDevMode = () => {
  return DEV_MODE_ENABLED && process.env.NODE_ENV === 'development';
};

// Mock sign in function for dev mode
export const mockSignIn = async (email?: string, password?: string): Promise<User> => {
  console.log('🔧 Dev Mode: Mock sign in');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockUser;
};

// Mock sign out function for dev mode
export const mockSignOut = async (): Promise<void> => {
  console.log('🔧 Dev Mode: Mock sign out');
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
};

// Mock auth state for dev mode
export const getMockAuthState = (): User | null => {
  return isDevMode() ? mockUser : null;
};

// Mock profile getter for dev mode
export const getMockProfile = async (): Promise<UserProfile> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200));
  return mockUserProfile;
};