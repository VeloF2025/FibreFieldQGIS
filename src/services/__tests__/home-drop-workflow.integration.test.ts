/**
 * Home Drop Capture Workflow Integration Tests
 * 
 * End-to-end integration tests for the complete 4-step workflow:
 * 1. Assignments - Assignment creation and management
 * 2. GPS - Location capture and validation
 * 3. Photos - Photo capture for all 4 required types
 * 4. Review - Quality validation and approval submission
 * 
 * Tests the complete flow including offline capabilities, data persistence,
 * sync queue management, and error recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { homeDropCaptureService } from '../home-drop-capture.service'
import { poleCaptureService } from '../pole-capture.service'
import { db } from '@/lib/database'
import { 
  createMockHomeDropCapture,
  createMockHomeDropPhoto,
  createMockHomeDropAssignment,
  clearTestDatabase,
  mockGeolocationSuccess,
  mockGeolocationError,
  mockCameraSuccess,
  mockOnlineStatus,
  TEST_CONSTANTS,
  waitFor,
  waitForCondition
} from '@/test-utils'
import type { 
  HomeDropCapture, 
  HomeDropPhotoType,
  HomeDropAssignment
} from '@/types/home-drop.types'

// Mock external services
vi.mock('../pole-capture.service')
vi.mock('@/lib/database')

describe('Home Drop Capture Workflow Integration', () => {
  let homeDropId: string
  let mockPole: any

  beforeEach(async () => {
    vi.clearAllMocks()
    await clearTestDatabase()
    
    // Setup mock pole
    mockPole = {
      id: TEST_CONSTANTS.MOCK_POLE_NUMBER,
      projectId: TEST_CONSTANTS.MOCK_PROJECT_ID,
      projectName: 'Test Project',
      gpsLocation: {
        latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
        longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
        accuracy: TEST_CONSTANTS.MOCK_GPS_COORDS.accuracy,
      }
    }
    
    vi.mocked(poleCaptureService.getPoleCapture).mockResolvedValue(mockPole)
    
    // Setup database mocks
    setupDatabaseMocks()
    
    // Start online
    mockOnlineStatus(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function setupDatabaseMocks() {
    // Mock database operations
    vi.mocked(db.homeDropCaptures.put).mockResolvedValue()
    vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
    vi.mocked(db.homeDropCaptures.get).mockImplementation(async (id) => {
      if (id === homeDropId) {
        return createMockHomeDropCapture({ id })
      }
      return undefined
    })
    
    vi.mocked(db.homeDropPhotos.add).mockResolvedValue()
    vi.mocked(db.homeDropAssignments.put).mockResolvedValue()
    vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()
    
    // Mock queries
    const mockWhere = {
      equals: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([]),
        and: vi.fn(() => ({
          toArray: vi.fn().mockResolvedValue([])
        })),
      }))
    }
    vi.mocked(db.homeDropCaptures.where).mockReturnValue(mockWhere)
    vi.mocked(db.homeDropPhotos.where).mockReturnValue(mockWhere)
  }

  // ==================== Complete 4-Step Workflow Test ====================

  describe('Complete 4-Step Workflow', () => {
    it('should complete entire workflow from assignment to approval', async () => {
      // ====== STEP 0: Initialize Home Drop ======
      const initialData = {
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: {
          name: 'John Doe',
          address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS,
          contactNumber: '+1-555-0123',
          email: 'john.doe@example.com'
        },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID,
        capturedByName: 'Test Technician'
      }

      homeDropId = await homeDropCaptureService.createHomeDropCapture(initialData)
      expect(homeDropId).toMatch(/^HD-\d+-[A-Z0-9]+$/)

      // Verify initial state
      expect(db.homeDropCaptures.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: homeDropId,
          status: 'assigned',
          workflow: expect.objectContaining({
            currentStep: 1,
            steps: {
              assignments: false,
              gps: false,
              photos: false,
              review: false
            }
          })
        })
      )

      // ====== STEP 1: Assignments ======
      const assignmentData = {
        assignedTo: TEST_CONSTANTS.MOCK_TECHNICIAN_ID,
        assignedBy: 'manager_001',
        priority: 'medium' as const,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        installationNotes: 'Standard fiber installation',
        accessNotes: 'Gate code: 1234'
      }

      const assignmentId = await homeDropCaptureService.createAssignment(homeDropId, assignmentData)
      expect(assignmentId).toMatch(/^ASSIGN-\d+-[a-z0-9]+$/)

      // Progress to assignments step
      await homeDropCaptureService.progressWorkflow(homeDropId, 'assignments')
      
      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          status: 'in_progress',
          workflow: expect.objectContaining({
            currentStep: 1,
            steps: expect.objectContaining({
              assignments: true
            })
          })
        })
      )

      // ====== STEP 2: GPS Location ======
      mockGeolocationSuccess(
        TEST_CONSTANTS.MOCK_GPS_COORDS.latitude + 0.001, // Slightly different from pole
        TEST_CONSTANTS.MOCK_GPS_COORDS.longitude + 0.001,
        8 // Good accuracy
      )

      const gpsLocation = {
        latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude + 0.001,
        longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude + 0.001,
        accuracy: 8,
        altitude: 15,
        capturedAt: new Date()
      }

      await homeDropCaptureService.updateGPSLocation(homeDropId, gpsLocation)

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          gpsLocation: expect.objectContaining({
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: gpsLocation.accuracy
          }),
          distanceFromPole: expect.any(Number),
          customer: expect.objectContaining({
            location: expect.objectContaining({
              latitude: gpsLocation.latitude,
              longitude: gpsLocation.longitude
            })
          })
        })
      )

      // ====== STEP 3: Photo Capture ======
      mockCameraSuccess('image/jpeg')

      // Capture all 4 required photos
      const photoTypes: HomeDropPhotoType[] = [
        'power-meter-test',
        'fibertime-setup-confirmation',
        'fibertime-device-actions',
        'router-4-lights-status'
      ]

      for (const photoType of photoTypes) {
        const photo = createMockHomeDropPhoto(photoType, {
          location: {
            latitude: gpsLocation.latitude,
            longitude: gpsLocation.longitude,
            accuracy: 5
          },
          resolution: { width: 1920, height: 1080 },
          size: 1024000 // 1MB
        })

        await homeDropCaptureService.addPhoto(homeDropId, photo)

        expect(db.homeDropPhotos.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(new RegExp(`${homeDropId}_${photoType}_\\d+`)),
            homeDropId,
            type: photoType,
            uploadStatus: 'pending'
          })
        )

        // Add photo to sync queue
        expect(db.homeDropSyncQueue.add).toHaveBeenCalledWith(
          expect.objectContaining({
            homeDropId,
            action: 'photo-upload'
          })
        )
      }

      // After all photos captured, should be marked as captured
      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          status: 'captured',
          completedPhotos: expect.arrayContaining(photoTypes)
        })
      )

      // ====== STEP 4: Installation Details ======
      const installationDetails = {
        equipment: {
          ontSerialNumber: 'ONT-ABC123456',
          routerSerialNumber: 'RTR-XYZ789012',
          fiberLength: 75,
          connectorType: 'SC/APC'
        },
        powerReadings: {
          opticalPower: -14.2, // Good power level
          signalStrength: 98,
          linkQuality: 97,
        },
        serviceConfig: {
          serviceType: 'Fiber 1000/1000',
          bandwidth: '1000/1000',
          vlanId: '100',
          ipAddress: '192.168.1.150',
          activationStatus: true
        }
      }

      await homeDropCaptureService.updateInstallationDetails(homeDropId, installationDetails)

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          installation: expect.objectContaining({
            equipment: expect.objectContaining({
              ontSerialNumber: 'ONT-ABC123456',
              routerSerialNumber: 'RTR-XYZ789012'
            }),
            powerReadings: expect.objectContaining({
              opticalPower: -14.2,
              testTimestamp: expect.any(Date)
            }),
            serviceConfig: expect.objectContaining({
              activationStatus: true
            })
          })
        })
      )

      // ====== STEP 5: Review and Submit ======
      // Mock a complete home drop for validation
      const completeHomeDropCapture = createMockHomeDropCapture({
        id: homeDropId,
        customer: initialData.customer,
        gpsLocation,
        completedPhotos: photoTypes,
        installation: {
          equipment: installationDetails.equipment,
          powerReadings: {
            ...installationDetails.powerReadings,
            testTimestamp: new Date()
          },
          serviceConfig: installationDetails.serviceConfig
        }
      })
      
      vi.mocked(db.homeDropCaptures.get).mockResolvedValue(completeHomeDropCapture)

      await homeDropCaptureService.submitForApproval(homeDropId)

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          status: 'pending_approval',
          capturedAt: expect.any(Date),
          approval: expect.objectContaining({
            status: 'pending'
          })
        })
      )

      // Progress to review step (final step)
      await homeDropCaptureService.progressWorkflow(homeDropId, 'review')

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          workflow: expect.objectContaining({
            currentStep: 4,
            steps: {
              assignments: true,
              gps: true,
              photos: true,
              review: true
            }
          })
        })
      )
    })
  })

  // ==================== Error Recovery Tests ====================

  describe('Error Recovery and Resilience', () => {
    it('should handle GPS errors gracefully', async () => {
      // Create home drop
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Mock GPS error
      mockGeolocationError(1, 'GPS permission denied')

      // Attempt to update GPS - should fail gracefully
      const gpsLocation = {
        latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
        longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
        accuracy: 50, // Poor accuracy
        capturedAt: new Date()
      }

      await expect(
        homeDropCaptureService.updateGPSLocation(homeDropId, gpsLocation)
      ).rejects.toThrow(/GPS accuracy.*exceeds threshold/)

      // Should not have progressed workflow
      expect(db.homeDropCaptures.update).not.toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          workflow: expect.objectContaining({
            steps: expect.objectContaining({
              gps: true
            })
          })
        })
      )
    })

    it('should handle offline mode gracefully', async () => {
      // Create home drop
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Go offline
      mockOnlineStatus(false)

      // Add photo while offline
      const photo = createMockHomeDropPhoto('power-meter-test')
      await homeDropCaptureService.addPhoto(homeDropId, photo)

      // Should still save locally
      expect(db.homeDropPhotos.add).toHaveBeenCalled()
      
      // Should add to sync queue for later
      expect(db.homeDropSyncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          homeDropId,
          action: 'photo-upload',
          status: 'pending'
        })
      )
    })

    it('should validate data completeness before submission', async () => {
      // Create incomplete home drop
      const incompleteHomeDropCapture = createMockHomeDropCapture({
        customer: {
          name: '', // Missing required field
          address: 'Some Address'
        },
        gpsLocation: undefined, // Missing GPS
        completedPhotos: ['power-meter-test'], // Missing required photos
        installation: {
          equipment: {},
          powerReadings: {}, // Missing power readings
          serviceConfig: {}
        }
      })

      homeDropId = incompleteHomeDropCapture.id
      vi.mocked(db.homeDropCaptures.get).mockResolvedValue(incompleteHomeDropCapture)

      // Should fail validation
      await expect(
        homeDropCaptureService.submitForApproval(homeDropId)
      ).rejects.toThrow(/Cannot submit for approval:/)

      // Should not have been submitted
      expect(db.homeDropCaptures.update).not.toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          status: 'pending_approval'
        })
      )
    })
  })

  // ==================== Workflow State Management ====================

  describe('Workflow State Management', () => {
    it('should allow resuming workflow from any step', async () => {
      // Create home drop in progress at step 2
      const partialHomeDropCapture = createMockHomeDropCapture({
        status: 'in_progress',
        workflow: {
          currentStep: 2,
          totalSteps: 4,
          lastSavedStep: 2,
          steps: {
            assignments: true,
            gps: false,
            photos: false,
            review: false
          }
        }
      })

      homeDropId = partialHomeDropCapture.id
      vi.mocked(db.homeDropCaptures.get).mockResolvedValue(partialHomeDropCapture)

      // Should be able to continue from GPS step
      const gpsLocation = {
        latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
        longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
        accuracy: 10,
        capturedAt: new Date()
      }

      await homeDropCaptureService.updateGPSLocation(homeDropId, gpsLocation)

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          gpsLocation: expect.objectContaining(gpsLocation)
        })
      )
    })

    it('should track step timestamps for performance analysis', async () => {
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Progress through assignments step
      await homeDropCaptureService.progressWorkflow(homeDropId, 'assignments')

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          workflow: expect.objectContaining({
            stepTimestamps: expect.objectContaining({
              assignmentsCompleted: expect.any(Date)
            })
          })
        })
      )
    })

    it('should validate step progression order', async () => {
      const homeDropCapture = createMockHomeDropCapture({
        workflow: {
          currentStep: 1,
          totalSteps: 4,
          lastSavedStep: 1,
          steps: {
            assignments: false,
            gps: false,
            photos: false,
            review: false
          }
        }
      })

      homeDropId = homeDropCapture.id
      vi.mocked(db.homeDropCaptures.get).mockResolvedValue(homeDropCapture)

      // Should be able to progress to next logical step
      await homeDropCaptureService.progressWorkflow(homeDropId, 'assignments')
      
      // Should update workflow state correctly
      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          workflow: expect.objectContaining({
            steps: expect.objectContaining({
              assignments: true
            })
          })
        })
      )
    })
  })

  // ==================== Data Persistence Tests ====================

  describe('Data Persistence and Sync', () => {
    it('should queue all changes for sync', async () => {
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Each operation should create sync queue items
      expect(db.homeDropSyncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          homeDropId,
          action: 'create'
        })
      )

      // Update should also create sync item
      await homeDropCaptureService.updateHomeDropCapture(homeDropId, { notes: 'Test note' })
      
      expect(db.homeDropSyncQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          homeDropId,
          action: 'update'
        })
      )
    })

    it('should handle auto-save for long-running operations', async () => {
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Save progress during workflow
      await homeDropCaptureService.saveProgress(homeDropId, 2, {
        notes: 'GPS step in progress'
      })

      expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
        homeDropId,
        expect.objectContaining({
          status: 'in_progress',
          workflow: expect.objectContaining({
            currentStep: 2,
            lastSavedStep: 2
          }),
          notes: 'GPS step in progress'
        })
      )
    })
  })

  // ==================== Performance Tests ====================

  describe('Performance and Optimization', () => {
    it('should handle multiple concurrent photo uploads', async () => {
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Simulate concurrent photo uploads
      const photoPromises = TEST_CONSTANTS.REQUIRED_PHOTO_TYPES.map(async (photoType, index) => {
        await waitFor(index * 100) // Stagger uploads slightly
        const photo = createMockHomeDropPhoto(photoType)
        return homeDropCaptureService.addPhoto(homeDropId, photo)
      })

      // All should complete successfully
      await Promise.all(photoPromises)

      // Should have added all photos
      expect(db.homeDropPhotos.add).toHaveBeenCalledTimes(4)
      
      // Should have created sync queue items for each
      expect(db.homeDropSyncQueue.add).toHaveBeenCalledTimes(5) // 1 create + 4 photos
    })

    it('should compress large photos automatically', async () => {
      homeDropId = await homeDropCaptureService.createHomeDropCapture({
        poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
        customer: { name: 'Test User', address: 'Test Address' },
        capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID
      })

      // Create large photo
      const largePhoto = createMockHomeDropPhoto('power-meter-test', {
        size: 15 * 1024 * 1024, // 15MB (over 10MB limit)
        compressed: false,
        resolution: { width: 4000, height: 3000 }
      })

      await homeDropCaptureService.addPhoto(homeDropId, largePhoto)

      // Should have compressed the photo
      expect(db.homeDropPhotos.add).toHaveBeenCalledWith(
        expect.objectContaining({
          compressed: true,
          size: expect.any(Number) // Should be smaller
        })
      )
    })
  })
})