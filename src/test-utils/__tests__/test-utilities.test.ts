/**
 * Test the test utilities to ensure they work correctly
 */
import { describe, it, expect } from 'vitest'
import {
  createMockHomeDropCapture,
  createMockHomeDropPhoto,
  createMockHomeDropAssignment,
  mockGeolocationSuccess,
  mockGeolocationError,
  TEST_CONSTANTS
} from '../index'

describe('Test Utilities', () => {
  describe('Mock Factories', () => {
    it('should create mock home drop capture', () => {
      const mockCapture = createMockHomeDropCapture()
      
      expect(mockCapture).toBeDefined()
      expect(mockCapture.id).toBe('HD-1234567890-ABC123')
      expect(mockCapture.status).toBe('assigned')
      expect(mockCapture.customer.name).toBe('John Doe')
      expect(mockCapture.requiredPhotos).toHaveLength(4)
      expect(mockCapture.gpsLocation.latitude).toBe(40.7128)
    })

    it('should create mock home drop photo', () => {
      const mockPhoto = createMockHomeDropPhoto('power-meter-test')
      
      expect(mockPhoto).toBeDefined()
      expect(mockPhoto.type).toBe('power-meter-test')
      expect(mockPhoto.data).toContain('data:image/jpeg;base64')
      expect(mockPhoto.size).toBe(1024000)
      expect(mockPhoto.isValid).toBe(true)
    })

    it('should create mock assignment', () => {
      const mockAssignment = createMockHomeDropAssignment()
      
      expect(mockAssignment).toBeDefined()
      expect(mockAssignment.id).toBe('ASSIGN-1234567890-abc123')
      expect(mockAssignment.customer.name).toBe('John Doe')
      expect(mockAssignment.status).toBe('pending')
    })
  })

  describe('Geolocation Mocks', () => {
    it('should create geolocation success mock', () => {
      const position = mockGeolocationSuccess()
      
      expect(position).toBeDefined()
      expect(position.coords.latitude).toBe(40.7128)
      expect(position.coords.longitude).toBe(-74.0060)
      expect(position.coords.accuracy).toBe(5)
      expect(typeof position.coords.toJSON).toBe('function')
      expect(typeof position.toJSON).toBe('function')
    })

    it('should create geolocation error mock', () => {
      const error = mockGeolocationError()
      
      expect(error).toBeDefined()
      expect(error.code).toBe(1)
      expect(error.message).toBe('Permission denied')
      expect(error.PERMISSION_DENIED).toBe(1)
    })
  })

  describe('Test Constants', () => {
    it('should provide test constants', () => {
      expect(TEST_CONSTANTS.MOCK_GPS_COORDS.latitude).toBe(40.7128)
      expect(TEST_CONSTANTS.MOCK_POLE_NUMBER).toBe('P-001')
      expect(TEST_CONSTANTS.REQUIRED_PHOTO_TYPES).toHaveLength(4)
      expect(TEST_CONSTANTS.REQUIRED_PHOTO_TYPES).toContain('power-meter-test')
    })
  })
})