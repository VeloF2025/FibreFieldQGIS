/**
 * Test Setup Configuration
 * 
 * This file configures the testing environment for FibreField Home Drop Capture.
 * It sets up mocks, utilities, and global configurations needed for comprehensive testing.
 */

import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  usePathname() {
    return '/test-path'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  useParams() {
    return {}
  },
}))

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  initializeFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: vi.fn((date: Date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  },
}))

vi.mock('firebase/storage', () => ({
  getStorage: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}))

// Mock Geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

// Mock MediaDevices for camera access
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn(),
}

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
})

// Mock File Reader
global.FileReader = class MockFileReader {
  result: string | ArrayBuffer | null = null
  error: DOMException | null = null
  readyState: number = 0
  
  onabort: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadstart: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onprogress: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null

  constructor() {
    this.readyState = 0 // EMPTY
  }

  readAsDataURL(file: Blob): void {
    this.readyState = 1 // LOADING
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/g'
      this.readyState = 2 // DONE
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>)
      }
      if (this.onloadend) {
        this.onloadend({} as ProgressEvent<FileReader>)
      }
    }, 10)
  }

  readAsText(): void {
    // Mock implementation
  }

  readAsArrayBuffer(): void {
    // Mock implementation
  }

  readAsBinaryString(): void {
    // Mock implementation
  }

  abort(): void {
    // Mock implementation
  }

  addEventListener(): void {
    // Mock implementation
  }

  removeEventListener(): void {
    // Mock implementation
  }

  dispatchEvent(): boolean {
    return true
  }
}

// Mock Canvas and Image
global.Image = class MockImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src: string = ''
  width: number = 1024
  height: number = 768

  constructor(width?: number, height?: number) {
    if (width) this.width = width
    if (height) this.height = height
    
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 10)
  }
} as any

global.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  canvas: {
    width: 1024,
    height: 768,
    toBlob: vi.fn((callback) => {
      const mockBlob = new Blob(['mock image data'], { type: 'image/jpeg' })
      setTimeout(() => callback(mockBlob), 10)
    }),
  },
}))

// Mock IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  
  constructor(callback: IntersectionObserverCallback) {
    // Mock constructor
  }
}

// Mock ResizeObserver
global.ResizeObserver = class MockResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
  
  constructor(callback: ResizeObserverCallback) {
    // Mock constructor
  }
}

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString()
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    length: 0,
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
})

// Console warnings for missing implementations
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  // Suppress specific warnings that are expected in test environment
  const message = args[0]
  if (
    typeof message === 'string' &&
    (message.includes('IndexedDB') ||
     message.includes('Service Worker') ||
     message.includes('WebGL'))
  ) {
    return
  }
  originalConsoleWarn(...args)
}

// Clean up function for tests
export function cleanup() {
  vi.clearAllMocks()
  localStorageMock.clear()
  
  // Reset IndexedDB
  if (typeof window !== 'undefined' && window.indexedDB) {
    // Clear all databases
  }
}