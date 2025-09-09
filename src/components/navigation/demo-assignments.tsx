/**
 * Demo Assignments Component
 * 
 * Provides sample assignment data for testing the navigation system
 */

import type { HomeDropAssignment } from '@/types/home-drop.types';

/**
 * Generate demo assignments for testing
 */
export function generateDemoAssignments(): HomeDropAssignment[] {
  return [
    {
      id: 'hda-001',
      homeDropId: 'hd-001',
      poleNumber: 'P-2024-001',
      customer: {
        name: 'John Smith',
        address: '123 Main St, Toronto, ON M5V 3A8',
        contactNumber: '(416) 555-0123',
        email: 'john.smith@email.com',
        accountNumber: 'ACC-001',
        location: {
          latitude: 43.6532,
          longitude: -79.3832,
          accuracy: 5,
          capturedAt: new Date()
        }
      },
      assignedTo: 'tech-001',
      assignedBy: 'admin-001',
      assignedAt: new Date('2024-01-15T09:00:00Z'),
      scheduledDate: new Date('2024-01-16T10:00:00Z'),
      priority: 'high',
      installationNotes: 'Customer prefers morning installation. Gate code: 1234',
      accessNotes: 'Ring doorbell twice. Side entrance preferred.',
      status: 'pending'
    },
    {
      id: 'hda-002',
      homeDropId: 'hd-002',
      poleNumber: 'P-2024-002',
      customer: {
        name: 'Sarah Johnson',
        address: '456 Oak Avenue, Toronto, ON M4E 2L9',
        contactNumber: '(416) 555-0456',
        email: 'sarah.j@email.com',
        accountNumber: 'ACC-002',
        location: {
          latitude: 43.6482,
          longitude: -79.3782,
          accuracy: 8,
          capturedAt: new Date()
        }
      },
      assignedTo: 'tech-001',
      assignedBy: 'admin-001',
      assignedAt: new Date('2024-01-15T09:15:00Z'),
      scheduledDate: new Date('2024-01-16T14:00:00Z'),
      priority: 'medium',
      installationNotes: 'Standard residential installation',
      accessNotes: 'Customer works from home. Call before arrival.',
      status: 'pending'
    },
    {
      id: 'hda-003',
      homeDropId: 'hd-003',
      poleNumber: 'P-2024-003',
      customer: {
        name: 'Mike Chen',
        address: '789 Pine Street, Toronto, ON M6G 1B4',
        contactNumber: '(416) 555-0789',
        email: 'mike.chen@email.com',
        accountNumber: 'ACC-003',
        location: {
          latitude: 43.6582,
          longitude: -79.3882,
          accuracy: 12,
          capturedAt: new Date()
        }
      },
      assignedTo: 'tech-001',
      assignedBy: 'admin-001',
      assignedAt: new Date('2024-01-15T09:30:00Z'),
      scheduledDate: new Date('2024-01-17T09:00:00Z'),
      priority: 'low',
      installationNotes: 'Apartment building - Unit 3B',
      accessNotes: 'Buzzer code: 3B. Superintendent: 416-555-9999',
      status: 'accepted'
    },
    {
      id: 'hda-004',
      homeDropId: 'hd-004',
      poleNumber: 'P-2024-004',
      customer: {
        name: 'Emily Rodriguez',
        address: '321 Elm Drive, Toronto, ON M5R 2K8',
        contactNumber: '(416) 555-0321',
        email: 'emily.r@email.com',
        accountNumber: 'ACC-004',
        location: {
          latitude: 43.6632,
          longitude: -79.3732,
          accuracy: 7,
          capturedAt: new Date()
        }
      },
      assignedTo: 'tech-001',
      assignedBy: 'admin-001',
      assignedAt: new Date('2024-01-15T09:45:00Z'),
      scheduledDate: new Date('2024-01-16T16:00:00Z'),
      priority: 'high',
      installationNotes: 'Priority customer - business account',
      accessNotes: 'Office building. Reception will provide access.',
      status: 'pending'
    },
    {
      id: 'hda-005',
      homeDropId: 'hd-005',
      poleNumber: 'P-2024-005',
      customer: {
        name: 'David Williams',
        address: '654 Maple Road, Toronto, ON M4K 3N2',
        contactNumber: '(416) 555-0654',
        email: 'david.w@email.com',
        accountNumber: 'ACC-005',
        location: {
          latitude: 43.6432,
          longitude: -79.3932,
          accuracy: 15,
          capturedAt: new Date()
        }
      },
      assignedTo: 'tech-001',
      assignedBy: 'admin-001',
      assignedAt: new Date('2024-01-15T10:00:00Z'),
      scheduledDate: new Date('2024-01-17T11:00:00Z'),
      priority: 'medium',
      installationNotes: 'House renovation in progress - check access',
      accessNotes: 'Construction site - hard hat required',
      status: 'pending'
    }
  ];
}