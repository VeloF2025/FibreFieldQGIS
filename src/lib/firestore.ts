// Firestore utilities for FibreField
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  CollectionReference,
  Timestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from './firebase';
import { log } from './logger';

// Collection names - matching FibreFlow conventions
export const COLLECTIONS = {
  PROJECTS: 'projects',
  PLANNED_POLES: 'planned-poles',
  POLE_INSTALLATIONS: 'pole-installations', 
  CONTRACTORS: 'contractors',
  STAFF: 'staff',
  USERS: 'users',
  OFFLINE_QUEUE: 'offline-queue'
} as const;

// Generic CRUD operations
export class FirestoreService<T extends DocumentData> {
  private collectionRef: CollectionReference;

  constructor(private collectionName: string) {
    this.collectionRef = collection(db, collectionName);
  }

  // Create document
  async create(data: Omit<T, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(this.collectionRef, {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      log.error(`Error creating document in ${this.collectionName}:`, {}, "Firestore", error);
      throw error;
    }
  }

  // Get document by ID
  async getById(id: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(doc(this.collectionRef, id));
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as T & { id: string };
      }
      
      return null;
    } catch (error) {
      log.error(`Error getting document ${id} from ${this.collectionName}:`, {}, "Firestore", error);
      throw error;
    }
  }

  // Get all documents with optional query constraints
  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.collectionRef, ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (T & { id: string })[];
    } catch (error) {
      log.error(`Error getting documents from ${this.collectionName}:`, {}, "Firestore", error);
      throw error;
    }
  }

  // Update document
  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      await updateDoc(doc(this.collectionRef, id), {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      log.error(`Error updating document ${id} in ${this.collectionName}:`, {}, "Firestore", error);
      throw error;
    }
  }

  // Delete document
  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(this.collectionRef, id));
    } catch (error) {
      log.error(`Error deleting document ${id} from ${this.collectionName}:`, {}, "Firestore", error);
      throw error;
    }
  }

  // Real-time listener
  onSnapshot(
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ) {
    const q = query(this.collectionRef, ...constraints);
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (T & { id: string })[];
      
      callback(data);
    }, (error) => {
      log.error(`Error in snapshot listener for ${this.collectionName}:`, {}, "Firestore", error);
    });
  }
}

// Offline network management
export const goOffline = async () => {
  try {
    await disableNetwork(db);
    log.info('Firestore: Switched to offline mode', {}, "Firestore");
  } catch (error) {
    log.error('Error going offline:', {}, "Firestore", error);
  }
};

export const goOnline = async () => {
  try {
    await enableNetwork(db);
    log.info('Firestore: Switched to online mode', {}, "Firestore");
  } catch (error) {
    log.error('Error going online:', {}, "Firestore", error);
  }
};

// Utility query builders
export const buildQuery = {
  where: (field: string, operator: any, value: any) => where(field, operator, value),
  orderBy: (field: string, direction: 'asc' | 'desc' = 'asc') => orderBy(field, direction),
  limit: (count: number) => limit(count)
};

// Pre-configured services for common collections
export const projectsService = new FirestoreService(COLLECTIONS.PROJECTS);
export const plannedPolesService = new FirestoreService(COLLECTIONS.PLANNED_POLES);
export const poleInstallationsService = new FirestoreService(COLLECTIONS.POLE_INSTALLATIONS);
export const contractorsService = new FirestoreService(COLLECTIONS.CONTRACTORS);
export const staffService = new FirestoreService(COLLECTIONS.STAFF);
export const offlineQueueService = new FirestoreService(COLLECTIONS.OFFLINE_QUEUE);