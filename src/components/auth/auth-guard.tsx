// Authentication guard component for protecting routes
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from './login-form';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRoles?: ('admin' | 'manager' | 'technician' | 'client')[];
  requirePermissions?: string[];
  requireOfflineCapable?: boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireRoles = [],
  requirePermissions = [],
  requireOfflineCapable = false,
  fallback,
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userProfile, loading, hasPermission, canWorkOffline } = useAuth();


  useEffect(() => {
    // Don't redirect while loading
    if (loading) return;

    // If auth is required but user is not authenticated
    if (requireAuth && !user) {
      if (pathname !== '/auth/login') {
        router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    // If user is authenticated but we're on login page, redirect to dashboard
    if (!requireAuth && user && pathname === '/auth/login') {
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      router.push(redirect || '/dashboard');
      return;
    }
  }, [user, loading, requireAuth, pathname, router, redirectTo]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, show login
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return <LoginForm />;
  }

  // If user is authenticated, check additional requirements
  if (user && userProfile) {
    // Check role requirements
    if (requireRoles.length > 0 && !requireRoles.includes(userProfile.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Access Denied
              </h1>
              
              <p className="text-gray-600 mb-4">
                You don&apos;t have permission to access this page. Required role: {requireRoles.join(' or ')}.
                Your role: {userProfile.role}.
              </p>
              
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Check permission requirements
    const missingPermissions = requirePermissions.filter(permission => !hasPermission(permission));
    if (missingPermissions.length > 0) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Insufficient Permissions
              </h1>
              
              <p className="text-gray-600 mb-4">
                You need additional permissions to access this page. Missing: {missingPermissions.join(', ')}.
              </p>
              
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Check offline capability requirement
    if (requireOfflineCapable && !canWorkOffline()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Offline Access Required
              </h1>
              
              <p className="text-gray-600 mb-4">
                This page requires offline capabilities which are not enabled for your account. Please contact your administrator.
              </p>
              
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Convenience components for common use cases
export function AdminGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireRoles={['admin']}>
      {children}
    </AuthGuard>
  );
}

export function ManagerGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireRoles={['admin', 'manager']}>
      {children}
    </AuthGuard>
  );
}

export function TechnicianGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      {children}
    </AuthGuard>
  );
}

export function OfflineCapableGuard({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireOfflineCapable={true}>
      {children}
    </AuthGuard>
  );
}