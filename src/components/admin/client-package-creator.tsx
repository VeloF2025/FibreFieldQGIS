/**
 * Client Package Creator Component
 * 
 * Interface for creating and managing client photo packages.
 * Provides template-based package creation, custom package builder,
 * and delivery management capabilities.
 * 
 * Key Features:
 * 1. Template-based package creation
 * 2. Custom package builder with photo selection
 * 3. Client delivery settings and access control
 * 4. Email notification configuration
 * 5. Package preview and validation
 * 6. Bulk package operations
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Template, 
  Mail, 
  Calendar, 
  Download, 
  Eye, 
  Settings, 
  User, 
  Shield, 
  Clock, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Plus,
  Minus,
  Send,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  Star,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  clientDeliveryService,
  type PackageTemplate,
  type BulkPackageOperation 
} from '@/services/client-delivery.service';
import { 
  photoManagementService, 
  type PhotoMetadata, 
  type ClientPhotoPackage 
} from '@/services/photo-management.service';
import { homeDropCaptureService } from '@/services/home-drop-capture.service';
import { cn } from '@/lib/utils';
import { log } from '@/lib/logger';

/**
 * Package Creation Options
 */
interface PackageCreationOptions {
  templateId?: string;
  customName?: string;
  homeDropIds: string[];
  selectedPhotos: string[];
  clientEmail?: string;
  expiryDays: number;
  maxDownloads: number;
  requiresAuth: boolean;
  includeMetadata: boolean;
  includeGPS: boolean;
  maxResolution: 'original' | 'large' | 'medium';
  emailTemplate: string;
  customMessage?: string;
}

/**
 * Package Template Card Component
 */
function PackageTemplateCard({ 
  template, 
  isSelected, 
  onSelect, 
  onPreview 
}: {
  template: PackageTemplate;
  isSelected: boolean;
  onSelect: (templateId: string) => void;
  onPreview: (template: PackageTemplate) => void;
}) {
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-blue-500"
      )}
      onClick={() => onSelect(template.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          {template.isDefault && (
            <Badge variant="secondary">Default</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Photo Types */}
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Included Photos</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {template.photoTypes.map(type => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Settings */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">Max: {template.maxResolution}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">
                {template.includeMetadata ? 'With metadata' : 'No metadata'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">
                {template.includeGPS ? 'With GPS' : 'No GPS'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 text-gray-400" />
              <span className="text-gray-600">{template.emailTemplate}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => {
                e.stopPropagation();
                onPreview(template);
              }}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onSelect(template.id);
              }}
              className="flex-1"
              disabled={isSelected}
            >
              {isSelected ? 'Selected' : 'Select'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Photo Selection Component
 */
function PhotoSelectionGrid({ 
  photos, 
  selectedPhotos, 
  onTogglePhoto, 
  onSelectAll, 
  onDeselectAll 
}: {
  photos: PhotoMetadata[];
  selectedPhotos: string[];
  onTogglePhoto: (photoId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const approvedPhotos = photos.filter(p => p.approvalStatus === 'approved');
  const selectedCount = selectedPhotos.length;
  
  return (
    <div className="space-y-4">
      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {selectedCount} of {approvedPhotos.length} photos selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onSelectAll}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={onDeselectAll}>
              Clear
            </Button>
          </div>
        </div>
        
        <Badge variant="outline">
          Only approved photos are available
        </Badge>
      </div>
      
      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {approvedPhotos.map(photo => (
          <div
            key={photo.id}
            className={cn(
              "relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
              selectedPhotos.includes(photo.id) 
                ? "border-blue-500 ring-2 ring-blue-200" 
                : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => onTogglePhoto(photo.id)}
          >
            <div className="aspect-[4/3] relative">
              <img
                src={photo.urls.thumbnail}
                alt={photo.photoType}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all">
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedPhotos.includes(photo.id)}
                    onChange={() => onTogglePhoto(photo.id)}
                    className="bg-white"
                  />
                </div>
                
                <div className="absolute bottom-2 left-2 right-2">
                  <Badge className="text-xs w-full justify-center">
                    {photo.photoType.replace('-', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Photo Info */}
            <div className="absolute top-2 right-2">
              <div className="bg-white rounded-full p-1">
                <Camera className="w-3 h-3 text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {approvedPhotos.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No approved photos available</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Package Settings Component
 */
function PackageSettings({ 
  options, 
  onChange 
}: {
  options: PackageCreationOptions;
  onChange: (updates: Partial<PackageCreationOptions>) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Package Settings</CardTitle>
          <CardDescription>Configure package delivery and access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customName">Package Name</Label>
              <Input
                id="customName"
                placeholder="e.g., Installation Photos - Smith Residence"
                value={options.customName || ''}
                onChange={(e) => onChange({ customName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="clientEmail">Client Email (Optional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={options.clientEmail || ''}
                onChange={(e) => onChange({ clientEmail: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Expiry Days: {options.expiryDays}</Label>
              <Slider
                value={[options.expiryDays]}
                onValueChange={([value]) => onChange({ expiryDays: value })}
                min={1}
                max={90}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 day</span>
                <span>90 days</span>
              </div>
            </div>
            
            <div>
              <Label>Max Downloads: {options.maxDownloads}</Label>
              <Slider
                value={[options.maxDownloads]}
                onValueChange={([value]) => onChange({ maxDownloads: value })}
                min={1}
                max={50}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 download</span>
                <span>50 downloads</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Authentication</Label>
                <p className="text-sm text-gray-500">Generate access code for security</p>
              </div>
              <Switch
                checked={options.requiresAuth}
                onCheckedChange={(checked) => onChange({ requiresAuth: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Include Metadata</Label>
                <p className="text-sm text-gray-500">Include technical photo metadata</p>
              </div>
              <Switch
                checked={options.includeMetadata}
                onCheckedChange={(checked) => onChange({ includeMetadata: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Include GPS Data</Label>
                <p className="text-sm text-gray-500">Include location data for QGIS compatibility</p>
              </div>
              <Switch
                checked={options.includeGPS}
                onCheckedChange={(checked) => onChange({ includeGPS: checked })}
              />
            </div>
          </div>
          
          <div>
            <Label>Maximum Resolution</Label>
            <Select value={options.maxResolution} onValueChange={(value: any) => onChange({ maxResolution: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medium">Medium (1024px) - Fast download</SelectItem>
                <SelectItem value="large">Large (2048px) - Good quality</SelectItem>
                <SelectItem value="original">Original - Full resolution</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Email Template</Label>
            <Select value={options.emailTemplate} onValueChange={(value) => onChange({ emailTemplate: value })}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="progress-update">Progress Update</SelectItem>
                <SelectItem value="completion-notice">Completion Notice</SelectItem>
                <SelectItem value="technical-delivery">Technical Delivery</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {options.emailTemplate === 'custom' && (
            <div>
              <Label htmlFor="customMessage">Custom Message</Label>
              <Textarea
                id="customMessage"
                placeholder="Enter your custom message to the client..."
                value={options.customMessage || ''}
                onChange={(e) => onChange({ customMessage: e.target.value })}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Package Preview Component
 */
function PackagePreview({ 
  options, 
  photos 
}: {
  options: PackageCreationOptions;
  photos: PhotoMetadata[];
}) {
  const selectedPhotoData = photos.filter(p => options.selectedPhotos.includes(p.id));
  const totalSizeBytes = selectedPhotoData.reduce((sum, photo) => {
    const resolutionKey = options.maxResolution === 'original' ? 'originalSize' : 
                          options.maxResolution === 'large' ? 'originalSize' * 0.7 :
                          'originalSize' * 0.4;
    return sum + (typeof resolutionKey === 'string' ? photo.originalSize : resolutionKey);
  }, 0);
  const totalSizeMB = totalSizeBytes / (1024 * 1024);
  
  const photosByType = selectedPhotoData.reduce((acc, photo) => {
    acc[photo.photoType] = (acc[photo.photoType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + options.expiryDays);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Package Preview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Package Name</Label>
              <p className="font-medium">{options.customName || 'Untitled Package'}</p>
            </div>
            
            <div>
              <Label className="text-gray-600">Total Photos</Label>
              <p className="font-medium">{selectedPhotoData.length}</p>
            </div>
            
            <div>
              <Label className="text-gray-600">Estimated Size</Label>
              <p className="font-medium">{totalSizeMB.toFixed(1)} MB</p>
            </div>
            
            <div>
              <Label className="text-gray-600">Max Resolution</Label>
              <p className="font-medium capitalize">{options.maxResolution}</p>
            </div>
            
            <div>
              <Label className="text-gray-600">Expires</Label>
              <p className="font-medium">{expiryDate.toLocaleDateString()}</p>
            </div>
            
            <div>
              <Label className="text-gray-600">Max Downloads</Label>
              <p className="font-medium">{options.maxDownloads}</p>
            </div>
          </div>
          
          <Separator />
          
          {/* Photo Breakdown */}
          <div>
            <Label className="text-gray-600">Photo Types</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(photosByType).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {type.replace('-', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>
          
          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {options.includeMetadata ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span>Include metadata</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {options.includeGPS ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span>Include GPS data</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {options.requiresAuth ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span>Requires authentication</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              {options.clientEmail ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span>Email notification</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Estimated Download Time */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Download Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <Label className="text-gray-500">Broadband (50 Mbps)</Label>
              <p className="font-medium">{Math.ceil(totalSizeMB * 8 / 50)} seconds</p>
            </div>
            <div>
              <Label className="text-gray-500">Mobile (10 Mbps)</Label>
              <p className="font-medium">{Math.ceil(totalSizeMB * 8 / 10)} seconds</p>
            </div>
            <div>
              <Label className="text-gray-500">Slow (2 Mbps)</Label>
              <p className="font-medium">{Math.ceil(totalSizeMB * 8 / 2)} seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main Client Package Creator Component
 */
export function ClientPackageCreator({ 
  homeDropId,
  onPackageCreated 
}: {
  homeDropId?: string;
  onPackageCreated?: (packageId: string) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const [options, setOptions] = useState<PackageCreationOptions>({
    homeDropIds: homeDropId ? [homeDropId] : [],
    selectedPhotos: [],
    expiryDays: 30,
    maxDownloads: 5,
    requiresAuth: false,
    includeMetadata: true,
    includeGPS: true,
    maxResolution: 'large' as const,
    emailTemplate: 'completion-notice'
  });
  
  const steps = [
    { id: 'template', title: 'Select Template', description: 'Choose package template or create custom' },
    { id: 'photos', title: 'Select Photos', description: 'Choose photos to include' },
    { id: 'settings', title: 'Package Settings', description: 'Configure delivery options' },
    { id: 'preview', title: 'Preview & Create', description: 'Review and create package' }
  ];

  // Load templates and photos on mount
  useEffect(() => {
    loadData();
  }, [homeDropId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load photos for home drop
      if (homeDropId) {
        const homeDropPhotos = await photoManagementService.getHomeDropPhotos(homeDropId);
        setPhotos(homeDropPhotos);
      }
      
      // TODO: Load templates from service
      // For now, using mock templates
      const mockTemplates: PackageTemplate[] = [
        {
          id: 'completion-package',
          name: 'Completion Package',
          description: 'Complete installation documentation for client delivery',
          photoTypes: ['power-meter-test', 'fibertime-setup-confirmation', 'fibertime-device-actions', 'router-4-lights-status'],
          includeMetadata: true,
          includeGPS: true,
          maxResolution: 'large',
          emailTemplate: 'completion-notice',
          isDefault: true
        },
        {
          id: 'progress-report',
          name: 'Progress Report',
          description: 'Installation progress photos for client updates',
          photoTypes: ['power-meter-test', 'fibertime-setup-confirmation'],
          includeMetadata: true,
          includeGPS: false,
          maxResolution: 'medium',
          emailTemplate: 'progress-update',
          isDefault: true
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to load package creator data', { error: errorMessage }, 'ClientPackageCreator');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    // Auto-select photos matching template
    const matchingPhotos = photos
      .filter(p => 
        template.photoTypes.includes(p.photoType) &&
        p.approvalStatus === 'approved'
      )
      .map(p => p.id);
    
    setOptions(prev => ({
      ...prev,
      templateId,
      selectedPhotos: matchingPhotos,
      includeMetadata: template.includeMetadata,
      includeGPS: template.includeGPS,
      maxResolution: template.maxResolution,
      emailTemplate: template.emailTemplate,
      customName: template.name
    }));
  };

  const handlePhotoToggle = (photoId: string) => {
    setOptions(prev => ({
      ...prev,
      selectedPhotos: prev.selectedPhotos.includes(photoId)
        ? prev.selectedPhotos.filter(id => id !== photoId)
        : [...prev.selectedPhotos, photoId]
    }));
  };

  const handleSelectAllPhotos = () => {
    const approvedPhotoIds = photos
      .filter(p => p.approvalStatus === 'approved')
      .map(p => p.id);
    
    setOptions(prev => ({
      ...prev,
      selectedPhotos: approvedPhotoIds
    }));
  };

  const handleDeselectAllPhotos = () => {
    setOptions(prev => ({
      ...prev,
      selectedPhotos: []
    }));
  };

  const handleCreatePackage = async () => {
    if (!homeDropId || options.selectedPhotos.length === 0) return;
    
    try {
      setIsCreating(true);
      
      let packageId: string;
      
      if (options.templateId) {
        // Create package from template
        packageId = await clientDeliveryService.createPackageFromTemplate(
          homeDropId,
          options.templateId,
          {
            customName: options.customName,
            clientEmail: options.clientEmail,
            expiryDays: options.expiryDays,
            maxDownloads: options.maxDownloads,
            includeCustomMessage: options.customMessage
          }
        );
      } else {
        // Create custom package
        packageId = await clientDeliveryService.createCustomPackage(
          homeDropId,
          options.selectedPhotos,
          {
            packageName: options.customName || 'Custom Package',
            clientEmail: options.clientEmail,
            expiryDays: options.expiryDays,
            maxDownloads: options.maxDownloads,
            includeMetadata: options.includeMetadata,
            includeGPS: options.includeGPS,
            maxResolution: options.maxResolution,
            customMessage: options.customMessage
          }
        );
      }
      
      log.info('Package created successfully', { packageId, homeDropId }, 'ClientPackageCreator');
      onPackageCreated?.(packageId);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to create package', { homeDropId, error: errorMessage }, 'ClientPackageCreator');
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 0: return options.templateId || options.selectedPhotos.length > 0;
      case 1: return options.selectedPhotos.length > 0;
      case 2: return options.customName && options.customName.trim().length > 0;
      case 3: return true;
      default: return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Package className="w-8 h-8 animate-pulse mx-auto mb-4" />
          <p className="text-gray-500">Loading package creator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Steps Progress */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center",
              index < steps.length - 1 && "flex-1"
            )}
          >
            <div className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep >= index
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-600"
                )}
              >
                {index + 1}
              </div>
              <div className="ml-3">
                <p className={cn(
                  "text-sm font-medium",
                  currentStep >= index ? "text-blue-600" : "text-gray-500"
                )}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-gray-200 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Package Template</h3>
              <p className="text-gray-600">Choose a pre-configured template or create a custom package</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <PackageTemplateCard
                  key={template.id}
                  template={template}
                  isSelected={options.templateId === template.id}
                  onSelect={handleTemplateSelect}
                  onPreview={(template) => log.info('Preview template:', template, {}, "Clientpackagecreator")}
                />
              ))}
              
              {/* Custom Package Option */}
              <Card 
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md border-dashed",
                  !options.templateId && "ring-2 ring-blue-500"
                )}
                onClick={() => setOptions(prev => ({ ...prev, templateId: undefined }))}
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Plus className="w-8 h-8 text-gray-400 mb-4" />
                  <h3 className="font-semibold mb-2">Custom Package</h3>
                  <p className="text-sm text-gray-600 text-center">
                    Create a custom package with your own photo selection and settings
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Photos</h3>
              <p className="text-gray-600">Choose which photos to include in the package</p>
            </div>
            
            <PhotoSelectionGrid
              photos={photos}
              selectedPhotos={options.selectedPhotos}
              onTogglePhoto={handlePhotoToggle}
              onSelectAll={handleSelectAllPhotos}
              onDeselectAll={handleDeselectAllPhotos}
            />
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Package Settings</h3>
              <p className="text-gray-600">Configure delivery options and access settings</p>
            </div>
            
            <PackageSettings
              options={options}
              onChange={(updates) => setOptions(prev => ({ ...prev, ...updates }))}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review & Create Package</h3>
              <p className="text-gray-600">Review your package settings and create the delivery package</p>
            </div>
            
            <PackagePreview options={options} photos={photos} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          Previous
        </Button>
        
        {currentStep < steps.length - 1 ? (
          <Button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed(currentStep)}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleCreatePackage}
            disabled={!canProceed(currentStep) || isCreating}
          >
            {isCreating ? (
              <>
                <Package className="w-4 h-4 mr-2 animate-spin" />
                Creating Package...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Create Package
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}