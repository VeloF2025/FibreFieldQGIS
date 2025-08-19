'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft,
  Calendar,
  MapPin,
  Camera,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  FileText,
  Download,
  Share,
  Navigation,
  Wifi,
  WifiOff,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    fileSize?: number;
  }>;
  qualityChecks?: {
    poleUpright: boolean;
    correctDepth: boolean;
    concreteAdequate: boolean;
    photosComplete: boolean;
    safetyCompliant: boolean;
  };
  capturedAt: Date;
  capturedBy: string;
  isOffline: boolean;
  syncStatus: 'pending' | 'synced' | 'failed';
  fieldNotes?: string;
  contractorId?: string;
}

const photoTypeLabels: { [key: string]: string } = {
  'before': 'Before Installation',
  'depth': 'Depth Verification',
  'compaction': 'Compaction Check',
  'concrete': 'Concrete Application',
  'front': 'Front View',
  'side': 'Side View',
  'after': 'After Installation'
};

export default function InstallationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const installationId = params.id as string;
  
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check online status
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

  // Load installation data
  const loadInstallation = async () => {
    try {
      setIsLoading(true);
      
      // Get installation from local database
      const record = await localDB.poleInstallations.get(installationId);
      
      if (record) {
        // Load photos for this installation
        const photos = await localDB.photos
          .where('installationId')
          .equals(installationId)
          .toArray();
        
        const mappedInstallation: Installation = {
          id: record.id || installationId,
          poleNumber: record.poleNumber || 'Unknown',
          projectId: record.projectId,
          location: record.location,
          photos: photos.map(photo => ({
            id: photo.id || 'unknown',
            type: photo.type || 'unknown',
            url: photo.url,
            localData: photo.localData,
            capturedAt: photo.createdAt || new Date(),
            fileSize: photo.fileSize
          })),
          qualityChecks: record.qualityChecks,
          capturedAt: record.createdAt || new Date(),
          capturedBy: record.capturedBy || 'Unknown',
          isOffline: record.isOffline || false,
          syncStatus: record.isOffline ? 'pending' : 'synced',
          fieldNotes: record.fieldNotes,
          contractorId: record.contractorId
        };

        setInstallation(mappedInstallation);
      }
    } catch (error) {
      console.error('Failed to load installation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (installationId) {
      loadInstallation();
    }
  }, [installationId]);

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

  const openMapLocation = () => {
    if (installation?.location) {
      const { latitude, longitude } = installation.location;
      const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      window.open(mapUrl, '_blank');
    }
  };

  const shareInstallation = async () => {
    if (!installation) return;

    const shareData = {
      title: `Pole Installation - ${installation.poleNumber}`,
      text: `Installation details for pole ${installation.poleNumber}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: Copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Installation link copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const downloadPhotos = () => {
    if (!installation) return;

    installation.photos.forEach((photo, index) => {
      const photoUrl = photo.url || photo.localData;
      if (photoUrl) {
        const link = document.createElement('a');
        link.href = photoUrl;
        link.download = `${installation.poleNumber}_${photo.type}_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  const retrySync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline. Please connect to the internet.');
      return;
    }
    
    // TODO: Implement retry sync logic
    alert('Sync retry feature coming soon!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf9fd]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005cbb] mx-auto mb-4"></div>
          <p>Loading installation details...</p>
        </div>
      </div>
    );
  }

  if (!installation) {
    return (
      <div className="min-h-screen bg-[#faf9fd] flex flex-col">
        <div className="bg-[#005cbb] text-white p-4 flex items-center gap-3 shadow-md">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-medium">Installation Not Found</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="border-0 shadow-sm max-w-md w-full">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Installation Not Found</h3>
              <p className="text-gray-600 mb-4">
                The installation you're looking for doesn't exist or may have been deleted.
              </p>
              <Button 
                onClick={() => router.push('/installations')}
                className="bg-[#005cbb] hover:bg-[#004a96]"
              >
                Back to Installations
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
          <div>
            <h1 className="text-xl font-medium">{installation.poleNumber}</h1>
            <p className="text-sm text-blue-100">Installation Details</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={cn("flex items-center gap-1", getStatusColor(installation.syncStatus))}
          >
            {getStatusIcon(installation.syncStatus)}
            {installation.syncStatus}
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={shareInstallation}
            className="text-white hover:bg-white/20"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos ({installation.photos.length})</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Basic Info */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Installation Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Pole Number:</span>
                    <span>{installation.poleNumber}</span>
                  </div>
                  
                  {installation.projectId && (
                    <div className="flex justify-between">
                      <span className="font-medium">Project:</span>
                      <span>{installation.projectId}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Captured:</span>
                    <span>{installation.capturedAt.toLocaleDateString()} at {installation.capturedAt.toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Captured By:</span>
                    <span>{installation.capturedBy}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <Badge className={getStatusColor(installation.syncStatus)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(installation.syncStatus)}
                        {installation.syncStatus}
                      </div>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  GPS Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">Latitude:</span>
                      <span className="font-mono">{installation.location.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Longitude:</span>
                      <span className="font-mono">{installation.location.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Accuracy:</span>
                      <span>{installation.location.accuracy.toFixed(1)}m</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={openMapLocation}
                    className="w-full bg-[#005cbb] hover:bg-[#004a96]"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Open in Maps
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Field Notes */}
            {installation.fieldNotes && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Field Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">
                    {installation.fieldNotes}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Installation Photos</h3>
              <Button
                onClick={downloadPhotos}
                variant="outline"
                size="sm"
                disabled={installation.photos.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>

            {installation.photos.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos</h3>
                  <p className="text-gray-600">No photos have been captured for this installation.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {installation.photos.map((photo, index) => (
                  <Card key={photo.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">
                            {photoTypeLabels[photo.type] || photo.type}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {photo.capturedAt.toLocaleDateString()} at {photo.capturedAt.toLocaleTimeString()}
                          </p>
                          {photo.fileSize && (
                            <p className="text-xs text-gray-500">
                              {(photo.fileSize / 1024 / 1024).toFixed(1)} MB
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPhoto(photo.url || photo.localData || null)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {(photo.url || photo.localData) && (
                        <div className="relative">
                          <img
                            src={photo.url || photo.localData}
                            alt={photoTypeLabels[photo.type] || photo.type}
                            className="w-full h-48 object-cover rounded-lg"
                            onClick={() => setSelectedPhoto(photo.url || photo.localData || null)}
                          />
                          {!photo.url && photo.localData && (
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Local Only
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Quality Checks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {installation.qualityChecks ? (
                  <div className="space-y-3">
                    {Object.entries(installation.qualityChecks).map(([key, value]) => {
                      if (key === 'completedAt') return null;
                      
                      const labels: { [key: string]: string } = {
                        poleUpright: 'Pole is Upright',
                        correctDepth: 'Correct Depth (≥1.2m)',
                        concreteAdequate: 'Concrete Adequate',
                        photosComplete: 'Photos Complete',
                        safetyCompliant: 'Safety Compliant'
                      };
                      
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm">{labels[key] || key}</span>
                          <div className="flex items-center gap-1">
                            {value ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className={cn(
                              "text-sm font-medium",
                              value ? "text-green-600" : "text-red-600"
                            )}>
                              {value ? 'Pass' : 'Fail'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Quality Checks</h3>
                    <p className="text-gray-600">Quality checks have not been completed for this installation.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Connection:</span>
                    <Badge className={isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Sync Status:</span>
                    <Badge className={getStatusColor(installation.syncStatus)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(installation.syncStatus)}
                        {installation.syncStatus}
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Photos Synced:</span>
                    <span>
                      {installation.photos.filter(p => p.url && !p.localData).length} / {installation.photos.length}
                    </span>
                  </div>
                </div>

                {installation.syncStatus === 'failed' && isOnline && (
                  <Button
                    onClick={retrySync}
                    className="w-full bg-[#005cbb] hover:bg-[#004a96]"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry Sync
                  </Button>
                )}

                {installation.syncStatus === 'pending' && !isOnline && (
                  <Alert>
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                      This installation will sync automatically when you're back online.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={selectedPhoto}
              alt="Full size photo"
              className="max-w-full max-h-full object-contain"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}