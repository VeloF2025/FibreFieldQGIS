// Development mode authentication bypass for testing
// This file provides mock authentication without requiring Firebase Auth

import { User } from 'firebase/auth';
import { UserProfile } from './auth';
import { log } from './logger';

// Enable dev mode by setting this to true
export const DEV_MODE_ENABLED = true;

// Mock users for development - supports different roles
interface MockUserData {
  user: User;
  profile: UserProfile;
}

const createMockUser = (uid: string, email: string, displayName: string, role: 'admin' | 'manager' | 'technician' | 'client'): MockUserData => {
  const mockUser: User = {
    uid,
    email,
    displayName,
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
      claims: { role },
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null
    }),
    reload: async () => {},
    toJSON: () => ({
      uid,
      email,
      displayName
    })
  } as User;

  const permissions = role === 'admin' ? ['all'] : 
                    role === 'manager' ? ['review', 'assign', 'export'] :
                    role === 'technician' ? ['capture', 'sync'] :
                    ['view'];

  const mockProfile: UserProfile = {
    uid,
    email,
    displayName,
    photoURL: undefined,
    role,
    contractorId: role === 'technician' ? 'contractor-001' : undefined,
    permissions,
    lastLogin: new Date(),
    isActive: true,
    offlineCapable: role === 'technician' || role === 'admin',
    syncPreferences: {
      autoSync: true,
      syncInterval: 5,
      wifiOnly: false
    }
  };

  return { user: mockUser, profile: mockProfile };
};

// Available mock users for development
const mockUsers = {
  'admin@fibrefield.com': createMockUser('admin-user-001', 'admin@fibrefield.com', 'Admin User', 'admin'),
  'technician@fibrefield.com': createMockUser('tech-user-001', 'technician@fibrefield.com', 'Field Technician', 'technician'),
  'dev@fibrefield.test': createMockUser('dev-user-001', 'dev@fibrefield.test', 'Dev User', 'admin') // Backwards compatibility
};

// Default current user (can be changed by mock sign in)
let currentMockUser: MockUserData | null = null;

// Get mock user data by email
export const getMockUserByEmail = (email: string): MockUserData | null => {
  return mockUsers[email as keyof typeof mockUsers] || null;
};

// Current mock user (for backwards compatibility)
export const mockUser: User = mockUsers['admin@fibrefield.com'].user;
export const mockUserProfile: UserProfile = mockUsers['admin@fibrefield.com'].profile;

// Helper to check if dev mode is active  
export const isDevMode = () => {
  // In Next.js, check both NODE_ENV and Next.js development mode
  const isNextDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  return DEV_MODE_ENABLED && isNextDev;
};

// Set current user for immediate testing (bypasses login)
currentMockUser = mockUsers['admin@fibrefield.com'];

// Mock sign in function for dev mode
export const mockSignIn = async (email?: string, password?: string): Promise<User> => {
  log.info('🔧 Dev Mode: Mock sign in for', email, {}, "Authdev");
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Get user data based on email
  if (email) {
    const userData = getMockUserByEmail(email);
    if (userData) {
      currentMockUser = userData;
      log.info('🔧 Dev Mode: Signed in as', userData.profile.role, '-', email, {}, "Authdev");
      return userData.user;
    } else {
      log.warn('🔧 Dev Mode: User not found for email:', email, {}, "Authdev");
      throw new Error(`No dev user configured for email: ${email}`);
    }
  }
  
  // Fallback to default admin user
  currentMockUser = mockUsers['admin@fibrefield.com'];
  return mockUser;
};

// Mock sign out function for dev mode
export const mockSignOut = async (): Promise<void> => {
  log.info('🔧 Dev Mode: Mock sign out', {}, "Authdev");
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
  
  // Return current user's profile or default
  return currentMockUser?.profile || mockUserProfile;
};