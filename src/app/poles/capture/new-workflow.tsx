// New workflow content to replace in the main file

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