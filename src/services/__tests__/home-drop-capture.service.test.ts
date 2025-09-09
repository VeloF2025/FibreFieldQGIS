/**
 * HomeDropCaptureService Unit Tests
 * 
 * Comprehensive test suite for the Home Drop Capture Service covering:
 * - CRUD operations
 * - 4-step workflow management
 * - Photo management and compression
 * - GPS validation and distance calculation
 * - Offline sync queue management
 * - Approval workflow
 * - Data validation
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { homeDropCaptureService } from '../home-drop-capture.service'
import { poleCaptureService } from '../pole-capture.service'
import { db } from '@/lib/database'
import { 
  createMockHomeDropCapture,
  createMockHomeDropPhoto,
  createMockHomeDropAssignment,
  createMockSyncQueueItem,
  clearTestDatabase,
  mockGeolocationSuccess,
  mockGeolocationError,
  TEST_CONSTANTS,
  expectError,
  waitFor
} from '@/test-utils'
import type { 
  HomeDropCapture, 
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropStatus,
  HomeDropAssignment 
} from '@/types/home-drop.types'

// Mock pole capture service
vi.mock('../pole-capture.service', () => ({
  poleCaptureService: {
    getPoleCapture: vi.fn(),
  }
}))

// Mock database
vi.mock('@/lib/database', () => ({
  db: {
    homeDropCaptures: {
      put: vi.fn(),
      get: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      update: vi.fn(),
      delete: vi.fn(),
      toCollection: vi.fn(() => ({
        and: vi.fn(() => ({
          toArray: vi.fn(),
        })),
        toArray: vi.fn(),
      })),
      count: vi.fn(),
    },
    homeDropPhotos: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
          and: vi.fn(() => ({
            toArray: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(),
      count: vi.fn(),
    },
    homeDropAssignments: {
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(),
        })),
      })),
      count: vi.fn(),
    },
    homeDropSyncQueue: {
      add: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          count: vi.fn(),
        })),
        anyOf: vi.fn(() => ({
          toArray: vi.fn(),
          count: vi.fn(),
        })),
      })),
      update: vi.fn(),
      count: vi.fn(),
    },
    transaction: vi.fn(),
  }
}))

describe('HomeDropCaptureService', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await clearTestDatabase()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ==================== CRUD Operations Tests ====================

  describe('CRUD Operations', () => {
    describe('createHomeDropCapture', () => {
      it('should create home drop with valid pole number', async () => {
        // Arrange
        const mockPole = {
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
        vi.mocked(db.homeDropCaptures.put).mockResolvedValue()

        const homeDropData = {
          poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS,
          },
          capturedBy: TEST_CONSTANTS.MOCK_TECHNICIAN_ID,
        }

        // Act
        const homeDropId = await homeDropCaptureService.createHomeDropCapture(homeDropData)

        // Assert
        expect(homeDropId).toMatch(/^HD-\d+-[A-Z0-9]+$/)
        expect(poleCaptureService.getPoleCapture).toHaveBeenCalledWith(TEST_CONSTANTS.MOCK_POLE_NUMBER)
        expect(db.homeDropCaptures.put).toHaveBeenCalledWith(
          expect.objectContaining({
            id: homeDropId,
            poleNumber: TEST_CONSTANTS.MOCK_POLE_NUMBER,
            projectId: TEST_CONSTANTS.MOCK_PROJECT_ID,
            status: 'assigned',
            syncStatus: 'pending',
            requiredPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
            workflow: expect.objectContaining({
              currentStep: 1,
              totalSteps: 4,
              steps: {
                assignments: false,
                gps: false,
                photos: false,
                review: false,
              }
            })
          })
        )
        expect(db.homeDropSyncQueue.add).toHaveBeenCalled()
      })

      it('should throw error when pole number is missing', async () => {
        // Arrange
        const homeDropData = {
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS,
          }
        }

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.createHomeDropCapture(homeDropData),
          'Pole number is required for home drop capture'
        )
      })

      it('should throw error when pole does not exist', async () => {
        // Arrange
        vi.mocked(poleCaptureService.getPoleCapture).mockResolvedValue(undefined)
        
        const homeDropData = {
          poleNumber: 'NONEXISTENT-POLE',
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS,
          }
        }

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.createHomeDropCapture(homeDropData),
          'Pole NONEXISTENT-POLE not found. Please capture the pole first.'
        )
      })
    })

    describe('getHomeDropCapture', () => {
      it('should retrieve home drop by ID', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act
        const result = await homeDropCaptureService.getHomeDropCapture(mockHomeDropCapture.id)

        // Assert
        expect(result).toEqual(mockHomeDropCapture)
        expect(db.homeDropCaptures.get).toHaveBeenCalledWith(mockHomeDropCapture.id)
      })

      it('should return undefined for non-existent home drop', async () => {
        // Arrange
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(undefined)

        // Act
        const result = await homeDropCaptureService.getHomeDropCapture('non-existent-id')

        // Assert
        expect(result).toBeUndefined()
      })
    })

    describe('getAllHomeDropCaptures', () => {
      it('should retrieve all home drop captures', async () => {
        // Arrange
        const mockHomeDropCaptures = [
          createMockHomeDropCapture({ id: 'HD-1' }),
          createMockHomeDropCapture({ id: 'HD-2' }),
        ]
        vi.mocked(db.homeDropCaptures.toArray).mockResolvedValue(mockHomeDropCaptures)

        // Act
        const result = await homeDropCaptureService.getAllHomeDropCaptures()

        // Assert
        expect(result).toEqual(mockHomeDropCaptures)
        expect(db.homeDropCaptures.toArray).toHaveBeenCalled()
      })
    })

    describe('getHomeDropsByPole', () => {
      it('should retrieve home drops by pole number', async () => {
        // Arrange
        const poleNumber = TEST_CONSTANTS.MOCK_POLE_NUMBER
        const mockHomeDropCaptures = [
          createMockHomeDropCapture({ poleNumber }),
        ]
        
        const mockWhere = {
          equals: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue(mockHomeDropCaptures)
          }))
        }
        vi.mocked(db.homeDropCaptures.where).mockReturnValue(mockWhere)

        // Act
        const result = await homeDropCaptureService.getHomeDropsByPole(poleNumber)

        // Assert
        expect(result).toEqual(mockHomeDropCaptures)
        expect(db.homeDropCaptures.where).toHaveBeenCalledWith('poleNumber')
        expect(mockWhere.equals).toHaveBeenCalledWith(poleNumber)
      })
    })

    describe('updateHomeDropCapture', () => {
      it('should update existing home drop capture', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const updates = { status: 'in_progress' as HomeDropStatus }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.updateHomeDropCapture(mockHomeDropCapture.id, updates)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            ...updates,
            updatedAt: expect.any(Date)
          })
        )
        expect(db.homeDropSyncQueue.add).toHaveBeenCalled() // Sync queue item created
      })

      it('should throw error for non-existent home drop', async () => {
        // Arrange
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(undefined)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.updateHomeDropCapture('non-existent', {}),
          'Home drop non-existent not found'
        )
      })
    })

    describe('deleteHomeDropCapture', () => {
      it('should delete home drop and associated data', async () => {
        // Arrange
        const homeDropId = 'HD-123'
        const mockPhotos = [
          { id: 'photo-1', homeDropId },
          { id: 'photo-2', homeDropId },
        ]
        
        const photoQuery = {
          equals: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue(mockPhotos)
          }))
        }
        const syncQueueQuery = {
          equals: vi.fn(() => ({
            delete: vi.fn()
          }))
        }
        
        vi.mocked(db.homeDropPhotos.where).mockReturnValue(photoQuery)
        vi.mocked(db.homeDropSyncQueue.where).mockReturnValue(syncQueueQuery)
        vi.mocked(db.homeDropPhotos.delete).mockResolvedValue()
        vi.mocked(db.homeDropCaptures.delete).mockResolvedValue()

        // Act
        await homeDropCaptureService.deleteHomeDropCapture(homeDropId)

        // Assert
        expect(db.homeDropPhotos.where).toHaveBeenCalledWith('homeDropId')
        expect(photoQuery.equals).toHaveBeenCalledWith(homeDropId)
        expect(db.homeDropPhotos.delete).toHaveBeenCalledTimes(2) // Delete each photo
        expect(db.homeDropSyncQueue.where).toHaveBeenCalledWith('homeDropId')
        expect(syncQueueQuery.equals).toHaveBeenCalledWith(homeDropId)
        expect(db.homeDropCaptures.delete).toHaveBeenCalledWith(homeDropId)
      })
    })
  })

  // ==================== Workflow Management Tests ====================

  describe('Workflow Management', () => {
    describe('progressWorkflow', () => {
      it('should progress through assignments step', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.progressWorkflow(mockHomeDropCapture.id, 'assignments')

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            workflow: expect.objectContaining({
              currentStep: 1,
              steps: expect.objectContaining({
                assignments: true
              })
            }),
            status: 'in_progress',
            lastSavedStep: 1
          })
        )
      })

      it('should complete workflow when review step is finished', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture({
          workflow: {
            currentStep: 4,
            totalSteps: 4,
            lastSavedStep: 3,
            steps: {
              assignments: true,
              gps: true,
              photos: true,
              review: false
            }
          }
        })
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.progressWorkflow(mockHomeDropCapture.id, 'review')

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            workflow: expect.objectContaining({
              currentStep: 4,
              steps: expect.objectContaining({
                review: true
              })
            }),
            status: 'captured', // Should be marked as captured
            lastSavedStep: 4
          })
        )
      })

      it('should throw error for non-existent home drop', async () => {
        // Arrange
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(undefined)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.progressWorkflow('non-existent', 'assignments'),
          'Home drop non-existent not found'
        )
      })
    })

    describe('saveProgress', () => {
      it('should save progress for current step', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        const stepData = { notes: 'Progress saved' }

        // Act
        await homeDropCaptureService.saveProgress(mockHomeDropCapture.id, 2, stepData)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            ...stepData,
            status: 'in_progress',
            workflow: expect.objectContaining({
              currentStep: 2,
              lastSavedStep: 2
            })
          })
        )
      })
    })
  })

  // ==================== Assignment Management Tests ====================

  describe('Assignment Management', () => {
    describe('createAssignment', () => {
      it('should create assignment for home drop', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const assignmentData = {
          assignedTo: TEST_CONSTANTS.MOCK_TECHNICIAN_ID,
          assignedBy: 'manager_001',
          priority: 'high' as const,
          installationNotes: 'Rush installation',
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropAssignments.put).mockResolvedValue()
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        const assignmentId = await homeDropCaptureService.createAssignment(
          mockHomeDropCapture.id, 
          assignmentData
        )

        // Assert
        expect(assignmentId).toMatch(/^ASSIGN-\d+-[a-z0-9]+$/)
        expect(db.homeDropAssignments.put).toHaveBeenCalledWith(
          expect.objectContaining({
            id: assignmentId,
            homeDropId: mockHomeDropCapture.id,
            poleNumber: mockHomeDropCapture.poleNumber,
            assignedTo: assignmentData.assignedTo,
            assignedBy: assignmentData.assignedBy,
            priority: assignmentData.priority,
            status: 'pending'
          })
        )
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            assignmentId,
            assignment: expect.any(Object)
          })
        )
      })

      it('should throw error for non-existent home drop', async () => {
        // Arrange
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(undefined)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.createAssignment('non-existent', {}),
          'Home drop non-existent not found'
        )
      })
    })

    describe('getAssignmentsForTechnician', () => {
      it('should retrieve assignments for technician', async () => {
        // Arrange
        const technicianId = TEST_CONSTANTS.MOCK_TECHNICIAN_ID
        const mockAssignments = [
          createMockHomeDropAssignment({ assignedTo: technicianId }),
        ]
        
        const mockWhere = {
          equals: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue(mockAssignments)
          }))
        }
        vi.mocked(db.homeDropAssignments.where).mockReturnValue(mockWhere)

        // Act
        const result = await homeDropCaptureService.getAssignmentsForTechnician(technicianId)

        // Assert
        expect(result).toEqual(mockAssignments)
        expect(db.homeDropAssignments.where).toHaveBeenCalledWith('assignedTo')
        expect(mockWhere.equals).toHaveBeenCalledWith(technicianId)
      })
    })
  })

  // ==================== Photo Management Tests ====================

  describe('Photo Management', () => {
    describe('addPhoto', () => {
      it('should add photo to home drop', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const mockPhoto = createMockHomeDropPhoto('power-meter-test')
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropPhotos.add).mockResolvedValue()
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.addPhoto(mockHomeDropCapture.id, mockPhoto)

        // Assert
        expect(db.homeDropPhotos.add).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.stringMatching(new RegExp(`${mockHomeDropCapture.id}_${mockPhoto.type}_\\d+`)),
            homeDropId: mockHomeDropCapture.id,
            type: mockPhoto.type,
            uploadStatus: 'pending',
            capturedAt: expect.any(Date)
          })
        )
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            photos: expect.arrayContaining([
              expect.objectContaining({ type: mockPhoto.type })
            ]),
            completedPhotos: expect.arrayContaining([mockPhoto.type])
          })
        )
      })

      it('should mark as captured when all required photos are added', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture({
          photos: [
            createMockHomeDropPhoto('power-meter-test'),
            createMockHomeDropPhoto('fibertime-setup-confirmation'),
            createMockHomeDropPhoto('fibertime-device-actions'),
          ],
          completedPhotos: ['power-meter-test', 'fibertime-setup-confirmation', 'fibertime-device-actions']
        })
        
        const finalPhoto = createMockHomeDropPhoto('router-4-lights-status')
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropPhotos.add).mockResolvedValue()
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.addPhoto(mockHomeDropCapture.id, finalPhoto)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            status: 'captured' // Should be marked as captured when all photos done
          })
        )
      })

      it('should throw error for invalid photo type', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const invalidPhoto = createMockHomeDropPhoto('invalid-type' as HomeDropPhotoType)
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.addPhoto(mockHomeDropCapture.id, invalidPhoto),
          'Invalid photo type: invalid-type'
        )
      })

      it('should throw error for non-existent home drop', async () => {
        // Arrange
        const mockPhoto = createMockHomeDropPhoto('power-meter-test')
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(undefined)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.addPhoto('non-existent', mockPhoto),
          'Home drop non-existent not found'
        )
      })
    })

    describe('removePhoto', () => {
      it('should remove photo from home drop', async () => {
        // Arrange
        const photoType: HomeDropPhotoType = 'power-meter-test'
        const mockHomeDropCapture = createMockHomeDropCapture({
          photos: [
            createMockHomeDropPhoto('power-meter-test'),
            createMockHomeDropPhoto('fibertime-setup-confirmation'),
          ],
          completedPhotos: ['power-meter-test', 'fibertime-setup-confirmation']
        })
        
        const mockPhotosToDelete = [
          { id: 'photo-1', homeDropId: mockHomeDropCapture.id, type: photoType }
        ]
        
        const photoQuery = {
          equals: vi.fn(() => ({
            and: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue(mockPhotosToDelete)
            }))
          }))
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropPhotos.where).mockReturnValue(photoQuery)
        vi.mocked(db.homeDropPhotos.delete).mockResolvedValue()
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.removePhoto(mockHomeDropCapture.id, photoType)

        // Assert
        expect(db.homeDropPhotos.delete).toHaveBeenCalledWith('photo-1')
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            photos: expect.not.arrayContaining([
              expect.objectContaining({ type: photoType })
            ]),
            completedPhotos: expect.not.arrayContaining([photoType])
          })
        )
      })
    })
  })

  // ==================== GPS Management Tests ====================

  describe('GPS Management', () => {
    describe('updateGPSLocation', () => {
      it('should update GPS location with valid accuracy', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const mockPole = {
          id: mockHomeDropCapture.poleNumber,
          gpsLocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 5,
          }
        }
        
        const gpsLocation = {
          latitude: 40.7130, // Slightly different from pole
          longitude: -74.0062,
          accuracy: 10, // Within threshold (20m)
          capturedAt: new Date()
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(poleCaptureService.getPoleCapture).mockResolvedValue(mockPole)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.updateGPSLocation(mockHomeDropCapture.id, gpsLocation)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            gpsLocation: expect.objectContaining({
              latitude: gpsLocation.latitude,
              longitude: gpsLocation.longitude,
              accuracy: gpsLocation.accuracy,
              capturedAt: expect.any(Date)
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
      })

      it('should throw error for poor GPS accuracy', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const gpsLocation = {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 50, // Exceeds threshold (20m)
          capturedAt: new Date()
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.updateGPSLocation(mockHomeDropCapture.id, gpsLocation),
          /GPS accuracy.*exceeds threshold/
        )
      })

      it('should throw error when too far from pole', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const mockPole = {
          id: mockHomeDropCapture.poleNumber,
          gpsLocation: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 5,
          }
        }
        
        const gpsLocation = {
          latitude: 41.0000, // Very far from pole (> 500m limit)
          longitude: -74.0000,
          accuracy: 10,
          capturedAt: new Date()
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(poleCaptureService.getPoleCapture).mockResolvedValue(mockPole)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.updateGPSLocation(mockHomeDropCapture.id, gpsLocation),
          /Distance from pole.*exceeds maximum/
        )
      })

      it('should throw error for missing GPS location', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.updateGPSLocation(mockHomeDropCapture.id, null as any),
          'GPS location is required'
        )
      })
    })
  })

  // ==================== Installation Details Tests ====================

  describe('Installation Details', () => {
    describe('updateInstallationDetails', () => {
      it('should update installation details with valid optical power', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const installation = {
          powerReadings: {
            opticalPower: -15.5, // Within acceptable range (-30 to -8 dBm)
            signalStrength: 95
          },
          equipment: {
            ontSerialNumber: 'ONT-12345'
          }
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.updateInstallationDetails(mockHomeDropCapture.id, installation)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            installation: expect.objectContaining({
              powerReadings: expect.objectContaining({
                opticalPower: -15.5,
                signalStrength: 95,
                testTimestamp: expect.any(Date)
              }),
              equipment: expect.objectContaining({
                ontSerialNumber: 'ONT-12345'
              })
            })
          })
        )
      })

      it('should throw error for optical power outside range', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture()
        const installation = {
          powerReadings: {
            opticalPower: -5, // Outside acceptable range (too high)
          }
        }
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.updateInstallationDetails(mockHomeDropCapture.id, installation),
          /Optical power.*outside acceptable range/
        )
      })
    })
  })

  // ==================== Approval Workflow Tests ====================

  describe('Approval Workflow', () => {
    describe('submitForApproval', () => {
      it('should submit valid home drop for approval', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture({
          status: 'captured',
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS
          },
          gpsLocation: {
            latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
            longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
            accuracy: TEST_CONSTANTS.MOCK_GPS_COORDS.accuracy,
            capturedAt: new Date()
          },
          completedPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
          installation: {
            equipment: {},
            powerReadings: {
              opticalPower: -15.5 // Valid power reading
            },
            serviceConfig: {}
          }
        })
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.submitForApproval(mockHomeDropCapture.id)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          mockHomeDropCapture.id,
          expect.objectContaining({
            status: 'pending_approval',
            capturedAt: expect.any(Date),
            approval: expect.objectContaining({
              status: 'pending'
            })
          })
        )
      })

      it('should throw error for invalid home drop data', async () => {
        // Arrange
        const mockHomeDropCapture = createMockHomeDropCapture({
          customer: {
            name: '', // Missing required name
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS
          },
          completedPhotos: [] // Missing required photos
        })
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(mockHomeDropCapture)

        // Act & Assert
        await expectError(
          () => homeDropCaptureService.submitForApproval(mockHomeDropCapture.id),
          /Cannot submit for approval:/
        )
      })
    })

    describe('approveHomeDropCapture', () => {
      it('should approve home drop capture', async () => {
        // Arrange
        const homeDropId = 'HD-123'
        const approvedBy = 'admin_001'
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(createMockHomeDropCapture())
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.approveHomeDropCapture(homeDropId, approvedBy)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          homeDropId,
          expect.objectContaining({
            status: 'approved',
            approval: expect.objectContaining({
              status: 'approved',
              approvedBy,
              approvedAt: expect.any(Date)
            })
          })
        )
      })
    })

    describe('rejectHomeDropCapture', () => {
      it('should reject home drop capture with reason', async () => {
        // Arrange
        const homeDropId = 'HD-123'
        const rejectedBy = 'admin_001'
        const reason = 'Poor photo quality'
        const notes = 'Retake power meter photo'
        
        vi.mocked(db.homeDropCaptures.get).mockResolvedValue(createMockHomeDropCapture())
        vi.mocked(db.homeDropCaptures.update).mockResolvedValue()
        vi.mocked(db.homeDropSyncQueue.add).mockResolvedValue()

        // Act
        await homeDropCaptureService.rejectHomeDropCapture(homeDropId, rejectedBy, reason, notes)

        // Assert
        expect(db.homeDropCaptures.update).toHaveBeenCalledWith(
          homeDropId,
          expect.objectContaining({
            status: 'rejected',
            approval: expect.objectContaining({
              status: 'rejected',
              approvedBy: rejectedBy,
              rejectionReason: reason,
              rejectionNotes: notes,
              requiresRework: true
            })
          })
        )
      })
    })
  })

  // ==================== Validation Tests ====================

  describe('Data Validation', () => {
    describe('validateHomeDropCapture', () => {
      it('should validate complete home drop capture', async () => {
        // Arrange
        const completeHomeDropCapture = createMockHomeDropCapture({
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS
          },
          gpsLocation: {
            latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
            longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
            accuracy: TEST_CONSTANTS.MOCK_GPS_COORDS.accuracy,
            capturedAt: new Date()
          },
          completedPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
          installation: {
            equipment: {},
            powerReadings: {
              opticalPower: -15.5
            },
            serviceConfig: {}
          }
        })

        // Act
        const result = await homeDropCaptureService.validateHomeDropCapture(completeHomeDropCapture)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should identify validation errors for incomplete data', async () => {
        // Arrange
        const incompleteHomeDropCapture = createMockHomeDropCapture({
          poleNumber: '', // Missing pole number
          customer: {
            name: '', // Missing customer name
            address: '' // Missing customer address
          },
          gpsLocation: undefined, // Missing GPS location
          completedPhotos: ['power-meter-test'], // Missing photos
          installation: {
            equipment: {},
            powerReadings: {},
            serviceConfig: {}
          }
        })

        // Act
        const result = await homeDropCaptureService.validateHomeDropCapture(incompleteHomeDropCapture)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.errors).toEqual(
          expect.arrayContaining([
            'Pole number is required',
            'Customer name is required',
            'Customer address is required',
            'GPS location is required',
            expect.stringContaining('Missing required photos')
          ])
        )
      })

      it('should identify warnings for suboptimal data', async () => {
        // Arrange
        const homeDropCapture = createMockHomeDropCapture({
          customer: {
            name: 'John Doe',
            address: TEST_CONSTANTS.MOCK_CUSTOMER_ADDRESS
          },
          gpsLocation: {
            latitude: TEST_CONSTANTS.MOCK_GPS_COORDS.latitude,
            longitude: TEST_CONSTANTS.MOCK_GPS_COORDS.longitude,
            accuracy: TEST_CONSTANTS.MOCK_GPS_COORDS.accuracy,
            capturedAt: new Date()
          },
          completedPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
          distanceFromPole: 600, // Exceeds recommended maximum (500m)
          installation: {
            equipment: {},
            powerReadings: {}, // Missing optical power
            serviceConfig: {
              activationStatus: false // Service not activated
            }
          }
        })

        // Act
        const result = await homeDropCaptureService.validateHomeDropCapture(homeDropCapture)

        // Assert
        expect(result.isValid).toBe(true) // Valid but has warnings
        expect(result.warnings).toEqual(
          expect.arrayContaining([
            'Optical power reading not recorded',
            expect.stringContaining('Distance from pole'),
            'Service not marked as activated'
          ])
        )
      })
    })
  })
})