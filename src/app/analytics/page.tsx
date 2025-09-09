'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(false);

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([
    {
      id: 'installations-per-day',
      label: 'Installations per Day',
      value: 8.5,
      unit: 'installations',
      change: 12.5,
      trend: 'up',
      target: 10
    },
    {
      id: 'completion-rate',
      label: 'Completion Rate',
      value: 94.2,
      unit: '%',
      change: 2.1,
      trend: 'up',
      target: 95
    },
    {
      id: 'avg-time-per-install',
      label: 'Avg Time per Install',
      value: 118,
      unit: 'minutes',
      change: -8.3,
      trend: 'down',
      target: 90
    },
    {
      id: 'quality-score',
      label: 'Quality Score',
      value: 4.7,
      unit: '/5',
      change: 0.2,
      trend: 'up',
      target: 4.8
    },
    {
      id: 'sync-success-rate',
      label: 'Sync Success Rate',
      value: 98.1,
      unit: '%',
      change: -0.5,
      trend: 'down',
      target: 99
    },
    {
      id: 'photo-quality-avg',
      label: 'Photo Quality Average',
      value: 87.3,
      unit: '/100',
      change: 4.2,
      trend: 'up',
      target: 90
    }
  ]);

  const [weeklyData, setWeeklyData] = useState<ChartData[]>([
    { label: 'Mon', value: 12, color: '#3b82f6' },
    { label: 'Tue', value: 19, color: '#3b82f6' },
    { label: 'Wed', value: 15, color: '#3b82f6' },
    { label: 'Thu', value: 22, color: '#3b82f6' },
    { label: 'Fri', value: 18, color: '#3b82f6' },
    { label: 'Sat', value: 8, color: '#3b82f6' },
    { label: 'Sun', value: 6, color: '#3b82f6' }
  ]);

  const [statusDistribution, setStatusDistribution] = useState<ChartData[]>([
    { label: 'Completed', value: 156, color: '#10b981' },
    { label: 'In Progress', value: 23, color: '#f59e0b' },
    { label: 'Pending', value: 12, color: '#6b7280' },
    { label: 'Issues', value: 4, color: '#ef4444' }
  ]);

  const refreshData = async () => {
    setLoading(true);
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
  };

  const getTrendIcon = (trend: PerformanceMetric['trend'], change: number) => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (trend: PerformanceMetric['trend']) => {
    return trend === 'up' ? 'text-green-600' : 
           trend === 'down' ? 'text-red-600' : 'text-gray-600';
  };

  const getMetricStatus = (metric: PerformanceMetric) => {
    if (!metric.target) return 'neutral';
    
    const percentOfTarget = (metric.value / metric.target) * 100;
    if (percentOfTarget >= 95) return 'good';
    if (percentOfTarget >= 80) return 'warning';
    return 'poor';
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const maxValue = Math.max(...weeklyData.map(d => d.value));

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
            <p className="text-gray-600">Performance metrics and field operation insights</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white shadow-sm text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === '7d' ? 'Last 7 days' : 
                   range === '30d' ? 'Last 30 days' : 
                   'Last 90 days'}
                </button>
              ))}
            </div>
            <Button 
              variant="outline" 
              onClick={refreshData} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {performanceMetrics.map((metric) => (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{metric.label}</h3>
                {metric.target && (
                  <Badge className={getStatusBadgeClass(getMetricStatus(metric))}>
                    {getMetricStatus(metric)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {metric.value.toLocaleString()} {metric.unit}
                  </div>
                  
                  {metric.target && (
                    <div className="text-xs text-gray-500">
                      Target: {metric.target} {metric.unit}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend, metric.change)}
                  <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>

              {/* Progress bar for metrics with targets */}
              {metric.target && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        getMetricStatus(metric) === 'good' ? 'bg-green-500' :
                        getMetricStatus(metric) === 'warning' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (metric.value / metric.target) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Installation Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 px-4">
              {weeklyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="text-xs text-gray-600 mb-1">{data.value}</div>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm"
                    style={{
                      height: `${(data.value / maxValue) * 200}px`,
                      backgroundColor: data.color
                    }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2">{data.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Installation Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((status, index) => {
                const total = statusDistribution.reduce((sum, s) => sum + s.value, 0);
                const percentage = (status.value / total) * 100;
                
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      ></div>
                      <span className="text-sm font-medium">{status.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {status.value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Progress bars */}
            <div className="mt-6 space-y-2">
              {statusDistribution.map((status, index) => {
                const total = statusDistribution.reduce((sum, s) => sum + s.value, 0);
                const percentage = (status.value / total) * 100;
                
                return (
                  <div key={index}>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: status.color
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Average Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">2.3 hrs</div>
              <p className="text-sm text-gray-600">From assignment to start</p>
              <Badge className="bg-green-100 text-green-800 mt-2">
                <TrendingDown className="h-3 w-3 mr-1" />
                15% faster
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              First-Time Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">91.4%</div>
              <p className="text-sm text-gray-600">No repeat visits needed</p>
              <Badge className="bg-green-100 text-green-800 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                3% improvement
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Team Productivity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">127%</div>
              <p className="text-sm text-gray-600">Of monthly target</p>
              <Badge className="bg-purple-100 text-purple-800 mt-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                Above target
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">12 installations completed today</div>
                  <div className="text-sm text-gray-600">Average time: 95 minutes per installation</div>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800">Today</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Photo quality scores improved</div>
                  <div className="text-sm text-gray-600">Average quality: 87.3/100 (+4.2 from last week)</div>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800">This week</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">3 assignments require attention</div>
                  <div className="text-sm text-gray-600">Overdue installations need rescheduling</div>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-800">Action needed</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}