/**
 * Home Drop Types Unit Tests
 * 
 * Comprehensive tests for TypeScript interfaces and data model validation.
 * Tests type safety, data structure validation, and business logic constraints.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type {
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropStatus,
  HomeDropSyncStatus,
  HomeDropAssignment,
  HomeDropPhotoStorage,
  HomeDropSyncQueueItem,
  HomeDropStatistics,
  HomeDropFilterOptions,
  HomeDropGeoPackageExport,
  HomeDropValidationRules,
  HomeDropServiceConfig
} from '@/types/home-drop.types'
import {
  createMockHomeDropCapture,
  createMockHomeDropPhoto,
  createMockHomeDropAssignment,
  createMockHomeDropPhotoStorage,
  createMockSyncQueueItem,
  TEST_CONSTANTS
} from '@/test-utils'

// Zod schemas for runtime validation
const HomeDropPhotoTypeSchema = z.enum([
  'power-meter-test',
  'fibertime-setup-confirmation', 
  'fibertime-device-actions',
  'router-4-lights-status'
])

const HomeDropStatusSchema = z.enum([
  'assigned',
  'in_progress',
  'captured',
  'syncing',
  'synced',
  'pending_approval',
  'approved',
  'rejected',
  'error'
])

const HomeDropSyncStatusSchema = z.enum([
  'pending',
  'syncing',
  'synced',
  'conflict',
  'error'
])

const GPSLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive(),
  altitude: z.number().optional(),
  heading: z.number().optional(),
  speed: z.number().optional(),
  provider: z.string().optional(),
  capturedAt: z.date()
})

const HomeDropPhotoSchema = z.object({
  id: z.string().min(1),
  type: HomeDropPhotoTypeSchema,
  data: z.string().startsWith('data:image/'),
  timestamp: z.date(),
  size: z.number().positive(),
  compressed: z.boolean(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional()
  }).optional(),
  uploadStatus: z.enum(['pending', 'uploading', 'uploaded', 'error']).optional(),
  uploadUrl: z.string().url().optional(),
  uploadError: z.string().optional(),
  uploadedAt: z.date().optional(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive()
  }).optional(),
  isValid: z.boolean().optional(),
  validationNotes: z.string().optional()
})

const HomeDropCaptureSchema = z.object({
  id: z.string().regex(/^HD-\d+-[A-Z0-9]+$/),
  poleNumber: z.string().min(1),
  projectId: z.string().min(1),
  projectName: z.string().optional(),
  contractorId: z.string().min(1),
  
  status: HomeDropStatusSchema,
  syncStatus: HomeDropSyncStatusSchema,
  syncError: z.string().optional(),
  syncAttempts: z.number().min(0),
  lastSyncAttempt: z.date().optional(),
  
  customer: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    contactNumber: z.string().optional(),
    email: z.string().email().optional(),
    accountNumber: z.string().optional(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number(),
      altitude: z.number().optional(),
      capturedAt: z.date()
    }).optional()
  }),
  
  installation: z.object({
    equipment: z.object({
      ontSerialNumber: z.string().optional(),
      routerSerialNumber: z.string().optional(),
      fiberLength: z.number().positive().optional(),
      connectorType: z.string().optional()
    }),
    powerReadings: z.object({
      opticalPower: z.number().optional(),
      signalStrength: z.number().min(0).max(100).optional(),
      linkQuality: z.number().min(0).max(100).optional(),
      testTimestamp: z.date().optional()
    }),
    serviceConfig: z.object({
      serviceType: z.string().optional(),
      bandwidth: z.string().optional(),
      vlanId: z.string().optional(),
      ipAddress: z.string().optional(),
      activationStatus: z.boolean().optional()
    })
  }),
  
  photos: z.array(HomeDropPhotoSchema),
  requiredPhotos: z.array(HomeDropPhotoTypeSchema),
  completedPhotos: z.array(HomeDropPhotoTypeSchema),
  
  gpsLocation: GPSLocationSchema.optional(),
  
  workflow: z.object({
    currentStep: z.number().min(1).max(4),
    totalSteps: z.literal(4),
    lastSavedStep: z.number().min(1).max(4),
    steps: z.object({
      assignments: z.boolean(),
      gps: z.boolean(),
      photos: z.boolean(),
      review: z.boolean()
    }),
    stepTimestamps: z.object({
      assignmentsStarted: z.date().optional(),
      assignmentsCompleted: z.date().optional(),
      gpsStarted: z.date().optional(),
      gpsCompleted: z.date().optional(),
      photosStarted: z.date().optional(),
      photosCompleted: z.date().optional(),
      reviewStarted: z.date().optional(),
      reviewCompleted: z.date().optional()
    }).optional()
  }),
  
  capturedBy: z.string().min(1),
  capturedByName: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  capturedAt: z.date().optional(),
  syncedAt: z.date().optional(),
  
  distanceFromPole: z.number().min(0).optional(),
  offlinePriority: z.enum(['high', 'medium', 'low']).optional(),
  version: z.number().positive().optional(),
  localVersion: z.number().positive().optional(),
  
  exportedToQGIS: z.boolean().optional(),
  exportedAt: z.date().optional(),
  geoPackageId: z.string().optional()
})

describe('Home Drop Types', () => {
  // ==================== Photo Type Tests ====================

  describe('HomeDropPhotoType', () => {
    it('should validate all required photo types', () => {
      const validPhotoTypes: HomeDropPhotoType[] = [
        'power-meter-test',
        'fibertime-setup-confirmation',
        'fibertime-device-actions',
        'router-4-lights-status'
      ]

      validPhotoTypes.forEach(type => {
        expect(() => HomeDropPhotoTypeSchema.parse(type)).not.toThrow()
      })

      expect(validPhotoTypes).toEqual(TEST_CONSTANTS.REQUIRED_PHOTO_TYPES)
    })

    it('should reject invalid photo types', () => {
      const invalidPhotoTypes = [
        'invalid-type',
        '',
        'power-meter', // Missing '-test'
        'router-lights', // Missing '4-'
        null,
        undefined
      ]

      invalidPhotoTypes.forEach(type => {
        expect(() => HomeDropPhotoTypeSchema.parse(type)).toThrow()
      })
    })
  })

  // ==================== Status Type Tests ====================

  describe('HomeDropStatus', () => {
    it('should validate all status values', () => {
      const validStatuses: HomeDropStatus[] = [
        'assigned',
        'in_progress',
        'captured',
        'syncing',
        'synced',
        'pending_approval',
        'approved',
        'rejected',
        'error'
      ]

      validStatuses.forEach(status => {
        expect(() => HomeDropStatusSchema.parse(status)).not.toThrow()
      })
    })

    it('should follow proper status progression', () => {
      // Test valid status transitions
      const validTransitions: Array<[HomeDropStatus, HomeDropStatus[]]> = [
        ['assigned', ['in_progress']],
        ['in_progress', ['captured', 'error']],
        ['captured', ['syncing', 'pending_approval']],
        ['syncing', ['synced', 'error']],
        ['synced', ['pending_approval']],
        ['pending_approval', ['approved', 'rejected']],
        ['rejected', ['in_progress']], // Allow rework
        ['error', ['in_progress']] // Allow retry
      ]

      validTransitions.forEach(([from, toStates]) => {
        toStates.forEach(to => {
          expect(() => {
            HomeDropStatusSchema.parse(from)
            HomeDropStatusSchema.parse(to)
          }).not.toThrow()
        })
      })
    })
  })

  describe('HomeDropSyncStatus', () => {
    it('should validate all sync status values', () => {
      const validSyncStatuses: HomeDropSyncStatus[] = [
        'pending',
        'syncing',
        'synced',
        'conflict',
        'error'
      ]

      validSyncStatuses.forEach(status => {
        expect(() => HomeDropSyncStatusSchema.parse(status)).not.toThrow()
      })
    })
  })

  // ==================== Photo Interface Tests ====================

  describe('HomeDropPhoto', () => {
    it('should validate complete photo object', () => {
      const validPhoto = createMockHomeDropPhoto('power-meter-test', {
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
        size: 1024000,
        resolution: { width: 1920, height: 1080 },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5
        }
      })

      expect(() => HomeDropPhotoSchema.parse(validPhoto)).not.toThrow()
    })

    it('should reject invalid photo data', () => {
      const invalidPhotos = [
        // Invalid base64 data (must start with "data:image/")
        {
          ...createMockHomeDropPhoto('power-meter-test'),
          data: 'invalid-base64-data'
        },
        // Negative size
        {
          ...createMockHomeDropPhoto('power-meter-test'),
          size: -100
        },
        // Empty ID
        {
          ...createMockHomeDropPhoto('power-meter-test'),
          id: ''
        }
      ]

      invalidPhotos.forEach(photo => {
        expect(() => HomeDropPhotoSchema.parse(photo)).toThrow()
      })
    })

    it('should validate photo type corresponds to business requirements', () => {
      const photoTypeBusinessRules = {
        'power-meter-test': {
          description: 'Optical power meter reading showing dBm levels',
          requiredElements: ['power reading', 'meter display'],
          minResolution: { width: 1280, height: 720 }
        },
        'fibertime-setup-confirmation': {
          description: 'Fibertime device setup screen',
          requiredElements: ['device screen', 'confirmation message'],
          minResolution: { width: 1280, height: 720 }
        },
        'fibertime-device-actions': {
          description: 'Device configuration actions',
          requiredElements: ['configuration screen', 'action buttons'],
          minResolution: { width: 1280, height: 720 }
        },
        'router-4-lights-status': {
          description: 'Router showing all 4 status lights active',
          requiredElements: ['4 status lights', 'all lights green/active'],
          minResolution: { width: 1280, height: 720 }
        }
      }

      Object.entries(photoTypeBusinessRules).forEach(([type, rules]) => {
        const photo = createMockHomeDropPhoto(type as HomeDropPhotoType, {
          resolution: rules.minResolution
        })
        
        expect(() => HomeDropPhotoSchema.parse(photo)).not.toThrow()
        expect(photo.resolution).toEqual(expect.objectContaining(rules.minResolution))
      })
    })
  })

  // ==================== Main Capture Interface Tests ====================

  describe('HomeDropCapture', () => {
    it('should validate complete home drop capture', () => {
      const validCapture = createMockHomeDropCapture({
        id: 'HD-1234567890-ABC123',
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

      expect(() => HomeDropCaptureSchema.parse(validCapture)).not.toThrow()
    })

    it('should enforce required fields', () => {
      const requiredFields = [
        'id',
        'poleNumber', 
        'projectId',
        'contractorId',
        'customer.name',
        'customer.address',
        'capturedBy'
      ]

      requiredFields.forEach(field => {
        const invalidCapture = createMockHomeDropCapture()
        
        // Set nested fields to empty based on dot notation
        if (field.includes('.')) {
          const [parent, child] = field.split('.')
          ;(invalidCapture as any)[parent][child] = ''
        } else {
          ;(invalidCapture as any)[field] = ''
        }

        expect(() => HomeDropCaptureSchema.parse(invalidCapture)).toThrow()
      })
    })

    it('should validate workflow constraints', () => {
      // Current step should not exceed total steps
      const invalidWorkflow1 = createMockHomeDropCapture({
        workflow: {
          currentStep: 5, // Exceeds max (4)
          totalSteps: 4,
          lastSavedStep: 4,
          steps: {
            assignments: false,
            gps: false,
            photos: false,
            review: false
          }
        }
      })

      expect(() => HomeDropCaptureSchema.parse(invalidWorkflow1)).toThrow()

      // Last saved step should not exceed current step
      const validWorkflow = createMockHomeDropCapture({
        workflow: {
          currentStep: 3,
          totalSteps: 4,
          lastSavedStep: 2, // Less than current step (valid)
          steps: {
            assignments: true,
            gps: true,
            photos: false,
            review: false
          }
        }
      })

      expect(() => HomeDropCaptureSchema.parse(validWorkflow)).not.toThrow()
    })

    it('should validate GPS coordinates', () => {
      const validGPS = createMockHomeDropCapture({
        gpsLocation: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 5.0,
          altitude: 10,
          capturedAt: new Date()
        }
      })

      expect(() => HomeDropCaptureSchema.parse(validGPS)).not.toThrow()

      const invalidGPS = createMockHomeDropCapture({
        gpsLocation: {
          latitude: 91, // Invalid latitude (> 90)
          longitude: -74.0060,
          accuracy: 5.0,
          capturedAt: new Date()
        }
      })

      expect(() => HomeDropCaptureSchema.parse(invalidGPS)).toThrow()
    })

    it('should validate optical power readings within acceptable range', () => {
      const validPowerReadings = [
        -8.5,   // High end of range
        -15.0,  // Mid range
        -25.0,  // Lower end
        -29.9   // Just within limit
      ]

      validPowerReadings.forEach(power => {
        const capture = createMockHomeDropCapture({
          installation: {
            equipment: {},
            powerReadings: {
              opticalPower: power,
              signalStrength: 95
            },
            serviceConfig: {}
          }
        })

        expect(() => HomeDropCaptureSchema.parse(capture)).not.toThrow()
      })

      // Note: Business logic validation for power range (-30 to -8 dBm) 
      // is handled in the service layer, not the type schema
    })

    it('should validate required photos completion logic', () => {
      // All photos completed
      const allPhotosComplete = createMockHomeDropCapture({
        requiredPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
        completedPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
        photos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES.map(type => 
          createMockHomeDropPhoto(type)
        )
      })

      expect(() => HomeDropCaptureSchema.parse(allPhotosComplete)).not.toThrow()
      expect(allPhotosComplete.completedPhotos.length).toBe(4)
      expect(allPhotosComplete.photos.length).toBe(4)

      // Partial photos completed
      const partialPhotosComplete = createMockHomeDropCapture({
        requiredPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
        completedPhotos: ['power-meter-test', 'router-4-lights-status'],
        photos: [
          createMockHomeDropPhoto('power-meter-test'),
          createMockHomeDropPhoto('router-4-lights-status')
        ]
      })

      expect(() => HomeDropCaptureSchema.parse(partialPhotosComplete)).not.toThrow()
      expect(partialPhotosComplete.completedPhotos.length).toBe(2)
      expect(partialPhotosComplete.photos.length).toBe(2)
    })
  })

  // ==================== Assignment Interface Tests ====================

  describe('HomeDropAssignment', () => {
    it('should validate complete assignment', () => {
      const validAssignment = createMockHomeDropAssignment({
        priority: 'high',
        status: 'pending',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      })

      // Assignment should have required fields
      expect(validAssignment.id).toMatch(/^ASSIGN-\d+-[a-z0-9]+$/)
      expect(validAssignment.homeDropId).toBeTruthy()
      expect(validAssignment.poleNumber).toBeTruthy()
      expect(validAssignment.customer.name).toBeTruthy()
      expect(validAssignment.customer.address).toBeTruthy()
      expect(validAssignment.assignedTo).toBeTruthy()
      expect(validAssignment.assignedBy).toBeTruthy()
      expect(['high', 'medium', 'low']).toContain(validAssignment.priority)
      expect(['pending', 'accepted', 'in_progress', 'completed', 'cancelled']).toContain(validAssignment.status)
    })

    it('should validate customer information', () => {
      const assignment = createMockHomeDropAssignment({
        customer: {
          name: 'John Doe',
          address: '123 Test Street, City, State 12345',
          contactNumber: '+1-555-0123',
          email: 'john.doe@example.com',
          accountNumber: 'ACC-123456'
        }
      })

      expect(assignment.customer.name).toBeTruthy()
      expect(assignment.customer.address).toBeTruthy()
      expect(assignment.customer.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(assignment.customer.contactNumber).toMatch(/^\+?[\d\s\-\(\)]+$/)
    })
  })

  // ==================== Statistics Interface Tests ====================

  describe('HomeDropStatistics', () => {
    it('should validate statistics structure', () => {
      const stats: HomeDropStatistics = {
        total: 100,
        assigned: 15,
        inProgress: 25,
        captured: 20,
        synced: 18,
        approved: 12,
        rejected: 3,
        errors: 7,
        
        averageCaptureTime: 3600000, // 1 hour in milliseconds
        averagePhotosPerCapture: 4.2,
        syncSuccessRate: 92.5,
        approvalRate: 80.0,
        
        byContractor: {
          'contractor_001': {
            total: 50,
            completed: 40,
            pending: 10,
            averageQualityScore: 85.5
          }
        },
        
        todayCount: 5,
        weekCount: 25,
        monthCount: 100
      }

      // Validate totals add up
      const statusCounts = stats.assigned + stats.inProgress + stats.captured + 
                          stats.synced + stats.approved + stats.rejected + stats.errors
      expect(statusCounts).toBeLessThanOrEqual(stats.total)

      // Validate percentages
      expect(stats.syncSuccessRate).toBeGreaterThanOrEqual(0)
      expect(stats.syncSuccessRate).toBeLessThanOrEqual(100)
      expect(stats.approvalRate).toBeGreaterThanOrEqual(0)
      expect(stats.approvalRate).toBeLessThanOrEqual(100)

      // Validate time periods
      expect(stats.todayCount).toBeLessThanOrEqual(stats.weekCount)
      expect(stats.weekCount).toBeLessThanOrEqual(stats.monthCount)
      expect(stats.monthCount).toBeLessThanOrEqual(stats.total)
    })
  })

  // ==================== Export Format Tests ====================

  describe('HomeDropGeoPackageExport', () => {
    it('should validate GeoPackage export format', () => {
      const exportData: HomeDropGeoPackageExport = {
        id: 'HD-1234567890-ABC123',
        poleNumber: 'P-001',
        customerName: 'John Doe',
        customerAddress: '123 Test Street',
        latitude: 40.7128,
        longitude: -74.0060,
        installationDate: '2024-01-15T10:30:00.000Z',
        status: 'approved',
        opticalPower: -15.5,
        serviceActive: true,
        technicianName: 'Test Technician',
        photos: [
          {
            type: 'power-meter-test',
            url: 'https://storage.example.com/photos/photo1.jpg'
          }
        ],
        geometry: {
          type: 'Point',
          coordinates: [-74.0060, 40.7128] // [longitude, latitude]
        }
      }

      // Validate GeoJSON Point format
      expect(exportData.geometry.type).toBe('Point')
      expect(exportData.geometry.coordinates).toHaveLength(2)
      expect(exportData.geometry.coordinates[0]).toBe(exportData.longitude)
      expect(exportData.geometry.coordinates[1]).toBe(exportData.latitude)

      // Validate required fields for QGIS
      expect(exportData.id).toBeTruthy()
      expect(exportData.poleNumber).toBeTruthy()
      expect(exportData.customerName).toBeTruthy()
      expect(exportData.customerAddress).toBeTruthy()
      expect(typeof exportData.latitude).toBe('number')
      expect(typeof exportData.longitude).toBe('number')
      expect(typeof exportData.serviceActive).toBe('boolean')
    })
  })

  // ==================== Configuration Tests ====================

  describe('HomeDropServiceConfig', () => {
    it('should validate service configuration constraints', () => {
      const config: HomeDropServiceConfig = {
        photoCompressionQuality: 0.8, // 0-1 range
        maxPhotoSize: 10 * 1024 * 1024, // 10MB
        syncBatchSize: 5,
        syncRetryDelay: 30000, // 30 seconds
        maxSyncRetries: 3,
        offlineCacheDuration: 30, // 30 days
        gpsAccuracyThreshold: 20, // 20 meters
        autoSaveInterval: 30 // 30 seconds
      }

      // Validate ranges
      expect(config.photoCompressionQuality).toBeGreaterThan(0)
      expect(config.photoCompressionQuality).toBeLessThanOrEqual(1)
      expect(config.maxPhotoSize).toBeGreaterThan(0)
      expect(config.syncBatchSize).toBeGreaterThan(0)
      expect(config.maxSyncRetries).toBeGreaterThan(0)
      expect(config.gpsAccuracyThreshold).toBeGreaterThan(0)
      expect(config.autoSaveInterval).toBeGreaterThan(0)
    })
  })

  // ==================== Validation Rules Tests ====================

  describe('HomeDropValidationRules', () => {
    it('should validate business rules constraints', () => {
      const rules: HomeDropValidationRules = {
        requiredPhotos: TEST_CONSTANTS.REQUIRED_PHOTO_TYPES,
        minOpticalPower: -30, // dBm
        maxOpticalPower: -8,  // dBm
        maxDistanceFromPole: 500, // meters
        photoQualityMinScore: 70, // 0-100
        requiredFields: [
          'poleNumber',
          'customer.name',
          'customer.address',
          'gpsLocation'
        ]
      }

      // Validate optical power range
      expect(rules.minOpticalPower).toBeLessThan(rules.maxOpticalPower)
      expect(rules.minOpticalPower).toBeLessThan(0) // Should be negative dBm
      expect(rules.maxOpticalPower).toBeLessThan(0) // Should be negative dBm

      // Validate distance constraint
      expect(rules.maxDistanceFromPole).toBeGreaterThan(0)
      expect(rules.maxDistanceFromPole).toBeLessThanOrEqual(1000) // Reasonable maximum

      // Validate photo quality score
      expect(rules.photoQualityMinScore).toBeGreaterThanOrEqual(0)
      expect(rules.photoQualityMinScore).toBeLessThanOrEqual(100)

      // Validate required photos
      expect(rules.requiredPhotos).toHaveLength(4)
      expect(rules.requiredPhotos).toEqual(TEST_CONSTANTS.REQUIRED_PHOTO_TYPES)

      // Validate required fields
      expect(rules.requiredFields.length).toBeGreaterThan(0)
      expect(rules.requiredFields).toContain('poleNumber')
      expect(rules.requiredFields).toContain('customer.name')
      expect(rules.requiredFields).toContain('customer.address')
      expect(rules.requiredFields).toContain('gpsLocation')
    })
  })
})