/**
 * Test Utilities for FibreField Home Drop Capture Testing
 * 
 * Comprehensive utilities and helpers for testing the Home Drop Capture system.
 * Includes mocks, fixtures, and testing helpers for all major components.
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, createElement } from 'react'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type {
  HomeDropCapture,
  HomeDropPhoto,
  HomeDropPhotoType,
  HomeDropAssignment,
  HomeDropPhotoStorage,
  HomeDropSyncQueueItem
} from '@/types/home-drop.types'

// Test wrapper with providers
interface AllTheProvidersProps {
  children: React.ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return createElement(QueryClientProvider, { client: queryClient }, children)
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock Data Factories
export const createMockHomeDropCapture = (overrides?: Partial<HomeDropCapture>): HomeDropCapture => ({
  id: 'HD-1234567890-ABC123',
  poleNumber: 'P-001',
  projectId: 'proj_001',
  projectName: 'Test Project',
  contractorId: 'contractor_001',
  
  status: 'assigned',
  syncStatus: 'pending',
  syncAttempts: 0,
  
  customer: {
    name: 'John Doe',
    address: '123 Test Street, Test City, TC 12345',
    contactNumber: '+1-555-0123',
    email: 'john.doe@example.com',
    accountNumber: 'ACC-123456',
  },
  
  installation: {
    equipment: {
      ontSerialNumber: 'ONT-12345',
      routerSerialNumber: 'RTR-67890',
      fiberLength: 50,
      connectorType: 'SC/APC',
    },
    powerReadings: {
      opticalPower: -15.5,
      signalStrength: 95,
      linkQuality: 98,
      testTimestamp: new Date(),
    },
    serviceConfig: {
      serviceType: 'Fiber 1000',
      bandwidth: '1000/1000',
      vlanId: '100',
      ipAddress: '192.168.1.100',
      activationStatus: true,
    },
  },
  
  photos: [],
  requiredPhotos: [
    'power-meter-test',
    'fibertime-setup-confirmation', 
    'fibertime-device-actions',
    'router-4-lights-status'
  ] as HomeDropPhotoType[],
  completedPhotos: [],
  
  gpsLocation: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5,
    altitude: 10,
    capturedAt: new Date(),
  },
  
  workflow: {
    currentStep: 1,
    totalSteps: 4,
    lastSavedStep: 1,
    steps: {
      assignments: false,
      gps: false,
      photos: false,
      review: false,
    },
  },
  
  capturedBy: 'tech_001',
  capturedByName: 'Test Technician',
  createdAt: new Date(),
  updatedAt: new Date(),
  
  distanceFromPole: 25.5,
  
  ...overrides,
})

export const createMockHomeDropPhoto = (type: HomeDropPhotoType, overrides?: Partial<HomeDropPhoto>): HomeDropPhoto => ({
  id: `photo_${type}_${Date.now()}`,
  type,
  data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/g',
  timestamp: new Date(),
  size: 1024000, // 1MB
  compressed: false,
  
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5,
  },
  
  uploadStatus: 'pending',
  
  resolution: {
    width: 1920,
    height: 1080,
  },
  
  isValid: true,
  
  ...overrides,
})

export const createMockHomeDropAssignment = (overrides?: Partial<HomeDropAssignment>): HomeDropAssignment => ({
  id: 'ASSIGN-1234567890-abc123',
  homeDropId: 'HD-1234567890-ABC123',
  poleNumber: 'P-001',
  
  customer: {
    name: 'John Doe',
    address: '123 Test Street, Test City, TC 12345',
    contactNumber: '+1-555-0123',
    email: 'john.doe@example.com',
    accountNumber: 'ACC-123456',
  },
  
  assignedTo: 'tech_001',
  assignedBy: 'manager_001',
  assignedAt: new Date(),
  scheduledDate: new Date(),
  
  priority: 'medium',
  installationNotes: 'Standard installation',
  accessNotes: 'Gate code: 1234',
  
  status: 'pending',
  
  ...overrides,
})

export const createMockHomeDropPhotoStorage = (
  homeDropId: string, 
  type: HomeDropPhotoType, 
  overrides?: Partial<HomeDropPhotoStorage>
): HomeDropPhotoStorage => ({
  id: `${homeDropId}_${type}_${Date.now()}`,
  homeDropId,
  type,
  data: 'data:image/jpeg;base64,mock-data',
  size: 1024000,
  compressed: false,
  
  uploadStatus: 'pending',
  capturedAt: new Date(),
  
  metadata: {
    width: 1920,
    height: 1080,
    mimeType: 'image/jpeg',
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
    },
  },
  
  ...overrides,
})

export const createMockSyncQueueItem = (
  homeDropId: string,
  action: HomeDropSyncQueueItem['action'],
  overrides?: Partial<HomeDropSyncQueueItem>
): HomeDropSyncQueueItem => ({
  id: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  homeDropId,
  action,
  data: {},
  
  priority: 'medium',
  attempts: 0,
  maxAttempts: 3,
  status: 'pending',
  
  createdAt: new Date(),
  updatedAt: new Date(),
  
  ...overrides,
})

// GPS Mock Utilities
export const mockGeolocationSuccess = (
  latitude: number = 40.7128,
  longitude: number = -74.0060,
  accuracy: number = 5
) => {
  const position = {
    coords: {
      latitude,
      longitude,
      accuracy,
      altitude: 10,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  }

  vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation((success) => {
    setTimeout(() => success(position), 100)
  })

  return position
}

export const mockGeolocationError = (code: number = 1, message: string = 'Permission denied') => {
  const error = {
    code,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }

  vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation((_, error_callback) => {
    setTimeout(() => error_callback?.(error), 100)
  })

  return error
}

// Camera Mock Utilities
export const mockCameraSuccess = (mimeType: string = 'image/jpeg') => {
  const mockStream = {
    getTracks: () => [
      {
        stop: vi.fn(),
        getSettings: () => ({
          width: 1920,
          height: 1080,
          aspectRatio: 16/9,
          frameRate: 30,
          facingMode: 'environment'
        })
      }
    ],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
  } as any

  vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream)
  return mockStream
}

export const mockCameraError = (name: string = 'NotAllowedError') => {
  const error = new Error('Camera access denied')
  error.name = name
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(error)
  return error
}

// IndexedDB Testing Utilities
export const clearTestDatabase = async () => {
  // Clear all IndexedDB data for testing
  const databases = await indexedDB.databases()
  await Promise.all(
    databases.map(db => {
      return new Promise<void>((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(db.name!)
        deleteReq.onsuccess = () => resolve()
        deleteReq.onerror = () => reject(deleteReq.error)
      })
    })
  )
}

// Async Testing Utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return
    }
    await waitFor(interval)
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

// File Testing Utilities
export const createMockFile = (
  name: string = 'test-image.jpg',
  type: string = 'image/jpeg',
  size: number = 1024000
): File => {
  const content = new Uint8Array(size).fill(0x89) // Mock binary data
  return new File([content], name, { type })
}

export const createMockBlob = (
  type: string = 'image/jpeg',
  size: number = 1024000
): Blob => {
  const content = new Uint8Array(size).fill(0x89)
  return new Blob([content], { type })
}

// Form Testing Utilities
export const createFormData = (data: Record<string, any>): FormData => {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value)
    } else {
      formData.append(key, String(value))
    }
  })
  return formData
}

// Error Testing Utilities
export const expectError = async (
  asyncFn: () => Promise<any>,
  expectedMessage?: string | RegExp
): Promise<Error> => {
  try {
    await asyncFn()
    throw new Error('Expected function to throw an error, but it did not')
  } catch (error) {
    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        expect((error as Error).message).toBe(expectedMessage)
      } else {
        expect((error as Error).message).toMatch(expectedMessage)
      }
    }
    return error as Error
  }
}

// Service Worker Mock
export const mockServiceWorker = () => {
  const mockRegistration = {
    installing: null,
    waiting: null,
    active: null,
    scope: 'http://localhost:3020/',
    update: vi.fn(),
    unregister: vi.fn(),
  }

  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: vi.fn().mockResolvedValue(mockRegistration),
      ready: Promise.resolve(mockRegistration),
      controller: null,
      getRegistration: vi.fn().mockResolvedValue(mockRegistration),
      getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
  })

  return mockRegistration
}

// Network Mock Utilities
export const mockOnlineStatus = (isOnline: boolean = true) => {
  Object.defineProperty(navigator, 'onLine', {
    value: isOnline,
    writable: true,
  })

  // Trigger network change events
  window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'))
}

// Test Constants
export const TEST_CONSTANTS = {
  MOCK_GPS_COORDS: {
    latitude: 40.7128,
    longitude: -74.0060,
    accuracy: 5,
  },
  MOCK_POLE_NUMBER: 'P-001',
  MOCK_PROJECT_ID: 'proj_001',
  MOCK_TECHNICIAN_ID: 'tech_001',
  MOCK_CUSTOMER_ADDRESS: '123 Test Street, Test City, TC 12345',
  REQUIRED_PHOTO_TYPES: [
    'power-meter-test',
    'fibertime-setup-confirmation',
    'fibertime-device-actions',
    'router-4-lights-status'
  ] as HomeDropPhotoType[],
} as const