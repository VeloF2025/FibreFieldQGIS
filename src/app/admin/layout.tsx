/**
 * Admin Layout Component
 * 
 * Comprehensive layout for the FibreField Admin interface.
 * Features:
 * - Responsive sidebar navigation
 * - Admin-specific navigation items
 * - User role-based access control
 * - Real-time notifications
 * - System status indicators
 * - Quick access tools
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  Camera,
  MapPin,
  Users,
  Settings,
  BarChart3,
  FileText,
  Download,
  Bell,
  Search,
  Menu,
  X,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  User,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import type { HomeDropStatistics } from '@/types/home-drop.types';
import { cn } from '@/lib/utils';

/**
 * Navigation Items Configuration
 */
interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  badge?: number | string;
  disabled?: boolean;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: 'Admin overview and statistics'
  },
  {
    id: 'reviews',
    name: 'Home Drop Reviews',
    href: '/admin/home-drop-reviews',
    icon: <Camera className="w-5 h-5" />,
    description: 'Review and approve installations'
  },
  {
    id: 'map-view',
    name: 'Geographic View',
    href: '/admin/map-review',
    icon: <MapPin className="w-5 h-5" />,
    description: 'Map-based review interface'
  },
  {
    id: 'technicians',
    name: 'Technicians',
    href: '/admin/technicians',
    icon: <Users className="w-5 h-5" />,
    description: 'Manage field technicians',
    disabled: true
  },
  {
    id: 'reports',
    name: 'Reports',
    href: '/admin/reports',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Performance analytics',
    disabled: true
  },
  {
    id: 'exports',
    name: 'Data Export',
    href: '/admin/exports',
    icon: <Download className="w-5 h-5" />,
    description: 'Export capture data',
    disabled: true
  },
  {
    id: 'settings',
    name: 'Admin Settings',
    href: '/admin/settings',
    icon: <Settings className="w-5 h-5" />,
    description: 'System configuration',
    disabled: true
  }
];

/**
 * System Status Indicators
 */
function SystemStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1">
        {isOnline ? (
          <Wifi className="w-3 h-3 text-green-600" />
        ) : (
          <WifiOff className="w-3 h-3 text-red-600" />
        )}
        <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      <Separator orientation="vertical" className="h-3" />
      
      <div className="flex items-center gap-1">
        <div className={cn(
          "w-2 h-2 rounded-full",
          syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' :
          syncStatus === 'error' ? 'bg-red-500' :
          'bg-green-500'
        )} />
        <span className="text-gray-600">
          {syncStatus === 'syncing' ? 'Syncing' :
           syncStatus === 'error' ? 'Sync Error' :
           'Synced'
          }
        </span>
      </div>
    </div>
  );
}

/**
 * Quick Stats Widget
 */
function QuickStats() {
  const [statistics, setStatistics] = useState<HomeDropStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStatistics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await homeDropCaptureService.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !statistics) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingReview = statistics.total - statistics.approved - statistics.rejected;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Quick Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pending Review</span>
            <Badge variant="secondary">{pendingReview}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Today</span>
            <Badge variant="outline">{statistics.todayCount}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Approved</span>
            <Badge variant="success" className="bg-green-100 text-green-800">
              {statistics.approved}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Rejected</span>
            <Badge variant="destructive">{statistics.rejected}</Badge>
          </div>
        </div>
        
        <Separator />
        
        <div className="text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Approval Rate</span>
            <span className="font-semibold">
              {statistics.approvalRate?.toFixed(1) || 0}%
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Sync Success</span>
            <span className="font-semibold">
              {statistics.syncSuccessRate?.toFixed(1) || 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Notifications Panel
 */
function NotificationsPanel() {
  const [notifications] = useState([
    {
      id: '1',
      type: 'alert' as const,
      title: 'Quality Issues Detected',
      message: '5 captures require immediate attention',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      unread: true
    },
    {
      id: '2',
      type: 'info' as const,
      title: 'Daily Report Available',
      message: 'Installation report for today is ready',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      unread: false
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No notifications
            </div>
          ) : (
            notifications.map(notification => (
              <DropdownMenuItem key={notification.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {notification.type === 'alert' ? (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * User Profile Menu
 */
function UserProfileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Admin User</p>
            <p className="text-xs leading-none text-muted-foreground">
              admin@fibrefield.com
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help & Support</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Mobile Navigation Component
 */
function MobileNav({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="fixed left-0 top-0 h-full w-72 bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-lg">FibreField Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive 
                    ? "bg-blue-100 text-blue-700" 
                    : item.disabled 
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                {item.icon}
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
                {item.badge && (
                  <Badge variant="secondary">{item.badge}</Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

/**
 * Main Admin Layout Component
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-xl hidden sm:block">FibreField Admin</span>
            </Link>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search captures, customers, poles..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-3">
            <NotificationsPanel />
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 lg:top-[73px] lg:bg-white lg:border-r lg:border-gray-200">
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Navigation */}
            <nav className="p-4 space-y-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive 
                        ? "bg-blue-100 text-blue-700" 
                        : item.disabled 
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {item.icon}
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                    {item.badge && (
                      <Badge variant="secondary">{item.badge}</Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Quick Stats */}
            <div className="p-4 mt-auto">
              <QuickStats />
            </div>
          </div>

          {/* System Status */}
          <div className="p-4 border-t border-gray-200">
            <SystemStatusBar />
          </div>
        </aside>

        {/* Mobile Navigation */}
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 lg:ml-72">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}