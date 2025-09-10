'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Users, 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  MapPin,
  Download
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats] = useState({
    totalCaptures: 156,
    pendingReview: 23,
    approvedToday: 12,
    rejectedToday: 2,
    activeTechnicians: 8,
    completionRate: 94.2
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of FibreField operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Link href="/admin/home-drop-reviews">
            <Button size="sm">
              Review Captures
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Captures</p>
                <p className="text-2xl font-bold">{stats.totalCaptures}</p>
              </div>
              <Camera className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12% this week
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingReview}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary">
                Requires attention
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold">{stats.approvedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className="text-green-600">
                Quality: 98%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Technicians</p>
                <p className="text-2xl font-bold">{stats.activeTechnicians}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                Online now
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Installation approved</p>
                  <p className="text-xs text-gray-600">HD-001234 • 2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Camera className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New capture submitted</p>
                  <p className="text-xs text-gray-600">HD-001235 • 5 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Quality issue flagged</p>
                  <p className="text-xs text-gray-600">HD-001232 • 12 minutes ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/home-drop-reviews" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Camera className="w-4 h-4 mr-2" />
                Review Pending Captures ({stats.pendingReview})
              </Button>
            </Link>
            <Link href="/admin/technicians" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Manage Technicians
              </Button>
            </Link>
            <Link href="/admin/map-review" className="block">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="w-4 h-4 mr-2" />
                Geographic View
              </Button>
            </Link>
            <Link href="/admin/reports" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                Performance Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}