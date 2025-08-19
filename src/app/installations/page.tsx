'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Camera,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { localDB } from '@/lib/database';
import { cn } from '@/lib/utils';

interface Installation {
  id: string;
  poleNumber: string;
  projectId?: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photos: Array<{
    id: string;
    type: string;
    url?: string;
    localData?: string;
    capturedAt: Date;
  }>;
  capturedAt: Date;
  capturedBy: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
  fieldNotes?: string;
}

type FilterStatus = 'all' | 'synced' | 'pending' | 'failed';
type SortOption = 'newest' | 'oldest' | 'pole';

export default function InstallationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [filteredInstallations, setFilteredInstallations] = useState<Installation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Load installations from local database
  const loadInstallations = async () => {
    try {
      setIsLoading(true);
      const records = await localDB.poleInstallations.orderBy('createdAt').reverse().toArray();
      
      // Convert to our Installation interface
      const mappedInstallations: Installation[] = records.map(record => ({
        id: record.id || 'unknown',
        poleNumber: record.poleNumber || 'Unknown',
        projectId: record.projectId,
        location: record.location,
        photos: [], // Will be loaded separately
        capturedAt: record.createdAt || new Date(),
        capturedBy: record.capturedBy || 'Unknown',
        isOffline: record.isOffline || false,
        syncStatus: record.isOffline ? 'pending' : 'synced',
        fieldNotes: record.fieldNotes
      }));

      // Load photos for each installation
      for (const installation of mappedInstallations) {
        const photos = await localDB.photos
          .where('installationId')
          .equals(installation.id)
          .toArray();
        
        installation.photos = photos.map(photo => ({
          id: photo.id || 'unknown',
          type: photo.type || 'unknown',
          url: photo.url,
          localData: photo.localData,
          capturedAt: photo.createdAt || new Date()
        }));
      }

      setInstallations(mappedInstallations);
    } catch (error) {
      console.error('Failed to load installations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort installations
  useEffect(() => {
    let filtered = installations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(installation =>
        installation.poleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        installation.projectId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        installation.fieldNotes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(installation => installation.syncStatus === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.capturedAt.getTime() - a.capturedAt.getTime();
        case 'oldest':
          return a.capturedAt.getTime() - b.capturedAt.getTime();
        case 'pole':
          return a.poleNumber.localeCompare(b.poleNumber);
        default:
          return 0;
      }
    });

    setFilteredInstallations(filtered);
  }, [installations, searchTerm, filterStatus, sortBy]);

  // Load data on mount
  useEffect(() => {
    loadInstallations();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const viewInstallationDetails = (installation: Installation) => {
    // Navigate to detail view (to be implemented)
    router.push(`/installations/${installation.id}`);
  };

  return (
    <div className="min-h-screen bg-[#faf9fd] flex flex-col">
      {/* Header - FibreFlow style */}
      <div className="bg-[#005cbb] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Installation History</h1>
        </div>
        
        {/* Summary badge */}
        <Badge variant="secondary" className="bg-white/20 text-white">
          {installations.length} Total
        </Badge>
      </div>

      {/* Filters and Search */}
      <div className="p-4 space-y-4 bg-white border-b">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by pole number, project, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1">
            <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="pole">Pole Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Installation List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : filteredInstallations.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Installations Found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No installations match your current filters.'
                  : 'You haven\'t captured any pole installations yet.'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button 
                  onClick={() => router.push('/poles/capture')}
                  className="bg-[#005cbb] hover:bg-[#004a96]"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start New Capture
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredInstallations.map((installation) => (
            <Card 
              key={installation.id} 
              className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => viewInstallationDetails(installation)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-lg">{installation.poleNumber}</h3>
                    <Badge 
                      variant="secondary" 
                      className={getStatusColor(installation.syncStatus)}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(installation.syncStatus)}
                        {installation.syncStatus}
                      </div>
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {installation.projectId && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Project:</span>
                      <span>{installation.projectId}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{installation.capturedAt.toLocaleDateString()} at {installation.capturedAt.toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {installation.location.latitude.toFixed(6)}, {installation.location.longitude.toFixed(6)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span>{installation.photos.length} photos captured</span>
                  </div>

                  {installation.fieldNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">Notes:</span> {installation.fieldNotes}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Footer */}
      {!isLoading && filteredInstallations.length > 0 && (
        <div className="bg-white border-t px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredInstallations.length} of {installations.length} installations
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600">
                  {installations.filter(i => i.syncStatus === 'synced').length} Synced
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-600" />
                <span className="text-orange-600">
                  {installations.filter(i => i.syncStatus === 'pending').length} Pending
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}