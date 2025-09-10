'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin, 
  Clock, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  Phone,
  Mail
} from 'lucide-react';

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'online' | 'offline' | 'busy';
  location: string;
  completedToday: number;
  pendingReviews: number;
  qualityScore: number;
  joinedDate: string;
  avatar?: string;
}

export default function TechniciansPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const [technicians] = useState<Technician[]>([
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@contractor.com',
      phone: '+1 (555) 123-4567',
      status: 'online',
      location: 'Downtown District',
      completedToday: 8,
      pendingReviews: 2,
      qualityScore: 96,
      joinedDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@contractor.com',
      phone: '+1 (555) 234-5678',
      status: 'busy',
      location: 'North Side',
      completedToday: 5,
      pendingReviews: 1,
      qualityScore: 94,
      joinedDate: '2024-02-20'
    },
    {
      id: '3',
      name: 'Mike Wilson',
      email: 'mike.w@contractor.com',
      phone: '+1 (555) 345-6789',
      status: 'offline',
      location: 'East End',
      completedToday: 0,
      pendingReviews: 3,
      qualityScore: 89,
      joinedDate: '2024-03-10'
    },
    {
      id: '4',
      name: 'Emma Davis',
      email: 'emma.davis@contractor.com',
      phone: '+1 (555) 456-7890',
      status: 'online',
      location: 'West District',
      completedToday: 12,
      pendingReviews: 0,
      qualityScore: 98,
      joinedDate: '2023-11-05'
    }
  ]);

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tech.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="w-4 h-4 text-green-600" />;
      case 'busy': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'offline': return <WifiOff className="w-4 h-4 text-gray-600" />;
      default: return <WifiOff className="w-4 h-4 text-gray-600" />;
    }
  };

  const onlineCount = technicians.filter(t => t.status === 'online').length;
  const totalCompleted = technicians.reduce((sum, t) => sum + t.completedToday, 0);
  const avgQuality = Math.round(technicians.reduce((sum, t) => sum + t.qualityScore, 0) / technicians.length);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Technicians</h1>
          <p className="text-gray-600 mt-1">Manage field technicians and track performance</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Technician
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{technicians.length}</p>
                <p className="text-xs text-gray-600">Total Technicians</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{onlineCount}</p>
                <p className="text-xs text-gray-600">Currently Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalCompleted}</p>
                <p className="text-xs text-gray-600">Completed Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600">
                {avgQuality}%
              </Badge>
              <div>
                <p className="text-xs text-gray-600">Avg Quality Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search technicians by name or location..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTechnicians.map((tech) => (
          <Card key={tech.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={tech.avatar} />
                    <AvatarFallback>
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(tech.status)} border-2 border-white`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{tech.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    {getStatusIcon(tech.status)}
                    <span className="capitalize">{tech.status}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{tech.location}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{tech.email}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{tech.phone}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t">
                <div>
                  <p className="font-semibold text-lg">{tech.completedToday}</p>
                  <p className="text-gray-600">Today</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{tech.pendingReviews}</p>
                  <p className="text-gray-600">Pending</p>
                </div>
                <div>
                  <p className="font-semibold text-lg">{tech.qualityScore}%</p>
                  <p className="text-gray-600">Quality</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}