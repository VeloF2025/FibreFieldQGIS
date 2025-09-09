/**
 * Pole-Drop Relationship Tracking Service
 * 
 * Manages relationships between poles and home drop captures to track
 * network topology, service coverage areas, and capacity planning.
 * 
 * Key Features:
 * 1. Link home drops to originating poles
 * 2. Track service paths and network topology
 * 3. Calculate coverage areas and capacity metrics
 * 4. Generate network visualization data
 * 5. Validate data integrity and relationships
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { log } from '@/lib/logger';

/**
 * Pole-Drop Relationship Interface
 */
export interface PoleDropRelationship {
  id: string;
  poleId: string;
  homeDropId: string;
  projectId: string;
  
  // Relationship metadata
  relationshipType: 'direct' | 'indirect' | 'backbone' | 'feeder';
  distance: number; // meters from pole to drop
  serviceDirection: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  cableType: 'fiber' | 'copper' | 'coax' | 'hybrid';
  
  // Network path information
  pathSegments: PathSegment[];
  totalPathLength: number; // meters
  pathComplexity: 'simple' | 'moderate' | 'complex'; // based on number of segments
  
  // Service details
  serviceCapacity: number; // Mbps
  utilizationPercent: number; // 0-100
  priorityLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Geographic data
  coordinates: {
    pole: { lat: number; lng: number; };
    drop: { lat: number; lng: number; };
    pathPoints: Array<{ lat: number; lng: number; order: number; }>;
  };
  
  // Quality metrics
  signalStrength: number; // dBm
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastQualityTest?: Date;
  
  // Status and tracking
  status: 'planned' | 'active' | 'suspended' | 'terminated' | 'maintenance';
  activatedAt?: Date;
  lastServiceCheck?: Date;
  maintenanceScheduled?: Date;
  
  // Administrative
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
}

/**
 * Path Segment Interface
 */
export interface PathSegment {
  id: string;
  order: number;
  segmentType: 'aerial' | 'underground' | 'building' | 'vault' | 'splice';
  startPoint: { lat: number; lng: number; elevation?: number; };
  endPoint: { lat: number; lng: number; elevation?: number; };
  length: number; // meters
  cableSpecs: {
    type: string;
    fiberCount?: number;
    diameter?: number;
    manufacturer?: string;
  };
  installationMethod: 'new' | 'existing' | 'upgrade';
  installationDate?: Date;
  inspectionDate?: Date;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
}

/**
 * Coverage Area Interface
 */
export interface CoverageArea {
  id: string;
  poleId: string;
  projectId: string;
  
  // Geographic boundaries
  boundaryPolygon: Array<{ lat: number; lng: number; }>; // GeoJSON polygon
  centerPoint: { lat: number; lng: number; };
  radiusMeters: number;
  areaSquareMeters: number;
  
  // Service statistics
  totalDrops: number;
  activeDrops: number;
  plannedDrops: number;
  serviceableAddresses: number;
  penetrationRate: number; // percentage of serviceable addresses with active service
  
  // Capacity metrics
  totalCapacity: number; // Mbps
  usedCapacity: number; // Mbps
  availableCapacity: number; // Mbps
  utilizationPercent: number; // 0-100
  maxServiceableDrops: number;
  
  // Network health
  averageSignalStrength: number;
  connectionQualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  
  // Demographics and planning
  residentialCount: number;
  businessCount: number;
  futureExpansionPotential: 'low' | 'medium' | 'high';
  competitorPresence: boolean;
  marketPriority: 'low' | 'medium' | 'high' | 'strategic';
  
  // Temporal data
  lastUpdated: Date;
  nextReviewDate: Date;
}

/**
 * Network Topology Node Interface
 */
export interface NetworkNode {
  id: string;
  nodeType: 'pole' | 'drop' | 'hub' | 'splitter' | 'amplifier';
  coordinates: { lat: number; lng: number; elevation?: number; };
  
  // Connectivity
  connections: Array<{
    targetNodeId: string;
    connectionType: 'primary' | 'backup' | 'redundant';
    capacity: number;
    utilization: number;
    status: 'active' | 'inactive' | 'maintenance';
  }>;
  
  // Node properties
  capacity: number;
  currentLoad: number;
  maxConnections: number;
  equipmentSpecs?: Record<string, unknown>;
  
  // Status
  operationalStatus: 'online' | 'offline' | 'degraded' | 'maintenance';
  lastHealthCheck: Date;
  
  // Administrative
  installationDate?: Date;
  warrantyExpiry?: Date;
  maintenanceSchedule?: string;
}

/**
 * Pole-Drop Relationship Service Class
 */
class PoleDropRelationshipService {
  private readonly RELATIONSHIPS_COLLECTION = 'pole-drop-relationships';
  private readonly COVERAGE_AREAS_COLLECTION = 'coverage-areas';
  private readonly NETWORK_TOPOLOGY_COLLECTION = 'network-topology';
  private readonly PATH_SEGMENTS_COLLECTION = 'path-segments';
  
  constructor() {
    this.initializeService();
  }
  
  /**
   * Initialize the pole-drop relationship service
   */
  private async initializeService(): Promise<void> {
    try {
      log.info('Pole-Drop Relationship Service initialized', {}, 'PoleDropRelationshipService');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to initialize Pole-Drop Relationship Service', { error: errorMessage }, 'PoleDropRelationshipService');
    }
  }
  
  // ==================== Relationship Management ====================
  
  /**
   * Create a new pole-drop relationship
   */
  async createRelationship(
    poleId: string,
    homeDropId: string,
    relationshipData: {
      relationshipType: PoleDropRelationship['relationshipType'];
      distance: number;
      serviceDirection: PoleDropRelationship['serviceDirection'];
      cableType: PoleDropRelationship['cableType'];
      pathSegments: PathSegment[];
      serviceCapacity: number;
      coordinates: PoleDropRelationship['coordinates'];
      userId: string;
    }
  ): Promise<string> {
    try {
      // Validate pole and home drop exist
      const poleExists = await this.validatePoleExists(poleId);
      const homeDropExists = await this.validateHomeDropExists(homeDropId);
      
      if (!poleExists) {
        throw new Error(`Pole ${poleId} not found`);
      }
      
      if (!homeDropExists) {
        throw new Error(`Home drop ${homeDropId} not found`);
      }
      
      // Check for existing relationship
      const existingRelationship = await this.getRelationshipByHomeDropId(homeDropId);
      if (existingRelationship) {
        throw new Error(`Home drop ${homeDropId} is already linked to pole ${existingRelationship.poleId}`);
      }
      
      // Calculate path metrics
      const totalPathLength = relationshipData.pathSegments.reduce((sum, segment) => sum + segment.length, 0);
      const pathComplexity = this.calculatePathComplexity(relationshipData.pathSegments);
      
      // Get project ID from pole or home drop
      const projectId = await this.getProjectIdFromPole(poleId);
      
      // Create relationship
      const relationshipId = this.generateRelationshipId();
      const relationship: PoleDropRelationship = {
        id: relationshipId,
        poleId,
        homeDropId,
        projectId,
        relationshipType: relationshipData.relationshipType,
        distance: relationshipData.distance,
        serviceDirection: relationshipData.serviceDirection,
        cableType: relationshipData.cableType,
        pathSegments: relationshipData.pathSegments,
        totalPathLength,
        pathComplexity,
        serviceCapacity: relationshipData.serviceCapacity,
        utilizationPercent: 0, // Initially 0
        priorityLevel: 'medium', // Default priority
        coordinates: relationshipData.coordinates,
        signalStrength: -50, // Default signal strength
        connectionQuality: 'good', // Default quality
        status: 'planned',
        createdBy: relationshipData.userId,
        createdAt: new Date(),
        lastModified: new Date()
      };
      
      // Save relationship
      const docRef = doc(db, this.RELATIONSHIPS_COLLECTION, relationshipId);
      await setDoc(docRef, {
        ...relationship,
        createdAt: Timestamp.fromDate(relationship.createdAt),
        lastModified: Timestamp.fromDate(relationship.lastModified),
        activatedAt: relationship.activatedAt ? Timestamp.fromDate(relationship.activatedAt) : null,
        lastServiceCheck: relationship.lastServiceCheck ? Timestamp.fromDate(relationship.lastServiceCheck) : null,
        lastQualityTest: relationship.lastQualityTest ? Timestamp.fromDate(relationship.lastQualityTest) : null,
        maintenanceScheduled: relationship.maintenanceScheduled ? Timestamp.fromDate(relationship.maintenanceScheduled) : null
      });
      
      // Update coverage area for the pole
      await this.updatePoleCoverageArea(poleId);
      
      // Update network topology
      await this.updateNetworkTopology(poleId, homeDropId, relationshipId);
      
      log.info('Pole-drop relationship created', { 
        relationshipId, 
        poleId, 
        homeDropId,
        distance: relationshipData.distance,
        pathLength: totalPathLength
      }, 'PoleDropRelationshipService');
      
      return relationshipId;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to create pole-drop relationship', { 
        poleId, 
        homeDropId, 
        error: errorMessage 
      }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  /**
   * Get relationship by ID
   */
  async getRelationship(relationshipId: string): Promise<PoleDropRelationship | null> {
    try {
      const docRef = doc(db, this.RELATIONSHIPS_COLLECTION, relationshipId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          lastModified: data.lastModified.toDate(),
          activatedAt: data.activatedAt?.toDate(),
          lastServiceCheck: data.lastServiceCheck?.toDate(),
          lastQualityTest: data.lastQualityTest?.toDate(),
          maintenanceScheduled: data.maintenanceScheduled?.toDate()
        } as PoleDropRelationship;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get relationship', { relationshipId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  /**
   * Get all relationships for a pole
   */
  async getPoleRelationships(poleId: string): Promise<PoleDropRelationship[]> {
    try {
      const q = query(
        collection(db, this.RELATIONSHIPS_COLLECTION),
        where('poleId', '==', poleId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          lastModified: data.lastModified.toDate(),
          activatedAt: data.activatedAt?.toDate(),
          lastServiceCheck: data.lastServiceCheck?.toDate(),
          lastQualityTest: data.lastQualityTest?.toDate(),
          maintenanceScheduled: data.maintenanceScheduled?.toDate()
        } as PoleDropRelationship;
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get pole relationships', { poleId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  /**
   * Get relationship by home drop ID
   */
  async getRelationshipByHomeDropId(homeDropId: string): Promise<PoleDropRelationship | null> {
    try {
      const q = query(
        collection(db, this.RELATIONSHIPS_COLLECTION),
        where('homeDropId', '==', homeDropId),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          lastModified: data.lastModified.toDate(),
          activatedAt: data.activatedAt?.toDate(),
          lastServiceCheck: data.lastServiceCheck?.toDate(),
          lastQualityTest: data.lastQualityTest?.toDate(),
          maintenanceScheduled: data.maintenanceScheduled?.toDate()
        } as PoleDropRelationship;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get relationship by home drop', { homeDropId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  // ==================== Coverage Area Management ====================
  
  /**
   * Calculate and update coverage area for a pole
   */
  async updatePoleCoverageArea(poleId: string): Promise<void> {
    try {
      // Get all relationships for this pole
      const relationships = await this.getPoleRelationships(poleId);
      
      if (relationships.length === 0) {
        // No relationships, remove coverage area if it exists
        await this.deleteCoverageArea(poleId);
        return;
      }
      
      // Calculate coverage metrics
      const coverageMetrics = await this.calculateCoverageMetrics(poleId, relationships);
      
      // Get or create coverage area
      const existingCoverage = await this.getCoverageArea(poleId);
      const projectId = relationships[0].projectId;
      
      const coverageArea: CoverageArea = {
        id: poleId, // Use pole ID as coverage area ID
        poleId,
        projectId,
        boundaryPolygon: coverageMetrics.boundaryPolygon,
        centerPoint: coverageMetrics.centerPoint,
        radiusMeters: coverageMetrics.radiusMeters,
        areaSquareMeters: coverageMetrics.areaSquareMeters,
        totalDrops: relationships.length,
        activeDrops: relationships.filter(r => r.status === 'active').length,
        plannedDrops: relationships.filter(r => r.status === 'planned').length,
        serviceableAddresses: coverageMetrics.serviceableAddresses,
        penetrationRate: coverageMetrics.penetrationRate,
        totalCapacity: coverageMetrics.totalCapacity,
        usedCapacity: coverageMetrics.usedCapacity,
        availableCapacity: coverageMetrics.availableCapacity,
        utilizationPercent: coverageMetrics.utilizationPercent,
        maxServiceableDrops: coverageMetrics.maxServiceableDrops,
        averageSignalStrength: coverageMetrics.averageSignalStrength,
        connectionQualityDistribution: coverageMetrics.connectionQualityDistribution,
        residentialCount: coverageMetrics.residentialCount,
        businessCount: coverageMetrics.businessCount,
        futureExpansionPotential: this.assessExpansionPotential(relationships.length, coverageMetrics.maxServiceableDrops),
        competitorPresence: false, // TODO: Implement competitor analysis
        marketPriority: this.calculateMarketPriority(coverageMetrics),
        lastUpdated: new Date(),
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
      
      // Save coverage area
      const docRef = doc(db, this.COVERAGE_AREAS_COLLECTION, poleId);
      await setDoc(docRef, {
        ...coverageArea,
        lastUpdated: Timestamp.fromDate(coverageArea.lastUpdated),
        nextReviewDate: Timestamp.fromDate(coverageArea.nextReviewDate)
      });
      
      log.info('Coverage area updated', { 
        poleId, 
        totalDrops: relationships.length,
        utilizationPercent: coverageMetrics.utilizationPercent
      }, 'PoleDropRelationshipService');
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to update coverage area', { poleId, error: errorMessage }, 'PoleDropRelationshipService');
    }
  }
  
  /**
   * Get coverage area for a pole
   */
  async getCoverageArea(poleId: string): Promise<CoverageArea | null> {
    try {
      const docRef = doc(db, this.COVERAGE_AREAS_COLLECTION, poleId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          lastUpdated: data.lastUpdated.toDate(),
          nextReviewDate: data.nextReviewDate.toDate()
        } as CoverageArea;
      }
      
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get coverage area', { poleId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  /**
   * Get all coverage areas for a project
   */
  async getProjectCoverageAreas(projectId: string): Promise<CoverageArea[]> {
    try {
      const q = query(
        collection(db, this.COVERAGE_AREAS_COLLECTION),
        where('projectId', '==', projectId),
        orderBy('totalDrops', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          lastUpdated: data.lastUpdated.toDate(),
          nextReviewDate: data.nextReviewDate.toDate()
        } as CoverageArea;
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to get project coverage areas', { projectId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  // ==================== Network Topology ====================
  
  /**
   * Generate network topology visualization data
   */
  async generateNetworkTopology(projectId: string): Promise<{
    nodes: NetworkNode[];
    edges: Array<{
      source: string;
      target: string;
      type: string;
      capacity: number;
      utilization: number;
      status: string;
    }>;
    metrics: {
      totalNodes: number;
      totalEdges: number;
      averageUtilization: number;
      networkHealth: number;
    };
  }> {
    try {
      // Get all relationships for the project
      const q = query(
        collection(db, this.RELATIONSHIPS_COLLECTION),
        where('projectId', '==', projectId)
      );
      
      const querySnapshot = await getDocs(q);
      const relationships = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          lastModified: data.lastModified.toDate()
        } as PoleDropRelationship;
      });
      
      // Generate nodes
      const poleNodes = new Map<string, NetworkNode>();
      const dropNodes = new Map<string, NetworkNode>();
      
      for (const relationship of relationships) {
        // Create pole node if not exists
        if (!poleNodes.has(relationship.poleId)) {
          poleNodes.set(relationship.poleId, {
            id: relationship.poleId,
            nodeType: 'pole',
            coordinates: relationship.coordinates.pole,
            connections: [],
            capacity: 1000, // Default pole capacity
            currentLoad: 0,
            maxConnections: 50,
            operationalStatus: 'online',
            lastHealthCheck: new Date()
          });
        }
        
        // Create drop node
        dropNodes.set(relationship.homeDropId, {
          id: relationship.homeDropId,
          nodeType: 'drop',
          coordinates: relationship.coordinates.drop,
          connections: [{
            targetNodeId: relationship.poleId,
            connectionType: 'primary',
            capacity: relationship.serviceCapacity,
            utilization: relationship.utilizationPercent,
            status: relationship.status
          }],
          capacity: relationship.serviceCapacity,
          currentLoad: (relationship.serviceCapacity * relationship.utilizationPercent) / 100,
          maxConnections: 1,
          operationalStatus: relationship.status === 'active' ? 'online' : 'offline',
          lastHealthCheck: relationship.lastServiceCheck || new Date()
        });
        
        // Update pole connections
        const poleNode = poleNodes.get(relationship.poleId)!;
        poleNode.connections.push({
          targetNodeId: relationship.homeDropId,
          connectionType: 'primary',
          capacity: relationship.serviceCapacity,
          utilization: relationship.utilizationPercent,
          status: relationship.status
        });
        poleNode.currentLoad += (relationship.serviceCapacity * relationship.utilizationPercent) / 100;
      }
      
      // Generate edges
      const edges = relationships.map(relationship => ({
        source: relationship.poleId,
        target: relationship.homeDropId,
        type: relationship.relationshipType,
        capacity: relationship.serviceCapacity,
        utilization: relationship.utilizationPercent,
        status: relationship.status
      }));
      
      // Calculate metrics
      const allNodes = [...poleNodes.values(), ...dropNodes.values()];
      const totalUtilization = relationships.reduce((sum, r) => sum + r.utilizationPercent, 0);
      const averageUtilization = relationships.length > 0 ? totalUtilization / relationships.length : 0;
      const activeConnections = relationships.filter(r => r.status === 'active').length;
      const networkHealth = relationships.length > 0 ? (activeConnections / relationships.length) * 100 : 100;
      
      const topology = {
        nodes: allNodes,
        edges,
        metrics: {
          totalNodes: allNodes.length,
          totalEdges: edges.length,
          averageUtilization,
          networkHealth
        }
      };
      
      log.info('Network topology generated', { 
        projectId, 
        nodeCount: allNodes.length,
        edgeCount: edges.length,
        averageUtilization
      }, 'PoleDropRelationshipService');
      
      return topology;
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error('Failed to generate network topology', { projectId, error: errorMessage }, 'PoleDropRelationshipService');
      throw error;
    }
  }
  
  // ==================== Helper Methods ====================
  
  /**
   * Validate pole exists
   */
  private async validatePoleExists(poleId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'pole_captures', poleId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch {
      return false;
    }
  }
  
  /**
   * Validate home drop exists
   */
  private async validateHomeDropExists(homeDropId: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'home_drop_captures', homeDropId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch {
      return false;
    }
  }
  
  /**
   * Get project ID from pole
   */
  private async getProjectIdFromPole(poleId: string): Promise<string> {
    try {
      const docRef = doc(db, 'pole_captures', poleId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data().projectId : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Calculate path complexity
   */
  private calculatePathComplexity(pathSegments: PathSegment[]): 'simple' | 'moderate' | 'complex' {
    if (pathSegments.length <= 2) return 'simple';
    if (pathSegments.length <= 5) return 'moderate';
    return 'complex';
  }
  
  /**
   * Calculate coverage metrics
   */
  private async calculateCoverageMetrics(poleId: string, relationships: PoleDropRelationship[]): Promise<any> {
    // Get pole coordinates
    const poleCoords = relationships[0]?.coordinates.pole;
    if (!poleCoords) {
      throw new Error('No pole coordinates found');
    }
    
    // Calculate boundary polygon from drop locations
    const dropCoords = relationships.map(r => r.coordinates.drop);
    const boundaryPolygon = this.calculateConvexHull(dropCoords);
    
    // Calculate radius (max distance from pole to any drop)
    const radiusMeters = Math.max(...relationships.map(r => r.distance));
    
    // Estimate area (circle based on radius)
    const areaSquareMeters = Math.PI * radiusMeters * radiusMeters;
    
    // Calculate capacity metrics
    const totalCapacity = relationships.reduce((sum, r) => sum + r.serviceCapacity, 0);
    const usedCapacity = relationships.reduce((sum, r) => sum + (r.serviceCapacity * r.utilizationPercent / 100), 0);
    const availableCapacity = totalCapacity - usedCapacity;
    const utilizationPercent = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;
    
    // Estimate serviceable addresses (rough calculation)
    const serviceableAddresses = Math.round(areaSquareMeters / 1000); // 1 address per 1000 sq meters
    const penetrationRate = relationships.length > 0 ? (relationships.length / serviceableAddresses) * 100 : 0;
    
    // Calculate signal strength metrics
    const validSignals = relationships.filter(r => r.signalStrength).map(r => r.signalStrength);
    const averageSignalStrength = validSignals.length > 0 ? 
      validSignals.reduce((sum, signal) => sum + signal, 0) / validSignals.length : -50;
    
    // Connection quality distribution
    const qualityCounts = relationships.reduce((acc, r) => {
      acc[r.connectionQuality || 'good']++;
      return acc;
    }, { excellent: 0, good: 0, fair: 0, poor: 0 });
    
    return {
      boundaryPolygon,
      centerPoint: poleCoords,
      radiusMeters,
      areaSquareMeters,
      serviceableAddresses,
      penetrationRate,
      totalCapacity,
      usedCapacity,
      availableCapacity,
      utilizationPercent,
      maxServiceableDrops: 100, // Estimated max drops per pole
      averageSignalStrength,
      connectionQualityDistribution: qualityCounts,
      residentialCount: relationships.filter(r => r.relationshipType !== 'backbone').length,
      businessCount: relationships.filter(r => r.relationshipType === 'backbone').length
    };
  }
  
  /**
   * Calculate convex hull for boundary polygon
   */
  private calculateConvexHull(points: Array<{ lat: number; lng: number; }>): Array<{ lat: number; lng: number; }> {
    if (points.length < 3) {
      return points;
    }
    
    // Simple convex hull implementation (gift wrapping algorithm)
    const hull: Array<{ lat: number; lng: number; }> = [];
    
    // Find leftmost point
    let leftmost = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].lng < points[leftmost].lng) {
        leftmost = i;
      }
    }
    
    let current = leftmost;
    do {
      hull.push(points[current]);
      let next = (current + 1) % points.length;
      
      for (let i = 0; i < points.length; i++) {
        if (this.orientation(points[current], points[i], points[next]) === 2) {
          next = i;
        }
      }
      
      current = next;
    } while (current !== leftmost);
    
    return hull;
  }
  
  /**
   * Calculate orientation for convex hull
   */
  private orientation(p: { lat: number; lng: number; }, q: { lat: number; lng: number; }, r: { lat: number; lng: number; }): number {
    const val = (q.lng - p.lng) * (r.lat - q.lat) - (q.lat - p.lat) * (r.lng - q.lng);
    if (val === 0) return 0; // colinear
    return (val > 0) ? 1 : 2; // clockwise or counterclockwise
  }
  
  /**
   * Assess expansion potential
   */
  private assessExpansionPotential(currentDrops: number, maxDrops: number): 'low' | 'medium' | 'high' {
    const utilization = currentDrops / maxDrops;
    if (utilization > 0.8) return 'low';
    if (utilization > 0.5) return 'medium';
    return 'high';
  }
  
  /**
   * Calculate market priority
   */
  private calculateMarketPriority(metrics: any): 'low' | 'medium' | 'high' | 'strategic' {
    if (metrics.penetrationRate > 80) return 'strategic';
    if (metrics.utilizationPercent > 70) return 'high';
    if (metrics.serviceableAddresses > 100) return 'medium';
    return 'low';
  }
  
  /**
   * Update network topology
   */
  private async updateNetworkTopology(poleId: string, homeDropId: string, relationshipId: string): Promise<void> {
    // Network topology update logic would go here
    // For now, just log the update
    log.info('Network topology updated', { poleId, homeDropId, relationshipId }, 'PoleDropRelationshipService');
  }
  
  /**
   * Delete coverage area
   */
  private async deleteCoverageArea(poleId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COVERAGE_AREAS_COLLECTION, poleId);
      await deleteDoc(docRef);
      log.info('Coverage area deleted', { poleId }, 'PoleDropRelationshipService');
    } catch (error: unknown) {
      log.warn('Failed to delete coverage area', { poleId, error }, 'PoleDropRelationshipService');
    }
  }
  
  /**
   * Generate relationship ID
   */
  private generateRelationshipId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `REL-${timestamp}-${random}`;
  }
}

// Export singleton instance
export const poleDropRelationshipService = new PoleDropRelationshipService();
export type { 
  PoleDropRelationship, 
  PathSegment, 
  CoverageArea, 
  NetworkNode 
};