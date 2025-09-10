'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  Filter,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Activity
} from 'lucide-react';
import { log } from '@/lib/logger';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [reportType, setReportType] = useState('overview');

  const overviewStats = {
    totalCaptures: 342,
    completedToday: 28,
    completedWeek: 156,
    completedMonth: 612,
    averageCompletionTime: '12.4 min',
    qualityScore: 94.2,
    activeTechnicians: 15,
    pendingReviews: 23
  };

  const performanceData = [
    { technician: 'John Smith', completed: 45, quality: 96.8, avgTime: '10.2 min' },
    { technician: 'Sarah Johnson', completed: 38, quality: 95.4, avgTime: '11.8 min' },
    { technician: 'Mike Wilson', completed: 32, quality: 93.1, avgTime: '13.5 min' },
    { technician: 'Emma Davis', completed: 29, quality: 97.2, avgTime: '9.8 min' },
    { technician: 'David Brown', completed: 26, quality: 91.3, avgTime: '14.2 min' }
  ];

  const projectData = [
    { project: 'Downtown Fiber Phase 1', completed: 89, pending: 23, efficiency: 79.5 },
    { project: 'Suburban Expansion', completed: 156, pending: 45, efficiency: 77.6 },
    { project: 'Industrial District', completed: 67, pending: 12, efficiency: 84.8 },
    { project: 'Residential Phase 3', completed: 30, pending: 18, efficiency: 62.5 }
  ];

  const exportReport = (type: string) => {
    log.info(`Exporting ${type} report for ${timeRange}`, {}, "Page");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Reports</h1>
          <p className="text-gray-600 mt-1">Analytics and performance metrics dashboard</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportReport('overview')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardContent className="p-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview Dashboard</SelectItem>
              <SelectItem value="performance">Technician Performance</SelectItem>
              <SelectItem value="projects">Project Analytics</SelectItem>
              <SelectItem value="quality">Quality Metrics</SelectItem>
              <SelectItem value="geographic">Geographic Analysis</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {reportType === 'overview' && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{overviewStats.totalCaptures}</p>
                    <p className="text-xs text-gray-600">Total Captures</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{overviewStats.completedToday}</p>
                    <p className="text-xs text-gray-600">Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{overviewStats.averageCompletionTime}</p>
                    <p className="text-xs text-gray-600">Avg Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{overviewStats.qualityScore}%</p>
                    <p className="text-xs text-gray-600">Quality Score</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Completion Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Chart Component</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Interactive completion trends chart would be displayed here.
                  </p>
                  <p className="text-xs text-gray-400">
                    Showing data for {timeRange}. Integration with charting library required.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {reportType === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Technician Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Technician Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceData.map((tech, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{tech.technician}</h4>
                      <Badge variant="outline">
                        Rank #{index + 1}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Completed</p>
                        <p className="font-semibold">{tech.completed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Quality</p>
                        <p className="font-semibold">{tech.quality}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Time</p>
                        <p className="font-semibold">{tech.avgTime}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">Performance Chart</h3>
                  <p className="text-sm text-gray-500">
                    Comparative performance visualization would be displayed here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'projects' && (
        <div className="space-y-6">
          {/* Project Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Project Progress Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectData.map((project, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{project.project}</h4>
                      <Badge 
                        variant="outline" 
                        className={project.efficiency > 80 ? 'text-green-600' : project.efficiency > 70 ? 'text-yellow-600' : 'text-red-600'}
                      >
                        {project.efficiency}% Efficient
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Completed</p>
                        <p className="font-semibold text-green-600">{project.completed}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Pending</p>
                        <p className="font-semibold text-orange-600">{project.pending}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total</p>
                        <p className="font-semibold">{project.completed + project.pending}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${(project.completed / (project.completed + project.pending)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(reportType === 'quality' || reportType === 'geographic') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {reportType === 'quality' ? 'Quality Metrics' : 'Geographic Analysis'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <Filter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  {reportType === 'quality' ? 'Quality Dashboard' : 'Geographic Dashboard'}
                </h3>
                <p className="text-sm text-gray-500">
                  {reportType === 'quality' 
                    ? 'Detailed quality metrics and analysis would be displayed here.'
                    : 'Map-based geographic analysis and heat maps would be displayed here.'
                  }
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <Download className="w-4 h-4 mr-2" />
                  Export {reportType === 'quality' ? 'Quality' : 'Geographic'} Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}