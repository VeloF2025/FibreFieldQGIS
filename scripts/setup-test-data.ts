// Script to setup test data for FibreField
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { firebaseServices } from '../src/lib/firebase';

// Initialize Firebase
const app = initializeApp(firebaseServices.config);
const db = getFirestore(app);

async function setupTestData() {
  try {
    // Create test assignments
    const assignments = [
      {
        projectId: 'test-project-1',
        poleNumber: 'P001',
        customerName: 'John Doe',
        serviceAddress: '123 Main St',
        status: 'pending',
        priority: 'high',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        assignedTo: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        projectId: 'test-project-1',
        poleNumber: 'P002',
        customerName: 'Jane Smith',
        serviceAddress: '456 Oak Ave',
        status: 'accepted',
        priority: 'medium',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000)),
        assignedTo: 'test-technician',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        projectId: 'test-project-1',
        poleNumber: 'P003',
        customerName: 'Bob Johnson',
        serviceAddress: '789 Pine Rd',
        status: 'in_progress',
        priority: 'low',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
        assignedTo: 'test-technician',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    // Add assignments to Firestore
    const assignmentsRef = collection(db, 'assignments');
    for (const assignment of assignments) {
      const docRef = await addDoc(assignmentsRef, assignment);
      // Log without console.log
    }

    // Create test poles
    const poles = [
      {
        projectId: 'test-project-1',
        poleNumber: 'P001',
        location: { lat: 40.7128, lng: -74.0060 },
        status: 'captured',
        capturedBy: 'test-technician',
        capturedAt: Timestamp.now()
      },
      {
        projectId: 'test-project-1',
        poleNumber: 'P002',
        location: { lat: 40.7260, lng: -73.9897 },
        status: 'captured',
        capturedBy: 'test-technician',
        capturedAt: Timestamp.now()
      }
    ];

    const polesRef = collection(db, 'poles');
    for (const pole of poles) {
      await addDoc(polesRef, pole);
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

setupTestData();