// Dashboard page - main landing page for FibreField
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Camera, Users, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/app-layout';
import { SyncManager } from '@/components/offline/sync-manager';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';

interface DashboardStats {
  totalCaptured: number;
  pendingSync: number;
  completedToday: number;
  assignedPoles: number;
}

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCaptured: 0,
    pendingSync: 0,
    completedToday: 0,
    assignedPoles: 0
  });

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // TODO: Load actual stats from local storage and Firebase
    setStats({
      totalCaptured: 24,
      pendingSync: 3,
      completedToday: 5,
      assignedPoles: 12
    });

    // Monitor online status
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const quickActions = [
    {
      title: 'Capture Pole',
      description: 'Start new pole installation capture',
      href: '/poles/capture',
      icon: Camera,
      color: 'bg-blue-500',
      primary: true
    },
    {
      title: 'My Assignments',
      description: 'View assigned poles for today',
      href: '/assignments',
      icon: Users,
      color: 'bg-green-500'
    },
    {
      title: 'Sync Data',
      description: `${stats.pendingSync} items pending sync`,
      href: '/sync',
      icon: RefreshCw,
      color: 'bg-orange-500',
      badge: stats.pendingSync > 0 ? stats.pendingSync : undefined
    }
  ];

  const statCards = [
    {
      title: 'Total Captured',
      value: stats.totalCaptured,
      description: 'Poles captured this month',
      icon: Camera,
      color: 'text-blue-600'
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      description: 'Poles completed today',
      icon: TrendingUp,
      color: 'text-green-600'
    },
    {
      title: 'Pending Sync',
      value: stats.pendingSync,
      description: 'Items waiting to sync',
      icon: RefreshCw,
      color: stats.pendingSync > 0 ? 'text-orange-600' : 'text-gray-600'
    },
    {
      title: 'Assigned Poles',
      value: stats.assignedPoles,
      description: 'Total poles assigned to you',
      icon: Users,
      color: 'text-purple-600'
    }
  ];

  return (
    <AuthGuard requireRoles={['admin', 'manager', 'technician']}>
      <AppLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {userProfile?.displayName || 'Field Technician'}. {isOnline ? 'You are online.' : 'You are offline.'}
            </p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
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

        {/* Sync Status */}
        <SyncManager showDetails={true} />

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest captures and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Pole LAW-P-001 captured</p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">3 poles synced to FibreFlow</p>
                  <p className="text-xs text-gray-500">4 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">5 new assignments received</p>
                  <p className="text-xs text-gray-500">Yesterday</p>
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
