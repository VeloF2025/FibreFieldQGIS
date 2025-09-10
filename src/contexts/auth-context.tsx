// Authentication context provider with offline support
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { 
  onAuthStateChange, 
  signIn, 
  signOut, 
  resetPassword, 
  getUserProfile, 
  updateUserProfile,
  updateSyncPreferences,
  hasPermission,
  canWorkOffline,
  waitForAuth,
  UserProfile 
} from '@/lib/auth';
import { 
  isDevMode, 
  mockUser, 
  mockUserProfile, 
  mockSignIn, 
  mockSignOut,
  getMockProfile,
  getMockUserByEmail 
} from '@/lib/auth-dev';
import { log } from '@/lib/logger';

interface AuthContextType {
  // Auth state
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  
  // Profile methods
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  updateSyncPrefs: (preferences: Partial<UserProfile['syncPreferences']>) => Promise<void>;
  
  // Permission helpers
  hasPermission: (permission: string) => boolean;
  canWorkOffline: () => boolean;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isTechnician: () => boolean;
  
  // Utility methods
  refreshProfile: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check if dev mode is enabled
        if (isDevMode()) {
          log.info('🔧 Dev Mode: Auto-login enabled', {}, "Authcontext");
          
          // Set mock user and profile immediately
          if (mounted) {
            setUser(mockUser);
            setUserProfile(mockUserProfile);
            setLoading(false);
            setError(null);
            log.info('🔧 Dev Mode: User set to', mockUser.email, 'with role', mockUserProfile.role, {}, "Authcontext");
          }
          return;
        }
        
        // Normal Firebase Auth flow
        const currentUser = await waitForAuth();
        
        if (!mounted) return;
        
        if (currentUser) {
          setUser(currentUser);
          // Load user profile
          const profile = await getUserProfile(currentUser.uid);
          if (mounted) {
            setUserProfile(profile);
          }
        }
      } catch (err) {
        log.error('Auth initialization error:', {}, "Authcontext", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Authentication initialization failed');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Skip auth listener in dev mode and initialize immediately
    if (isDevMode()) {
      // Initialize immediately for dev mode
      log.info('🔧 Dev Mode: Initializing immediately', {}, "Authcontext");
      setUser(mockUser);
      setUserProfile(mockUserProfile);
      setLoading(false);
      setError(null);
      
      // Set auth cookie for middleware in dev mode
      const mockToken = 'dev-mode-token-auto';
      document.cookie = `auth-token=${mockToken}; path=/; max-age=3600; samesite=strict`;
      log.info('🍪 Dev mode auto-auth token cookie set for middleware', {}, "Authcontext");
      
      log.info('🔧 Dev Mode: Auth initialized with', mockUser.email, 'role:', mockUserProfile.role, {}, "Authcontext");
      
      return () => {
        mounted = false;
      };
    }

    // Set up auth state listener for production
    log.info('🔧 Setting up Firebase auth state listener', {}, "Authcontext");
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (!mounted) return;
      
      log.info('🔥 Auth state changed:', firebaseUser ? `✅ ${firebaseUser.email}` : '❌ Logged out', {}, "Authcontext");
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          if (mounted) {
            setUserProfile(profile);
            log.info('✅ User profile loaded for auth context', {}, "Authcontext");
          }
        } catch (err) {
          log.warn('⚠️ Failed to load user profile, continuing without profile:', err, {}, "Authcontext");
          if (mounted) {
            // Don't set error, just continue without profile
            setUserProfile(null);
          }
        }
      } else {
        if (mounted) {
          setUserProfile(null);
        }
      }
      
      // Ensure loading is set to false after auth state is determined
      if (mounted) {
        setLoading(false);
      }
      
      if (mounted) {
        setLoading(false);
      }
    });

    initializeAuth();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Auth methods
  const handleSignIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Use mock sign in for dev mode
      if (isDevMode()) {
        const mockUserResult = await mockSignIn(email, password);
        const mockUserData = getMockUserByEmail(email);
        
        setUser(mockUserResult);
        setUserProfile(mockUserData?.profile || mockUserProfile);
        
        // Set auth cookie for middleware in dev mode
        const mockToken = 'dev-mode-token';
        document.cookie = `auth-token=${mockToken}; path=/; max-age=3600; samesite=strict`;
        log.info('🍪 Dev mode auth token cookie set for middleware', {}, "Authcontext");
      } else {
        await signIn(email, password);
        // User state will be updated by the auth state listener
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      
      // Use mock sign out for dev mode
      if (isDevMode()) {
        await mockSignOut();
      } else {
        await signOut();
      }
      
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setError(null);
      await resetPassword(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
      throw err;
    }
  };

  // Profile methods
  const handleUpdateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    try {
      setError(null);
      await updateProfile(updates);
      
      // Refresh profile data
      if (user) {
        const updatedProfile = await getUserProfile(user.uid);
        setUserProfile(updatedProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile update failed');
      throw err;
    }
  };

  const handleUpdateSyncPrefs = async (preferences: Partial<UserProfile['syncPreferences']>) => {
    try {
      setError(null);
      if (!user) throw new Error('User not authenticated');
      
      await updateSyncPreferences(user.uid, preferences);
      
      // Refresh profile data
      const updatedProfile = await getUserProfile(user.uid);
      setUserProfile(updatedProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync preferences update failed');
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    }
  };

  // Permission helpers
  const checkPermission = (permission: string): boolean => {
    return hasPermission(userProfile, permission);
  };

  const checkCanWorkOffline = (): boolean => {
    return canWorkOffline(userProfile);
  };

  const isAdmin = (): boolean => {
    return userProfile?.role === 'admin';
  };

  const isManager = (): boolean => {
    return userProfile?.role === 'manager' || userProfile?.role === 'admin';
  };

  const isTechnician = (): boolean => {
    return userProfile?.role === 'technician';
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    // State
    user,
    userProfile,
    loading,
    error,
    
    // Auth methods
    signIn: handleSignIn,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    
    // Profile methods
    updateProfile: handleUpdateProfile,
    updateSyncPrefs: handleUpdateSyncPrefs,
    
    // Permission helpers
    hasPermission: checkPermission,
    canWorkOffline: checkCanWorkOffline,
    isAdmin,
    isManager,
    isTechnician,
    
    // Utility methods
    refreshProfile,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}