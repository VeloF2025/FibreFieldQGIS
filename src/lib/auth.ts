// Authentication service for FibreField with offline support
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, getFirebaseErrorMessage } from './firebase';
import { localDB } from './database';
import { log } from './logger';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'manager' | 'technician' | 'client';
  contractorId?: string;
  permissions: string[];
  lastLogin: Date;
  isActive: boolean;
  offlineCapable: boolean;
  syncPreferences: {
    autoSync: boolean;
    syncInterval: number; // minutes
    wifiOnly: boolean;
  };
}

// Auth state management
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    log.warn('Firebase auth not initialized', {}, "Auth");
    callback(null);
    return () => {}; // Return empty unsubscribe function
  }
  return onAuthStateChanged(auth, callback);
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  if (!auth) {
    throw new Error('Firebase authentication is not initialized');
  }
  
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    log.info('🔥 Firebase authentication successful:', result.user.email, {}, "Auth");
    
    // Get ID token for middleware authentication
    const idToken = await result.user.getIdToken();
    
    // Set auth cookie for middleware (remove secure flag for localhost)
    const isLocalhost = window.location.hostname === 'localhost';
    const cookieOptions = isLocalhost 
      ? `auth-token=${idToken}; path=/; max-age=3600; samesite=strict`
      : `auth-token=${idToken}; path=/; max-age=3600; secure; samesite=strict`;
    document.cookie = cookieOptions;
    log.info('🍪 Auth token cookie set for middleware', {}, "Auth");
    
    // TEMPORARY: Skip user profile lookup to test basic auth
    // This allows login to work even if user profile doesn't exist in Firestore
    try {
      // Get and cache user profile
      const userProfile = await getUserProfile(result.user.uid);
      if (userProfile) {
        await cacheUserProfile(userProfile);
      }
      
      // Update last login
      await updateLastLogin(result.user.uid);
    } catch (profileError) {
      log.warn('⚠️ User profile lookup failed, but authentication succeeded:', profileError, {}, "Auth");
      // Continue with login even if profile lookup fails
    }
    
    return result.user;
  } catch (error) {
    log.error('Sign in error:', {}, "Auth", error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Sign out
export const signOut = async () => {
  try {
    // Clear cached user data on sign out
    await clearCachedUserData();
    
    // Clear auth cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    log.info('🍪 Auth token cookie cleared', {}, "Auth");
    
    await firebaseSignOut(auth);
  } catch (error) {
    log.error('Sign out error:', {}, "Auth", error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Get user profile from Firestore (with offline fallback)
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    if (!db) {
      log.warn('Firestore not initialized, using cached profile', {}, "Auth");
      return await getCachedUserProfile(uid);
    }
    
    // Try to get from Firestore first
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const profile: UserProfile = {
        uid,
        email: data.email,
        displayName: data.displayName || data.email,
        photoURL: data.photoURL,
        role: data.role || 'technician',
        contractorId: data.contractorId,
        permissions: data.permissions || [],
        lastLogin: data.lastLogin?.toDate() || new Date(),
        isActive: data.isActive !== false,
        offlineCapable: data.offlineCapable !== false,
        syncPreferences: {
          autoSync: data.syncPreferences?.autoSync !== false,
          syncInterval: data.syncPreferences?.syncInterval || 5,
          wifiOnly: data.syncPreferences?.wifiOnly !== false
        }
      };
      
      // Cache the profile for offline use
      await cacheUserProfile(profile);
      return profile;
    }
    
    return null;
  } catch (error) {
    log.error('Get user profile error:', {}, "Auth", error);
    
    // Fallback to cached profile if offline
    return await getCachedUserProfile(uid);
  }
};

// Update last login timestamp
const updateLastLogin = async (uid: string) => {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    log.error('Update last login error:', {}, "Auth", error);
  }
};

// Cache user profile for offline use
const cacheUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    await localDB.userProfiles.put({
      id: profile.uid,
      ...profile,
      cachedAt: new Date()
    });
    log.info('✅ User profile cached for offline use', {}, "Auth");
  } catch (error) {
    log.error('❌ Failed to cache user profile:', {}, "Auth", error);
  }
};

// Get cached user profile
const getCachedUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const cached = await localDB.userProfiles.get(uid);
    if (cached) {
      log.info('📱 Using cached user profile (offline mode, {}, "Auth")');
      return {
        uid: cached.uid,
        email: cached.email,
        displayName: cached.displayName,
        photoURL: cached.photoURL,
        role: cached.role,
        contractorId: cached.contractorId,
        permissions: cached.permissions,
        lastLogin: cached.lastLogin,
        isActive: cached.isActive,
        offlineCapable: cached.offlineCapable,
        syncPreferences: cached.syncPreferences
      };
    }
    return null;
  } catch (error) {
    log.error('Failed to get cached user profile:', {}, "Auth", error);
    return null;
  }
};

// Clear cached user data
const clearCachedUserData = async (): Promise<void> => {
  try {
    await localDB.userProfiles.clear();
    log.info('🧹 Cleared cached user data', {}, "Auth");
  } catch (error) {
    log.error('Failed to clear cached user data:', {}, "Auth", error);
  }
};

// Send password reset email
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    log.error('Password reset error:', {}, "Auth", error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Update user profile
export const updateUserProfile = async (updates: {
  displayName?: string;
  photoURL?: string;
}): Promise<void> => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('No user logged in');
    
    await updateProfile(user, updates);
    
    // Update in Firestore as well
    await setDoc(
      doc(db, 'users', user.uid),
      updates,
      { merge: true }
    );
    
    // Update cached profile
    const profile = await getUserProfile(user.uid);
    if (profile) {
      await cacheUserProfile(profile);
    }
  } catch (error) {
    log.error('Update profile error:', {}, "Auth", error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Update sync preferences
export const updateSyncPreferences = async (
  uid: string,
  preferences: Partial<UserProfile['syncPreferences']>
): Promise<void> => {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { syncPreferences: preferences },
      { merge: true }
    );
    
    // Update cached profile
    const profile = await getUserProfile(uid);
    if (profile) {
      await cacheUserProfile(profile);
    }
  } catch (error) {
    log.error('Update sync preferences error:', {}, "Auth", error);
    throw new Error(getFirebaseErrorMessage(error));
  }
};

// Check if user has permission
export const hasPermission = (userProfile: UserProfile | null, permission: string): boolean => {
  if (!userProfile || !userProfile.isActive) return false;
  
  // Admin has all permissions
  if (userProfile.role === 'admin') return true;
  
  // Check specific permissions
  return userProfile.permissions.includes(permission);
};

// Check if user can work offline
export const canWorkOffline = (userProfile: UserProfile | null): boolean => {
  return userProfile?.offlineCapable === true;
};

// Get current user (synchronous)
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Get current user ID
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid || null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!auth.currentUser;
};

// Wait for auth to initialize
export const waitForAuth = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};