// Main app layout component
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Camera, 
  Users, 
  RefreshCw, 
  Settings, 
  Menu,
  X,
  Wifi,
  WifiOff,
  Navigation,
  Home as HomeIcon,
  MapPin,
  CheckCircle,
  FileText,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getNetworkStatus, onNetworkChange } from '@/lib/service-worker';
import { useAuth } from '@/contexts/auth-context';

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  section?: 'main' | 'capture' | 'admin';
}

const navigation: NavItem[] = [
  // Main navigation
  { name: 'Dashboard', href: '/', icon: Home, section: 'main' },
  { name: 'Navigation', href: '/navigation', icon: Navigation, section: 'main' },
  { name: 'Sync', href: '/sync', icon: RefreshCw, section: 'main' },
  
  // Capture section
  { name: 'Capture Pole', href: '/poles/capture', icon: Camera, section: 'capture' },
  { name: 'Capture Home Drop', href: '/home-drop-capture', icon: HomeIcon, section: 'capture' },
  
  // Assignments
  { name: 'My Assignments', href: '/assignments', icon: Users, section: 'main' },
  { name: 'Drop Assignments', href: '/home-drop-assignments', icon: MapPin, section: 'main' },
  
  // Settings
  { name: 'Settings', href: '/settings', icon: Settings, section: 'main' },
];

const adminNavigation: NavItem[] = [
  { name: 'Review Drops', href: '/admin/home-drop-reviews', icon: CheckCircle, adminOnly: true },
  { name: 'Photo Gallery', href: '/admin/photo-gallery', icon: FileText, adminOnly: true },
  { name: 'QGIS Integration', href: '/admin/qgis-integration', icon: MapPin, adminOnly: true },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const pathname = usePathname();
  const { userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Monitor network status
  useEffect(() => {
    setIsOnline(getNetworkStatus().online);
    
    const cleanup = onNetworkChange((online) => {
      setIsOnline(online);
    });
    
    return cleanup;
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">FibreField</h1>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Network status */}
        <div className="px-4 py-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
            isOnline 
              ? "bg-green-50 text-green-700" 
              : "bg-red-50 text-red-700"
          )}>
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
          {/* Main Navigation */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Main</div>
            <div className="space-y-1">
              {navigation.filter(item => item.section === 'main').map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Capture Section */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Capture</div>
            <div className="space-y-1">
              {navigation.filter(item => item.section === 'capture').map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin Section (only for admin/manager) */}
          {isAdmin && adminNavigation.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Shield className="h-3 w-3" />
                Admin
              </div>
              <div className="space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors border-l-2 border-transparent",
                        isActive
                          ? "bg-purple-50 text-purple-700 border-purple-300"
                          : "text-gray-700 hover:bg-gray-50 hover:border-gray-200"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User info and app version */}
        <div className="px-4 py-4 border-t space-y-2">
          {userProfile && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">
                {userProfile.displayName || 'User'}
              </span>
              {isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  {userProfile.role}
                </Badge>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500">
            FibreField v1.0.0
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <h1 className="text-lg font-semibold">FibreField</h1>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}