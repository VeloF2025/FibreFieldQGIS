import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/api/health',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico'
];

// Admin-only routes
const adminRoutes = [
  '/admin',
  '/api/admin'
];

// Manager and admin routes
const managerRoutes = [
  '/assignments',
  '/analytics',
  '/api/assignments',
  '/api/analytics'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/static') || 
      pathname.startsWith('/icons') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for authentication token (from cookie)
  const token = request.cookies.get('auth-token');
  
  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // For now, allow authenticated users to access all routes
  // In production, you would validate the token and check permissions
  // TODO: Implement proper JWT validation and role checking
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/health (health check)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/health|_next/static|_next/image|favicon.ico|public).*)',
  ],
};