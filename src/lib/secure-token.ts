// Secure token management for API calls and offline storage
import { getCurrentUser } from '@/lib/auth';
import { localDB } from '@/lib/database';

interface SecureToken {
  token: string;
  expiresAt: number;
  refreshToken?: string;
  userId: string;
  scopes: string[];
}

interface TokenCache {
  id?: number;
  userId: string;
  tokenHash: string; // Hashed version for security
  expiresAt: number;
  scopes: string[];
  createdAt: Date;
  lastUsedAt: Date;
}

export class SecureTokenManager {
  private static instance: SecureTokenManager;
  private tokenCache = new Map<string, SecureToken>();
  private readonly TOKEN_STORAGE_KEY = 'ff_secure_tokens';
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

  private constructor() {
    this.loadCachedTokens();
    this.setupTokenRefresh();
  }

  static getInstance(): SecureTokenManager {
    if (!SecureTokenManager.instance) {
      SecureTokenManager.instance = new SecureTokenManager();
    }
    return SecureTokenManager.instance;
  }

  // Get valid Firebase ID token
  async getFirebaseToken(forceRefresh: boolean = false): Promise<string> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error('Failed to get Firebase token:', error);
      throw new Error('Authentication token unavailable');
    }
  }

  // Get token with automatic refresh
  async getValidToken(scopes: string[] = []): Promise<string> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const cacheKey = `${user.uid}_${scopes.join('_')}`;
    const cached = this.tokenCache.get(cacheKey);

    // Check if we have a valid cached token
    if (cached && this.isTokenValid(cached)) {
      // Update last used timestamp
      await this.updateTokenUsage(user.uid);
      return cached.token;
    }

    // Get fresh token
    return await this.refreshToken(user.uid, scopes);
  }

  // Store token securely
  async storeToken(userId: string, token: string, expiresAt: number, scopes: string[] = []): Promise<void> {
    const secureToken: SecureToken = {
      token,
      expiresAt,
      userId,
      scopes
    };

    // Cache in memory
    const cacheKey = `${userId}_${scopes.join('_')}`;
    this.tokenCache.set(cacheKey, secureToken);

    // Store hash in local database for security
    try {
      const tokenHash = await this.hashToken(token);
      await localDB.appSettings.put({
        key: `token_${userId}_${scopes.join('_')}`,
        value: {
          userId,
          tokenHash,
          expiresAt,
          scopes,
          createdAt: new Date(),
          lastUsedAt: new Date()
        },
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to store token cache:', error);
    }
  }

  // Refresh token
  private async refreshToken(userId: string, scopes: string[]): Promise<string> {
    try {
      const token = await this.getFirebaseToken(true); // Force refresh
      
      // Firebase ID tokens typically expire in 1 hour
      const expiresAt = Date.now() + (55 * 60 * 1000); // 55 minutes for safety
      
      await this.storeToken(userId, token, expiresAt, scopes);
      return token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh authentication token');
    }
  }

  // Check if token is valid and not expired
  private isTokenValid(token: SecureToken): boolean {
    return Date.now() < (token.expiresAt - this.REFRESH_THRESHOLD);
  }

  // Hash token for secure storage
  private async hashToken(token: string): Promise<string> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      // Fallback for server-side or older browsers
      return btoa(token.substring(0, 10) + '...' + token.substring(token.length - 10));
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Token hashing failed:', error);
      return btoa(token.substring(0, 10) + '...' + token.substring(token.length - 10));
    }
  }

  // Load cached tokens from storage
  private async loadCachedTokens(): Promise<void> {
    try {
      const tokenSettings = await localDB.appSettings
        .where('key')
        .startsWith('token_')
        .toArray();

      for (const setting of tokenSettings) {
        const tokenData = setting.value as TokenCache;
        
        // Only load non-expired tokens
        if (tokenData.expiresAt > Date.now()) {
          // Note: We don't store the actual token, only metadata
          // Real token will be refreshed when needed
          console.log(`📱 Found cached token metadata for user ${tokenData.userId}`);
        } else {
          // Clean up expired token metadata
          await localDB.appSettings.delete(setting.id!);
        }
      }
    } catch (error) {
      console.error('Failed to load cached tokens:', error);
    }
  }

  // Update token usage timestamp
  private async updateTokenUsage(userId: string): Promise<void> {
    try {
      const tokenKeys = await localDB.appSettings
        .where('key')
        .startsWith(`token_${userId}`)
        .primaryKeys();

      for (const key of tokenKeys) {
        const setting = await localDB.appSettings.get(key);
        if (setting) {
          setting.value.lastUsedAt = new Date();
          await localDB.appSettings.put(setting);
        }
      }
    } catch (error) {
      console.error('Failed to update token usage:', error);
    }
  }

  // Setup automatic token refresh
  private setupTokenRefresh(): void {
    // Check tokens every 5 minutes
    setInterval(async () => {
      try {
        const user = getCurrentUser();
        if (user) {
          // Proactively refresh tokens that are close to expiry
          for (const [key, token] of this.tokenCache.entries()) {
            if (!this.isTokenValid(token)) {
              console.log('🔄 Proactively refreshing token:', key);
              await this.refreshToken(token.userId, token.scopes);
            }
          }
        }
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  // Clear all tokens (on logout)
  async clearAllTokens(): Promise<void> {
    try {
      this.tokenCache.clear();
      
      // Clear from local storage
      const tokenSettings = await localDB.appSettings
        .where('key')
        .startsWith('token_')
        .toArray();

      for (const setting of tokenSettings) {
        await localDB.appSettings.delete(setting.id!);
      }
      
      console.log('🧹 All tokens cleared');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Get token statistics
  async getTokenStats(): Promise<{
    activeTokens: number;
    expiredTokens: number;
    lastRefresh: Date | null;
  }> {
    try {
      const tokenSettings = await localDB.appSettings
        .where('key')
        .startsWith('token_')
        .toArray();

      let activeTokens = 0;
      let expiredTokens = 0;
      let lastRefresh: Date | null = null;

      for (const setting of tokenSettings) {
        const tokenData = setting.value as TokenCache;
        
        if (tokenData.expiresAt > Date.now()) {
          activeTokens++;
          if (!lastRefresh || tokenData.lastUsedAt > lastRefresh) {
            lastRefresh = tokenData.lastUsedAt;
          }
        } else {
          expiredTokens++;
        }
      }

      return { activeTokens, expiredTokens, lastRefresh };
    } catch (error) {
      console.error('Failed to get token stats:', error);
      return { activeTokens: 0, expiredTokens: 0, lastRefresh: null };
    }
  }

  // Create authorization header
  async getAuthHeader(): Promise<{ Authorization: string }> {
    const token = await this.getValidToken();
    return { Authorization: `Bearer ${token}` };
  }

  // Validate token format
  static isValidTokenFormat(token: string): boolean {
    // Firebase ID tokens are JWTs with 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }
}

// Export singleton instance
export const tokenManager = SecureTokenManager.getInstance();

// Convenience functions
export const getAuthToken = () => tokenManager.getValidToken();
export const getAuthHeader = () => tokenManager.getAuthHeader();
export const clearTokens = () => tokenManager.clearAllTokens();
export const getTokenStats = () => tokenManager.getTokenStats();