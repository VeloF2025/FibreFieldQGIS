// Dashboard page - main landing page for FibreField
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Camera, 
  Users, 
  RefreshCw, 
  TrendingUp, 
  Home as HomeIcon,
  MapPin,
  Navigation,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/app-layout';
import { SyncManager } from '@/components/offline/sync-manager';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { homeDropAssignmentService } from '@/services/home-drop-assignment.service';
import type { HomeDropStatistics } from '@/types/home-drop.types';

interface DashboardStats {
  // Pole capture stats
  totalCaptured: number;
  pendingSync: number;
  completedToday: number;
  assignedPoles: number;
}

interface HomeDropStats extends HomeDropStatistics {
  pendingAssignments: number;
  completedToday: number;
  needingApproval: number;
}

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCaptured: 0,
    pendingSync: 0,
    completedToday: 0,
    assignedPoles: 0
  });

  const [homeDropStats, setHomeDropStats] = useState<HomeDropStats>({
    total: 0,
    assigned: 0,
    inProgress: 0,
    captured: 0,
    synced: 0,
    approved: 0,
    rejected: 0,
    errors: 0,
    pendingAssignments: 0,
    completedToday: 0,
    needingApproval: 0,
    todayCount: 0,
    weekCount: 0,
    monthCount: 0
  });

  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    
    // Monitor online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load pole capture stats - TODO: Replace with actual pole service
      setStats({
        totalCaptured: 24,
        pendingSync: 3,
        completedToday: 5,
        assignedPoles: 12
      });

      // Load home drop statistics
      const homeDropStatistics = await homeDropCaptureService.getStatistics();
      
      // Calculate additional stats for dashboard
      const pendingAssignments = await homeDropAssignmentService.getAllAssignments()
        .then(assignments => assignments.filter(a => a.status === 'pending').length)
        .catch(() => 0);

      const needingApproval = homeDropStatistics.captured + (homeDropStatistics.rejected || 0);

      setHomeDropStats({
        ...homeDropStatistics,
        pendingAssignments,
        completedToday: homeDropStatistics.todayCount || 0,
        needingApproval
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    // Primary actions
    {
      title: 'Capture Pole',
      description: 'Start new pole installation capture',
      href: '/poles/capture',
      icon: Camera,
      color: 'bg-blue-500',
      primary: true
    },
    {
      title: 'Capture Home Drop',
      description: 'Start home drop installation',
      href: '/home-drop-capture',
      icon: HomeIcon,
      color: 'bg-green-500',
      primary: true
    },
    // Assignment actions
    {
      title: 'My Assignments',
      description: 'View assigned poles for today',
      href: '/assignments',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      title: 'My Drop Assignments',
      description: `${homeDropStats.pendingAssignments} pending drops`,
      href: '/home-drop-assignments',
      icon: MapPin,
      color: 'bg-teal-500',
      badge: homeDropStats.pendingAssignments > 0 ? homeDropStats.pendingAssignments : undefined
    },
    // Navigation
    {
      title: 'Navigate to Drops',
      description: 'GPS navigation to locations',
      href: '/navigation',
      icon: Navigation,
      color: 'bg-indigo-500'
    },
    // Sync and admin
    {
      title: 'Sync Data',
      description: `${stats.pendingSync + (homeDropStats.inProgress || 0)} items pending`,
      href: '/sync',
      icon: RefreshCw,
      color: 'bg-orange-500',
      badge: (stats.pendingSync + (homeDropStats.inProgress || 0)) > 0 ? (stats.pendingSync + (homeDropStats.inProgress || 0)) : undefined
    }
  ];

  // Admin actions (shown based on role)
  const adminActions = [
    {
      title: 'Review Drops',
      description: `${homeDropStats.needingApproval} need approval`,
      href: '/admin/home-drop-reviews',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      badge: homeDropStats.needingApproval > 0 ? homeDropStats.needingApproval : undefined,
      adminOnly: true
    },
    {
      title: 'Photo Gallery',
      description: 'View all captured photos',
      href: '/admin/photo-gallery',
      icon: FileText,
      color: 'bg-rose-500',
      adminOnly: true
    },
    {
      title: 'QGIS Integration',
      description: 'Export data for GIS',
      href: '/admin/qgis-integration',
      icon: MapPin,
      color: 'bg-cyan-500',
      adminOnly: true
    }
  ];

  // Combined statistics for comprehensive overview
  const statCards = [
    // Poles section
    {
      title: 'Total Poles',
      value: stats.totalCaptured,
      description: 'Poles captured this month',
      icon: Camera,
      color: 'text-blue-600',
      category: 'poles'
    },
    {
      title: 'Total Drops',
      value: homeDropStats.monthCount || 0,
      description: 'Home drops this month',
      icon: HomeIcon,
      color: 'text-green-600',
      category: 'drops'
    },
    // Today's work
    {
      title: 'Completed Today',
      value: stats.completedToday + homeDropStats.completedToday,
      description: 'All installations today',
      icon: TrendingUp,
      color: 'text-emerald-600',
      category: 'today'
    },
    {
      title: 'Pending Work',
      value: stats.assignedPoles + homeDropStats.pendingAssignments,
      description: 'Total assignments pending',
      icon: Clock,
      color: 'text-orange-600',
      category: 'pending'
    },
    // Status indicators
    {
      title: 'Sync Queue',
      value: stats.pendingSync + (homeDropStats.inProgress || 0),
      description: 'Items awaiting sync',
      icon: RefreshCw,
      color: (stats.pendingSync + (homeDropStats.inProgress || 0)) > 0 ? 'text-orange-600' : 'text-gray-600',
      category: 'sync'
    },
    {
      title: 'Need Approval',
      value: homeDropStats.needingApproval,
      description: 'Drops pending review',
      icon: AlertTriangle,
      color: homeDropStats.needingApproval > 0 ? 'text-red-600' : 'text-gray-600',
      category: 'approval'
    }
  ];

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  if (loading) {
    return (
      <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
        <AppLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-600">Loading dashboard...</div>
              </div>
            </div>
          </div>
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Welcome back, {userProfile?.displayName || 'Field Technician'}. {isOnline ? 'You are online.' : 'You are offline.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant={isOnline ? "success" : "destructive"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {isAdmin && (
                <Badge variant="outline">
                  Admin
                </Badge>
              )}
            </div>
          </div>

        {/* Offline notification */}
        {!isOnline && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-orange-800">
                <RefreshCw className="h-5 w-5" />
                <p>You&apos;re working offline. Data will sync when connection is restored.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                      {stat.category && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {stat.category}
                        </Badge>
                      )}
                    </div>
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className={`hover:shadow-md transition-shadow cursor-pointer ${action.primary ? 'ring-2 ring-blue-200 border-blue-300' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-lg ${action.color} text-white`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        {action.badge && (
                          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Admin Actions (only for admin/manager) */}
        {isAdmin && adminActions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adminActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.href}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className={`p-2 rounded-lg ${action.color} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          {action.badge && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sync Status */}
        <SyncManager showDetails={true} />

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest captures and updates from both poles and home drops</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample activities - In production, these should come from actual activity logs */}
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <HomeIcon className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Home drop HD-123 completed</p>
                  <p className="text-xs text-gray-500">1 hour ago • 123 Main St</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Camera className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pole LAW-P-001 captured</p>
                  <p className="text-xs text-gray-500">2 hours ago • Lawson Ave</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Home drop HD-119 approved</p>
                  <p className="text-xs text-gray-500">3 hours ago • Admin review</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                <RefreshCw className="h-4 w-4 text-teal-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Data synced successfully</p>
                  <p className="text-xs text-gray-500">4 hours ago • 3 poles, 2 drops</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <MapPin className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">7 new drop assignments received</p>
                  <p className="text-xs text-gray-500">Yesterday • Downtown area</p>
                </div>
              </div>

              {/* Summary stats */}
              <div className="bg-gray-50 rounded-lg p-3 mt-4">
                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <div>
                    <div className="font-semibold text-blue-600">{stats.totalCaptured + homeDropStats.monthCount}</div>
                    <div className="text-gray-600">Total This Month</div>
                  </div>
                  <div>
                    <div className="font-semibold text-green-600">{stats.completedToday + homeDropStats.completedToday}</div>
                    <div className="text-gray-600">Completed Today</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <Link href="/activity">
                <Button variant="outline" className="w-full">
                  View All Activity
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
