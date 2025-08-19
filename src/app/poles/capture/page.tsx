'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Camera, 
  MapPin, 
  Save, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useOfflineContext } from '@/components/providers/offline-provider';
import { fieldCaptureService } from '@/services/field-capture.service';
import { PhotoType } from '@/models/field-capture.model';
import { cn } from '@/lib/utils';

// Define step types for the workflow
type WorkflowStep = 'project' | 'before' | 'depth' | 'compaction' | 'concrete' | 'front' | 'side' | 'complete';

export default function PoleCapturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isInitialized } = useOfflineContext();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('project');
  const [poleNumber, setPoleNumber] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<{ [key in PhotoType]?: File }>({});
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [initialGpsLocation, setInitialGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queuedItems, setQueuedItems] = useState(0);
  
  // Step-specific validations
  const [stepValidations, setStepValidations] = useState({
    // Before step
    beforePhoto: false,
    poleNumberEntered: false,
    linkedToFibreFlow: false,
    
    // Depth step
    depthPhoto: false,
    depthSufficient: false, // At least 1.2m
    
    // Compaction step
    compactionPhoto: false,
    compactionDone: false,
    
    // Concrete step
    concretePhoto: false,
    concreteUsed: false,
    
    // Front step
    frontPhoto: false,
    frontVertical: false,
    frontClearOfPowerLines: false,
    frontClearOfInfrastructure: false,
    frontSpiritLevel: false,
    
    // Side step
    sidePhoto: false,
    sideVertical: false,
    sideClearOfPowerLines: false,
    sideClearOfInfrastructure: false,
    sideSpiritLevel: false,
  });
  
  // UI state
  const [isCapturingGPS, setIsCapturingGPS] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoType | null>(null);
  
  // Workflow steps configuration
  const workflowSteps: WorkflowStep[] = ['project', 'before', 'depth', 'compaction', 'concrete', 'front', 'side', 'complete'];
  
  const stepTitles: Record<WorkflowStep, string> = {
    'project': 'Select Project',
    'before': 'Before Installation',
    'depth': 'Hole Depth',
    'compaction': 'Compaction',
    'concrete': 'Concrete',
    'front': 'Front View',
    'side': 'Side View',
    'complete': 'Review & Complete'
  };
  
  const photoLabels: Record<PhotoType, string> = {
    'before': 'Before Installation',
    'front': 'Front View (with Spirit Level)',
    'side': 'Side View (with Spirit Level)',
    'depth': 'Hole Depth (≥1.2m)',
    'concrete': 'Concrete Application',
    'compaction': 'Ground Compaction',
  };
  
  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Get GPS location
  const captureGPS = async () => {
    setIsCapturingGPS(true);
    setError(null);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      setGpsLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    } catch (err) {
      setError('Failed to get GPS location. Please enable location services.');
      console.error('GPS error:', err);
    } finally {
      setIsCapturingGPS(false);
    }
  };
  
  const getGPSAccuracyColor = () => {
    if (!gpsLocation) return 'text-gray-500';
    if (gpsLocation.accuracy <= 5) return 'text-green-600';
    if (gpsLocation.accuracy <= 10) return 'text-blue-600';
    return 'text-yellow-600';
  };
  
  // Handle photo capture/selection
  const handlePhotoCapture = (type: PhotoType) => {
    setCurrentPhotoType(type);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentPhotoType) {
      setPhotos(prev => ({ ...prev, [currentPhotoType]: file }));
      
      // Update step-specific validations based on photo type
      switch (currentPhotoType) {
        case 'before':
          setStepValidations(prev => ({ ...prev, beforePhoto: true }));
          // Capture initial GPS when before photo is taken
          if (gpsLocation && !initialGpsLocation) {
            setInitialGpsLocation(gpsLocation);
          }
          break;
        case 'depth':
          setStepValidations(prev => ({ ...prev, depthPhoto: true }));
          break;
        case 'compaction':
          setStepValidations(prev => ({ ...prev, compactionPhoto: true }));
          break;
        case 'concrete':
          setStepValidations(prev => ({ ...prev, concretePhoto: true }));
          break;
        case 'front':
          setStepValidations(prev => ({ ...prev, frontPhoto: true }));
          break;
        case 'side':
          setStepValidations(prev => ({ ...prev, sidePhoto: true }));
          break;
      }
    }
    
    // Reset input for next capture
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCurrentPhotoType(null);
  };
  
  const removePhoto = (type: PhotoType) => {
    setPhotos(prev => {
      const updated = { ...prev };
      delete updated[type];
      
      // Update step-specific validations based on photo type
      switch (type) {
        case 'before':
          setStepValidations(prev => ({ ...prev, beforePhoto: false }));
          break;
        case 'depth':
          setStepValidations(prev => ({ ...prev, depthPhoto: false }));
          break;
        case 'compaction':
          setStepValidations(prev => ({ ...prev, compactionPhoto: false }));
          break;
        case 'concrete':
          setStepValidations(prev => ({ ...prev, concretePhoto: false }));
          break;
        case 'front':
          setStepValidations(prev => ({ ...prev, frontPhoto: false }));
          break;
        case 'side':
          setStepValidations(prev => ({ ...prev, sidePhoto: false }));
          break;
      }
      
      return updated;
    });
  };
  
  // Check if current step is complete
  const isStepComplete = (step: WorkflowStep): boolean => {
    switch (step) {
      case 'project':
        return !!projectId;
      case 'before':
        return stepValidations.beforePhoto && 
               stepValidations.poleNumberEntered && 
               !!initialGpsLocation;
      case 'depth':
        return stepValidations.depthPhoto && 
               stepValidations.depthSufficient;
      case 'compaction':
        return stepValidations.compactionPhoto && 
               stepValidations.compactionDone;
      case 'concrete':
        return stepValidations.concretePhoto && 
               stepValidations.concreteUsed;
      case 'front':
        return stepValidations.frontPhoto && 
               stepValidations.frontVertical && 
               stepValidations.frontClearOfPowerLines && 
               stepValidations.frontClearOfInfrastructure &&
               stepValidations.frontSpiritLevel;
      case 'side':
        return stepValidations.sidePhoto && 
               stepValidations.sideVertical && 
               stepValidations.sideClearOfPowerLines && 
               stepValidations.sideClearOfInfrastructure &&
               stepValidations.sideSpiritLevel;
      case 'complete':
        return true;
      default:
        return false;
    }
  };
  
  const canProceedToNext = () => {
    return isStepComplete(currentStep);
  };
  
  const handleNext = () => {
    if (canProceedToNext()) {
      const currentIndex = workflowSteps.indexOf(currentStep);
      if (currentIndex < workflowSteps.length - 1) {
        setCurrentStep(workflowSteps[currentIndex + 1]);
        setError(null);
      }
    } else {
      setError('Please complete all required fields before proceeding');
    }
  };
  
  const handleBack = () => {
    const currentIndex = workflowSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(workflowSteps[currentIndex - 1]);
      setError(null);
    }
  };
  
  // Start capture after project selection
  const startCapture = () => {
    if (!projectId) {
      setError('Please select a project');
      return;
    }
    
    setCurrentStep('before');
    setError(null);
  };
  
  // Attempt to link with FibreFlow pole
  const linkWithFibreFlow = async (poleNum: string) => {
    // TODO: Implement actual API call to FibreFlow to verify pole exists
    try {
      // Simulated check - in production, this would query FibreFlow database
      const exists = poleNum.match(/^[A-Z]{3}\.P\.[A-Z0-9]+$/); // Basic format validation
      setStepValidations(prev => ({ ...prev, linkedToFibreFlow: !!exists }));
      if (!exists) {
        setError('Warning: Pole number not found in FibreFlow system');
      }
    } catch (err) {
      console.error('Error linking with FibreFlow:', err);
    }
  };
  
  // Complete capture and save
  const completeCapture = async () => {
    if (!poleNumber || !initialGpsLocation) {
      setError('Please complete all required steps first');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Create installation
      const installationId = await fieldCaptureService.createInstallation({
        poleNumber,
        projectId: projectId || undefined,
        contractorId: user?.uid || 'unknown',
        actualGPS: initialGpsLocation,
        fieldNotes: notes || undefined,
        capturedBy: user?.displayName || user?.email || 'Field Technician'
      });
      
      // Upload photos
      for (const [type, file] of Object.entries(photos)) {
        await fieldCaptureService.capturePhoto(
          installationId,
          type as PhotoType,
          file
        );
      }
      
      // Submit quality checks - create basic quality checks from step validations
      await fieldCaptureService.submitQualityChecks(installationId, {
        poleUpright: stepValidations.frontVertical && stepValidations.sideVertical,
        correctDepth: stepValidations.depthSufficient,
        concreteAdequate: stepValidations.concreteUsed,
        photosComplete: Object.keys(photos).length >= 6, // All required photos
        safetyCompliant: stepValidations.frontClearOfPowerLines && stepValidations.sideClearOfPowerLines
      });
      
      setSuccess(true);
      
      // Update queued items count
      if (!isOnline) {
        setQueuedItems(prev => prev + 1);
      }
      
      // Reset form after delay
      setTimeout(() => {
        resetForm();
        router.push('/poles');
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save installation');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };
  
  const resetForm = () => {
    setPoleNumber('');
    setProjectId('');
    setNotes('');
    setPhotos({});
    setGpsLocation(null);
    setInitialGpsLocation(null);
    setSuccess(false);
    setCurrentStep('project');
    setStepValidations({
      beforePhoto: false,
      poleNumberEntered: false,
      linkedToFibreFlow: false,
      depthPhoto: false,
      depthSufficient: false,
      compactionPhoto: false,
      compactionDone: false,
      concretePhoto: false,
      concreteUsed: false,
      frontPhoto: false,
      frontVertical: false,
      frontClearOfPowerLines: false,
      frontClearOfInfrastructure: false,
      frontSpiritLevel: false,
      sidePhoto: false,
      sideVertical: false,
      sideClearOfPowerLines: false,
      sideClearOfInfrastructure: false,
      sideSpiritLevel: false,
    });
  };
  
  // Auto-capture GPS on mount
  useEffect(() => {
    if (isInitialized && !gpsLocation) {
      captureGPS();
    }
  }, [isInitialized]);
  
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Initializing offline systems...</p>
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
          <h1 className="text-xl font-medium">Field Pole Capture</h1>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-2">
          <Badge 
            variant={isOnline ? "secondary" : "destructive"}
            className={cn(
              "flex items-center gap-1",
              isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}
          >
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          {queuedItems > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {queuedItems} Queued
            </Badge>
          )}
        </div>
      </div>
      
      {/* GPS Status Card */}
      <Card className="m-4 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className={cn("h-5 w-5", getGPSAccuracyColor())} />
              <div>
                {gpsLocation ? (
                  <>
                    <p className="font-mono text-sm">
                      {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                    </p>
                    <p className={cn(
                      "text-xs",
                      gpsLocation.accuracy <= 10 ? "text-green-600" : "text-orange-600"
                    )}>
                      Accuracy: {gpsLocation.accuracy.toFixed(0)}m
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">Acquiring GPS...</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={captureGPS}
              disabled={isCapturingGPS}
            >
              {isCapturingGPS ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {/* Progress Indicator */}
        <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">
              Step {workflowSteps.indexOf(currentStep) + 1} of {workflowSteps.length}
            </span>
            <span className="text-sm font-medium">{stepTitles[currentStep]}</span>
          </div>
          <Progress value={(workflowSteps.indexOf(currentStep) + 1) / workflowSteps.length * 100} className="h-2" />
        </div>

        {currentStep === 'project' ? (
          /* Step 1: Project Selection */
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
              <CardDescription>Choose the project for this pole installation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project <span className="text-red-500">*</span></Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project-001">Lawley Phase 1</SelectItem>
                    <SelectItem value="project-002">Mohadin Installation</SelectItem>
                    <SelectItem value="project-003">Test Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-[#005cbb] hover:bg-[#004a96]"
                onClick={startCapture}
                disabled={!projectId}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        ) : (
          /* Active Capture Workflow */
          <Card className="border-0 shadow-sm">
            {/* Step 2: Before Installation */}
            {currentStep === 'before' && (
              <>
                <CardHeader>
                  <CardTitle>Before Installation</CardTitle>
                  <CardDescription>
                    Capture the initial site condition and pole number from 1Map
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Photo capture */}
                  <div className="space-y-3">
                    <Label>Site Photo <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.before ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.before)}
                            alt="Before Installation"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('before')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('before')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Before pole installation</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* GPS Location (captured with photo) */}
                  {initialGpsLocation && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">Location Captured</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1 font-mono">
                        {initialGpsLocation.lat.toFixed(6)}, {initialGpsLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  )}
                  
                  {/* Pole Number from 1Map */}
                  <div className="space-y-2">
                    <Label htmlFor="poleNumber">Pole Number (from 1Map) <span className="text-red-500">*</span></Label>
                    <Input
                      id="poleNumber"
                      value={poleNumber}
                      onChange={(e) => {
                        setPoleNumber(e.target.value);
                        setStepValidations(prev => ({ ...prev, poleNumberEntered: !!e.target.value }));
                        if (e.target.value) {
                          linkWithFibreFlow(e.target.value);
                        }
                      }}
                      placeholder="e.g., LAW.P.B167"
                    />
                    <p className="text-xs text-gray-500">Enter the pole number from 1Map system</p>
                    {stepValidations.linkedToFibreFlow && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Found in FibreFlow system
                      </p>
                    )}
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 3: Hole Depth */}
            {currentStep === 'depth' && (
              <>
                <CardHeader>
                  <CardTitle>Hole Depth Verification</CardTitle>
                  <CardDescription>
                    Confirm the hole is at least 1.2 meters deep
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Depth photo */}
                  <div className="space-y-3">
                    <Label>Depth Photo <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.depth ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.depth)}
                            alt="Hole Depth"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('depth')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('depth')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Show depth measurement</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Depth confirmation */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-[#005cbb]">Depth Verification</h4>
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={stepValidations.depthSufficient}
                        onCheckedChange={(checked) => 
                          setStepValidations(prev => ({ ...prev, depthSufficient: !!checked }))
                        }
                      />
                      <span className="text-sm">Hole is at least 1.2 meters deep</span>
                    </label>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 4: Compaction */}
            {currentStep === 'compaction' && (
              <>
                <CardHeader>
                  <CardTitle>Ground Compaction</CardTitle>
                  <CardDescription>
                    Document ground compaction around the pole
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Compaction photo */}
                  <div className="space-y-3">
                    <Label>Compaction Photo <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.compaction ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.compaction)}
                            alt="Ground Compaction"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('compaction')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('compaction')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Show ground compaction</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Compaction confirmation */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-[#005cbb]">Compaction Verification</h4>
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={stepValidations.compactionDone}
                        onCheckedChange={(checked) => 
                          setStepValidations(prev => ({ ...prev, compactionDone: !!checked }))
                        }
                      />
                      <span className="text-sm">Ground compaction completed properly</span>
                    </label>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 5: Concrete */}
            {currentStep === 'concrete' && (
              <>
                <CardHeader>
                  <CardTitle>Concrete Application</CardTitle>
                  <CardDescription>
                    Document concrete usage for pole foundation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Concrete photo */}
                  <div className="space-y-3">
                    <Label>Concrete Photo <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.concrete ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.concrete)}
                            alt="Concrete Application"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('concrete')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('concrete')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Show concrete application</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Concrete confirmation */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-[#005cbb]">Concrete Verification</h4>
                    <label className="flex items-center space-x-2">
                      <Checkbox
                        checked={stepValidations.concreteUsed}
                        onCheckedChange={(checked) => 
                          setStepValidations(prev => ({ ...prev, concreteUsed: !!checked }))
                        }
                      />
                      <span className="text-sm">Concrete was properly applied</span>
                    </label>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 6: Front View */}
            {currentStep === 'front' && (
              <>
                <CardHeader>
                  <CardTitle>Front View Verification</CardTitle>
                  <CardDescription>
                    Photo from front with spirit level showing pole is vertical
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Front photo */}
                  <div className="space-y-3">
                    <Label>Front Photo (with Spirit Level) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.front ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.front)}
                            alt="Front View with Spirit Level"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('front')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('front')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Include spirit level in photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Front view checks */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-[#005cbb]">Front View Verification</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.frontVertical}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, frontVertical: !!checked }))
                          }
                        />
                        <span className="text-sm">Pole is vertical (plumb)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.frontClearOfPowerLines}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, frontClearOfPowerLines: !!checked }))
                          }
                        />
                        <span className="text-sm">Clear of power lines</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.frontClearOfInfrastructure}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, frontClearOfInfrastructure: !!checked }))
                          }
                        />
                        <span className="text-sm">Clear of other infrastructure</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.frontSpiritLevel}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, frontSpiritLevel: !!checked }))
                          }
                        />
                        <span className="text-sm">Spirit level visible in photo</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 7: Side View */}
            {currentStep === 'side' && (
              <>
                <CardHeader>
                  <CardTitle>Side View Verification</CardTitle>
                  <CardDescription>
                    Photo from side with spirit level showing pole is vertical
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Side photo */}
                  <div className="space-y-3">
                    <Label>Side Photo (with Spirit Level) <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      {photos.side ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-green-500">
                          <img
                            src={URL.createObjectURL(photos.side)}
                            alt="Side View with Spirit Level"
                            className="w-full h-full object-cover"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-8 w-8"
                            onClick={() => removePhoto('side')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePhotoCapture('side')}
                          className="w-full aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-[#005cbb] hover:bg-blue-50 flex flex-col items-center justify-center transition-colors"
                        >
                          <Camera className="h-10 w-10 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">Take Photo</span>
                          <span className="text-xs text-gray-500 mt-1">Include spirit level in photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Side view checks */}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-[#005cbb]">Side View Verification</h4>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.sideVertical}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, sideVertical: !!checked }))
                          }
                        />
                        <span className="text-sm">Pole is vertical (plumb)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.sideClearOfPowerLines}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, sideClearOfPowerLines: !!checked }))
                          }
                        />
                        <span className="text-sm">Clear of power lines</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.sideClearOfInfrastructure}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, sideClearOfInfrastructure: !!checked }))
                          }
                        />
                        <span className="text-sm">Clear of other infrastructure</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <Checkbox
                          checked={stepValidations.sideSpiritLevel}
                          onCheckedChange={(checked) => 
                            setStepValidations(prev => ({ ...prev, sideSpiritLevel: !!checked }))
                          }
                        />
                        <span className="text-sm">Spirit level visible in photo</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 8: Complete */}
            {currentStep === 'complete' && (
              <>
                <CardHeader>
                  <CardTitle>Review & Complete</CardTitle>
                  <CardDescription>
                    Review your pole installation capture
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Field Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional observations, issues, or special conditions..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  
                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm">Installation Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Project:</span>
                        <span>{projectId || 'Not selected'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pole Number:</span>
                        <span>{poleNumber || 'Not entered'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Photos Captured:</span>
                        <span>{Object.keys(photos).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">GPS Location:</span>
                        <span className="text-xs font-mono">
                          {initialGpsLocation 
                            ? `${initialGpsLocation.lat.toFixed(6)}, ${initialGpsLocation.lng.toFixed(6)}`
                            : 'Not captured'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
              
            {/* Step Navigation */}
            <CardFooter className="flex justify-between">
              {currentStep !== 'project' && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                >
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {currentStep !== 'complete' ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className="bg-[#005cbb] hover:bg-[#004a96]"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={completeCapture}
                  disabled={isSaving || !isStepComplete('complete')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Complete Capture
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>
      
      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="mx-4 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-200 bg-green-50 mx-4 mb-4">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Pole installation captured successfully. {!isOnline && 'Data will sync when online.'}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoChange}
        className="hidden"
      />
      
      {/* Sync Status Footer */}
      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Logged in as: {user?.displayName || user?.email || 'Field Technician'}
          </span>
          {queuedItems > 0 && isOnline && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#005cbb]"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}