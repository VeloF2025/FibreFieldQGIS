'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Calendar, 
  MapPin, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Pause
} from 'lucide-react';
import { homeDropAssignmentService } from '@/services/home-drop-assignment.service';

interface Assignment {
  id: string;
  homeDropId: string;
  poleNumber: string;
  customer: {
    name: string;
    address: string;
    phone: string;
    location?: { latitude: number; longitude: number; };
  };
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  scheduledDate?: Date;
  dueDate?: Date;
  estimatedDuration: number;
  requirements: string[];
  installationNotes?: string;
  createdAt: Date;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual service call
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          homeDropId: 'HD001',
          poleNumber: 'P-2024-001',
          customer: {
            name: 'John Smith',
            address: '123 Main Street, Toronto, ON',
            phone: '(416) 555-0123',
            location: { latitude: 43.6532, longitude: -79.3832 }
          },
          status: 'accepted',
          priority: 'high',
          assignedTo: 'current-user',
          scheduledDate: new Date(),
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          estimatedDuration: 120,
          requirements: ['power-meter-test', 'fibertime-setup'],
          installationNotes: 'Customer prefers morning installation',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: '2',
          homeDropId: 'HD002',
          poleNumber: 'P-2024-002',
          customer: {
            name: 'Sarah Johnson',
            address: '456 Oak Avenue, Toronto, ON',
            phone: '(416) 555-0456',
            location: { latitude: 43.6622, longitude: -79.3952 }
          },
          status: 'pending',
          priority: 'medium',
          assignedTo: 'current-user',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          estimatedDuration: 90,
          requirements: ['power-meter-test', 'router-setup'],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
        },
        {
          id: '3',
          homeDropId: 'HD003',
          poleNumber: 'P-2024-003',
          customer: {
            name: 'Michael Brown',
            address: '789 Elm Street, Toronto, ON',
            phone: '(416) 555-0789'
          },
          status: 'completed',
          priority: 'low',
          assignedTo: 'current-user',
          scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          estimatedDuration: 105,
          requirements: ['full-installation'],
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000)
        }
      ];

      setAssignments(mockAssignments);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: Assignment['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'accepted':
      case 'in_progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled':
        return <Pause className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Assignment['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assignments</h1>
        <p className="text-gray-600">View and manage your field installation assignments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {assignments.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {assignments.filter(a => a.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {assignments.filter(a => a.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {assignments.filter(a => a.priority === 'urgent' || a.priority === 'high').length}
            </div>
            <div className="text-sm text-gray-600">High Priority</div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(assignment.status)}
                    <h3 className="text-lg font-semibold">
                      Pole {assignment.poleNumber}
                    </h3>
                  </div>
                  <Badge className={getStatusColor(assignment.status)}>
                    {assignment.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(assignment.priority)}>
                    {assignment.priority}
                  </Badge>
                </div>
                <div className="text-sm text-gray-500">
                  Drop ID: {assignment.homeDropId}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{assignment.customer.name}</span>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{assignment.customer.address}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Phone: {assignment.customer.phone}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Duration: {formatDuration(assignment.estimatedDuration)}
                    </span>
                  </div>
                  {assignment.scheduledDate && (
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        Scheduled: {formatDate(assignment.scheduledDate)}
                      </span>
                    </div>
                  )}
                  {assignment.dueDate && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        Due: {formatDate(assignment.dueDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {assignment.requirements.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Requirements:</div>
                  <div className="flex flex-wrap gap-2">
                    {assignment.requirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req.replace('-', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {assignment.installationNotes && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900 mb-1">Installation Notes:</div>
                  <div className="text-sm text-blue-800">{assignment.installationNotes}</div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-xs text-gray-500">
                  Created {formatDate(assignment.createdAt)}
                </div>
                <div className="flex gap-2">
                  {assignment.status === 'pending' && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      Accept Assignment
                    </Button>
                  )}
                  {assignment.status === 'accepted' && (
                    <Link href={`/home-drop-capture?assignment=${assignment.id}`}>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Start Capture
                      </Button>
                    </Link>
                  )}
                  {assignment.status === 'in_progress' && (
                    <Link href={`/home-drop-capture?assignment=${assignment.id}`}>
                      <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                        Continue
                      </Button>
                    </Link>
                  )}
                  {assignment.customer.location && (
                    <Button size="sm" variant="outline">
                      <MapPin className="h-4 w-4 mr-1" />
                      Directions
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {assignments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-600">
              Check back later for new field assignments or contact your supervisor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}